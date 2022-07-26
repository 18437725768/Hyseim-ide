import { IFlashManagerConfigJson, IFlashSection } from 'vs/hyseim/vs/base/common/jsonSchemas/flashSectionsSchema';
import { fileExists, stat } from 'vs/base/node/pfs';
import { localize } from 'vs/nls';
import { MemoryAllocationCalculator, parseMemoryAddress, stringifyMemoryAddress } from 'vs/hyseim/vs/platform/serialPort/flasher/common/memoryAllocationCalculator';
import { resolvePath } from 'vs/hyseim/vs/base/common/resolvePath';
import { SimpleJsonEditorModel } from 'vs/hyseim/vs/workbench/jsonGUIEditor/service/node/simpleJsonEditorModel';
import { DeepReadonly } from 'vs/hyseim/vs/base/common/type/deepReadonly';
import { objectKeys } from 'vs/hyseim/vs/base/common/type/objectKeys';
// import { FLASH_SAFE_ADDRESS } from 'vs/hyseim/vs/platform/serialPort/flasher/common/chipDefine';

interface ISection {
	varName: string;
	filename: string;
	startHex: string;
	endHex: string;
	size: number;
	swapBytes: boolean;
}

interface IReturnSection extends Pick<ISection, Exclude<keyof ISection, 'filename'>> {
	filepath: string
}

export class FlashManagerEditorModel extends SimpleJsonEditorModel<IFlashManagerConfigJson> {
	public async _load() {
		if (!this.jsonData!.downloadSections) {
			this.update('downloadSections', [], true);
		}
		if (!this.jsonData!.baseAddress) {
			this.update('baseAddress', '0', true);
		}

		console.log('Flash Manager Model Load: %O', this.jsonData);
	}

	public async createSections(memory?: MemoryAllocationCalculator) {
		const ret: IReturnSection[] = [];

		if (!memory) {
			memory = new MemoryAllocationCalculator(parseMemoryAddress(this.jsonData!.baseAddress), Infinity);
		}
		for (const item of this.jsonData!.downloadSections) {
			const fullPath = resolvePath(this.resource.fsPath, '../..', item.filename);
			if (!await fileExists(fullPath)) {
				throw new Error(localize('fileNotFound', 'File not exists: "{0}"', fullPath));
			}

			const fileSize = (await stat(fullPath)).size;

			let addressEnd: number;
			if (item.autoAddress) {
				const ret = memory.allocAuto(fileSize);
				this.flushItem(item, { address: stringifyMemoryAddress(ret.from) });
				addressEnd = ret.to;
			} else {
				const ret = memory.allocManual(fileSize, parseMemoryAddress(item.address));
				addressEnd = ret.to;
			}

			ret.push({
				varName: item.name,
				filepath: fullPath,
				startHex: item.address,
				endHex: stringifyMemoryAddress(addressEnd),
				size: fileSize,
				swapBytes: item.swapBytes || false,
			});
		}

		return ret;
	}

	public setTotal(totalSize: number, latestEnding: string) {
		this.update('totalSize', totalSize, true);
		this.update('endAddress', latestEnding, true);
	}

	public flushItem(item: DeepReadonly<IFlashSection>, update: Partial<IFlashSection>) {
		let someUpdated = '';
		const index = this.jsonData!.downloadSections.findIndex(ele => ele.id === item.id);
		if (index === -1) {
			debugger;
			return '';
		}
		for (const key of objectKeys(update)) {
			if (this.update(['downloadSections', index, key], update[key], true)) {
				someUpdated += key + ',';
			}
		}
		return someUpdated;
	}

	public swap(index1: number, index2: number) {
		const item1: IFlashSection = Object.assign({}, this.jsonData!.downloadSections[index1]);
		const item2: IFlashSection = Object.assign({}, this.jsonData!.downloadSections[index2]);

		const allKeys: (keyof IFlashSection)[] = objectKeys({ ...item1, ...item2 });
		for (const key of allKeys) {
			if (item2[key] === item1[key]) {
				continue;
			}

			this.update(['downloadSections', index2, key], item1[key]);
			this.update(['downloadSections', index1, key], item2[key]);
		}
	}

	public remove(index: number) {
		this.update(['downloadSections', index], undefined);
	}

	public newItem(newItem: IFlashSection) {
		this.update(['downloadSections', -1], newItem);
	}
}
