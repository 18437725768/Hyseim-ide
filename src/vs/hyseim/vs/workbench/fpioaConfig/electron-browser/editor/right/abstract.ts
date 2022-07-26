import { $, addClasses, append } from 'vs/base/browser/dom';
import { Disposable } from 'vs/base/common/lifecycle';
import { IChipPackagingCalculated, IPin2DNumber } from 'vs/hyseim/vs/workbench/fpioaConfig/common/packagingTypes';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { attachStyler, IColorMapping } from 'vs/platform/theme/common/styler';
import { stringifyPin } from 'vs/hyseim/vs/workbench/fpioaConfig/common/builder';
import { CellRender } from 'vs/hyseim/vs/workbench/fpioaConfig/electron-browser/editor/right/cell';
import { ColorMap, ContextMenuData } from 'vs/hyseim/vs/workbench/fpioaConfig/common/types';
import { Emitter } from 'vs/base/common/event';
import { IFPIOAFuncPinMap } from 'vs/hyseim/vs/base/common/jsonSchemas/deviceManagerSchema';

export interface ChipTableCreator {
	new(chip: IChipPackagingCalculated): AbstractTableRender<any>;
}

export abstract class AbstractTableRender<T extends CellRender> extends Disposable {
	protected $table: HTMLTableElement;

	protected chip: IChipPackagingCalculated;
	public readonly chipName: string;

	private _cellList: Map<IPin2DNumber, T>;

	private readonly _onContextMenu = new Emitter<ContextMenuData>();
	public readonly onContextMenu = this._onContextMenu.event;

	protected abstract readonly styleMap: IColorMapping;

	// only for overwrite

	protected abstract createTableTemplate(): IterableIterator<T>;

	protected abstract frameStyle(colors: ColorMap): void;

	constructor(chip: IChipPackagingCalculated, protected themeService: IThemeService) {
		super();

		this.chip = chip;
		this.chipName = chip.name;

		this.$table = $('table');

		addClasses(this.$table, chip.name, 'chip-table');
		this.$table.style.tableLayout = 'fixed';
	}

	style(colors: ColorMap) {
		this._cellList.forEach(item => item.style(colors as any));
		this.frameStyle(colors);
	}

	layout(size: number) {
		this.$table.style.height = size + 'px';
		this.$table.style.width = size + 'px';
	}

	setFuncMap(currentFuncMap: Readonly<IFPIOAFuncPinMap>) {
		const pinFuncMap: IFPIOAFuncPinMap = {};
		Object.keys(currentFuncMap).forEach((funId) => {
			const pin = currentFuncMap[funId];
			pinFuncMap[pin] = funId;
		});
		this._cellList.forEach((cell) => {
			if (pinFuncMap[cell.getPinLocation()]) {
				cell.setFunction(pinFuncMap[cell.getPinLocation()]);
			} else {
				cell.setFunction(pinFuncMap[cell.getPinLocation()]);
			}
		});
	}

	render(element: HTMLElement) {
		if (this._cellList) {
			console.error('re-render without dispose');
			this.dispose();
		}
		this._cellList = new Map<IPin2DNumber, T>();
		const itr: Iterator<T> = this.createTableTemplate();
		for (let v = itr.next(); !v.done; v = itr.next()) {
			const cell = v.value;

			const loc = stringifyPin(this.chip.ROW, cell.pin);
			cell.setPinInformation(loc, this.chip.geometry.IOPinPlacement[loc]);

			this._cellList.set(cell.pin, cell);
			this._register(cell.onContextMenu((event) => this._onContextMenu.fire(event)));
		}

		this.show(true);
		append(element, this.$table);

		this._register(attachStyler(this.themeService, this.styleMap, this));
	}

	show(show: boolean = true) {
		if (show) {
			this.$table.style.display = 'table';
		} else {
			this.$table.style.display = 'none';
		}
	}

	dispose() {
		if (this.$table.parentElement) {
			this.$table.parentElement.removeChild(this.$table);
		}
		this.show(false);
		super.dispose();

		if (this._cellList) {
			this._cellList.forEach(e => e.dispose());
			delete this._cellList;
		}
	}
}

export function grid(num: number, type: 'col' | 'row') {
	return type + '-' + (num % 2 === 0 ? 'even' : 'odd');
}
