import { IListVirtualDelegate } from 'vs/base/browser/ui/list/list';
import { IPagedRenderer } from 'vs/base/browser/ui/list/listPaging';
import { $, append } from 'vs/base/browser/dom';
import { dispose, IDisposable } from 'vs/base/common/lifecycle';
import { IMessage, InputBox, MessageType } from 'vs/base/browser/ui/inputbox/inputBox';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IContextViewService } from 'vs/platform/contextview/browser/contextView';
import { PublicDisposable } from 'vs/hyseim/vs/base/common/lifecycle/publicDisposable';
import { localize } from 'vs/nls';
import { attachButtonStyler, attachInputBoxStyler } from 'vs/platform/theme/common/styler';
import { Action } from 'vs/base/common/actions';
import { vscodeIconClass, visualStudioIconClass } from 'vs/hyseim/vs/platform/vsicons/browser/vsIconRender';
import { Emitter } from 'vs/base/common/event';
import { IFileDialogService } from 'vs/platform/dialogs/common/dialogs';
import { URI } from 'vs/base/common/uri';
import { resolvePath } from 'vs/hyseim/vs/base/common/resolvePath';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { Button } from 'vs/base/browser/ui/button/button';
import { isValidFlashAddressString, parseMemoryAddress, validMemoryAddress } from 'vs/hyseim/vs/platform/serialPort/flasher/common/memoryAllocationCalculator';
import { IFlashSection } from 'vs/hyseim/vs/base/common/jsonSchemas/flashSectionsSchema';
import { LazyInputBox } from 'vs/hyseim/vs/base/browser/ui/lazyInputBox';
import { FLASH_SAFE_ADDRESS } from 'vs/hyseim/vs/platform/serialPort/flasher/common/chipDefine';
// import { attachMyCheckboxStyler, MyCheckBox } from 'vs/hyseim/vs/base/browser/ui/myCheckBox';

import { IHyseimWorkspaceService } from 'vs/hyseim/vs/services/workspace/common/type';

const TEMPLATE_ID = 'template.flash.manager.list.section';

const validName = /^[a-zA-Z][a-zA-Z0-9_]+$/;
const invalidName: IMessage = {
	content: localize('invalidName', 'Invalid name, must match: {0}', '' + validName),
	type: MessageType.ERROR,
};

const invalidAddress: IMessage = {
	content: localize('invalidAddress', 'Invalid address, must match: {0}', '' + validMemoryAddress),
	type: MessageType.ERROR,
};
const invalidAddressAlign: IMessage = {
	content: localize('invalidAddressAlign', 'Flash address must be divisible by {0}', 8),
	type: MessageType.ERROR,
};
const warnApplicationAddress: IMessage = {
	content: localize('noteAddressProgram', 'Note: remember to verify your program binary size'),
	type: MessageType.WARNING,
};

const emptyFile: IMessage = {
	content: localize('filenameEmpty', 'File is required'),
	type: MessageType.ERROR,
};

interface ITemplateData {
	elementDispose: IDisposable[];
	readonly toDispose: IDisposable;
	readonly nameInput: InputBox;
	// readonly swapInput: MyCheckBox;
	readonly addressInput: InputBox;
	readonly addressEndDisplay: InputBox
	readonly fileInput: InputBox;
	readonly removeButton: Button;
	readonly moveUpButton: Button;
	readonly moveDownButton: Button;
}

export class FlashSectionDelegate implements IListVirtualDelegate<IFlashSection> {
	public getHeight(element: IFlashSection): number {
		return 150;
	}

	public getTemplateId(element: IFlashSection): string {
		return TEMPLATE_ID;
	}
}

export class FlashSectionRender implements IPagedRenderer<IFlashSection, ITemplateData> {
	public readonly templateId: string = TEMPLATE_ID;

	private rootPath: string = '/';

	private readonly _onFieldChange = new Emitter<{ id: string; field: keyof IFlashSection; value: any }>();
	public readonly onFieldChange = this._onFieldChange.event;

	private readonly _onDeleteClick = new Emitter<string>();
	public readonly onDeleteClick = this._onDeleteClick.event;

	private readonly _onMove = new Emitter<{ id: string; toDown: boolean; }>(); // moveDown = true
	public readonly onMove = this._onMove.event;

	constructor(
		@IHyseimWorkspaceService hyseimWorkspaceService: IHyseimWorkspaceService,
		@IThemeService private readonly themeService: IThemeService,
		@IContextViewService private readonly contextViewService: IContextViewService,
		@IFileDialogService private readonly fileDialogService: IFileDialogService,
		@INotificationService private readonly notificationService: INotificationService,
	) {
	}

	public renderElement(element: IFlashSection, index: number, templateData: ITemplateData, height: number | undefined): void {
		// console.log('render item ', index);
		templateData.elementDispose = dispose(templateData.elementDispose);

		templateData.nameInput.value = element.name;
		if (element.autoAddress) {
			templateData.addressInput.value = '';
			templateData.addressInput.setPlaceHolder('Auto: ' + element.address);
		} else {
			templateData.addressInput.value = element.address;
			templateData.addressInput.setPlaceHolder('');
		}
		templateData.addressEndDisplay.value = `${element.addressEnd} (${element.filesize} bytes)`;
		// templateData.swapInput.checked = element.swapBytes;

		templateData.fileInput.value = element.filename;

		templateData.elementDispose.push(templateData.nameInput.onDidChange((text) => {
			this._onFieldChange.fire({ id: element.id, field: 'name', value: text });
		}));
		// templateData.elementDispose.push(templateData.swapInput.onChange((isKeyboard) => {
		// 	this._onFieldChange.fire({ id: element.id, field: 'swapBytes', value: templateData.swapInput.checked });
		// }));
		templateData.elementDispose.push(templateData.addressInput.onDidChange((text) => {
			this._onFieldChange.fire({ id: element.id, field: 'address', value: text });
		}));
		templateData.elementDispose.push(templateData.fileInput.onDidChange((text) => {
			this._onFieldChange.fire({ id: element.id, field: 'filename', value: text });
		}));
		templateData.elementDispose.push(templateData.removeButton.onDidClick(() => {
			this._onDeleteClick.fire(element.id);
		}));
		templateData.elementDispose.push(templateData.moveUpButton.onDidClick(() => {
			this._onMove.fire({ id: element.id, toDown: false });
		}));
		templateData.elementDispose.push(templateData.moveDownButton.onDidClick(() => {
			this._onMove.fire({ id: element.id, toDown: true });
		}));
	}

	public disposeElement(element: IFlashSection, index: number, templateData: ITemplateData, height: number | undefined): void {
		templateData.elementDispose = dispose(templateData.elementDispose);
	}

	public renderPlaceholder(index: number, templateData: ITemplateData): void {
	}

	public renderTemplate(container: HTMLElement): ITemplateData {
		const dis = new PublicDisposable();
		const parent = append(container, $('div.flash-section'));

		const l1 = append(parent, $('div.l1'));
		const nameInput = this.createNameBox(l1, dis);
		// const swapInput = this.createSwapCheckBox(l1, dis);

		const l2 = append(parent, $('div.l2'));
		const addressInput = this.createAddressBox(l2, dis);
		const addressEndDisplay = this.createAddressEnd(l2, dis);

		const ctl = append(l1, $('div.ctl'));
		const moveUpButton = this.createMoveButton('up', ctl, dis);
		const moveDownButton = this.createMoveButton('down', ctl, dis);
		const removeButton = this.createRemoveButton(ctl, dis);

		const l3 = append(parent, $('div.l3'));
		const fileInput = this.createFileBox(l3, dis);

		return {
			toDispose: dis,
			nameInput,
			// swapInput,
			addressInput,
			addressEndDisplay,
			fileInput,
			removeButton,
			moveUpButton,
			moveDownButton,
			elementDispose: [],
		};
	}

	public disposeTemplate(templateData: ITemplateData): void {
		templateData.toDispose.dispose();
	}

	private createNameBox(parent: HTMLElement, _disposable: PublicDisposable) {
		const nameInputLabel = append(parent, $('label.name'));
		nameInputLabel.textContent = localize('nameLabel', 'Section name: ');

		const nameInput = _disposable.registerWith(new LazyInputBox(nameInputLabel, this.contextViewService, {
			placeholder: localize('namePlaceholder', 'Reference name'),
			validationOptions: {
				validation(val: string) {
					if (validName.test(val)) {
						return null;
					}
					return invalidName;
				},
			},
		}));
		_disposable.registerWith(attachInputBoxStyler(nameInput, this.themeService));

		return nameInput;
	}

	// private createSwapCheckBox(parent: HTMLElement, _disposable: PublicDisposable) {
	// 	const input = _disposable.registerWith(new MyCheckBox(parent, {
	// 		icon: 'vscode-icon checked',
	// 		title: localize('swapLabel', 'Swap bytes'),
	// 		description: '',
	// 		isChecked: true,
	// 	}));

	// 	_disposable.registerWith(attachMyCheckboxStyler(input, this.themeService));

	// 	return input;
	// }

	private createAddressBox(parent: HTMLElement, _disposable: PublicDisposable) {
		const addressInputLabel = append(parent, $('label.address'));
		addressInputLabel.textContent = localize('addressLabel', 'Flash address: ');

		const addressInput = _disposable.registerWith(new LazyInputBox(addressInputLabel, this.contextViewService, {
			placeholder: localize('addressPlaceholder', 'Flash address'),
			validationOptions: {
				validation(val: string) {
					if (!val) { // auto address
						return null;
					}
					if (!isValidFlashAddressString(val)) {
						return invalidAddress;
					}
					const loc = parseMemoryAddress(val);
					if (loc % 8) {
						return invalidAddressAlign;
					}
					if (loc < FLASH_SAFE_ADDRESS) {
						return warnApplicationAddress;
					}
					return null;
				},
			},
			actions: [
				new Action('auto', localize('auto', 'Auto determine'), visualStudioIconClass('clear-window'), true, async () => {
					addressInput.value = '';
				}),
			],
		}));
		_disposable.registerWith(attachInputBoxStyler(addressInput, this.themeService));

		return addressInput;
	}

	private createAddressEnd(parent: HTMLElement, _disposable: PublicDisposable) {
		const label = append(parent, $('label.address'));
		label.textContent = localize('addressEndLabel', 'End: ');

		const input = _disposable.registerWith(new InputBox(label, undefined));
		input.disable();
		input.inputElement.readOnly = true;

		_disposable.registerWith(attachInputBoxStyler(input, this.themeService));

		return input;
	}

	private createFileBox(parent: HTMLElement, _disposable: PublicDisposable) {
		const label = append(parent, $('label.file'));
		label.textContent = localize('fileLabel', 'File path:');

		const input: InputBox = _disposable.registerWith(new LazyInputBox(label, this.contextViewService, {
			placeholder: localize('addressPlaceholder', 'Flash address'),
			validationOptions: {
				validation(val: string) {
					return val ? null : emptyFile;
				},
			},
			actions: [
				new Action('open', localize('open', 'Open file...'), vscodeIconClass('AddFile'), true, () => {
					return this.tryOpenFile(input);
				}),
			],
		}));
		_disposable.registerWith(attachInputBoxStyler(input, this.themeService));

		return input;
	}

	private async tryOpenFile(input: InputBox) {
		const sel = await this.fileDialogService.showOpenDialog({
			title: localize('selectTitle', 'Select file to flash'),
			defaultUri: URI.file(this.rootPath),
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
		});
		if (!sel || sel.length === 0) {
			return;
		}

		const path = resolvePath(sel[0].fsPath);
		if (!path) {
			return;
		}

		if (!path.startsWith(this.rootPath)) {
			this.notificationService.error(localize('errorOutside', 'Must select files inside project root.'));
			return;
		}

		input.value = path.replace(this.rootPath, '').replace(/^\/+/, '');
	}

	private createRemoveButton(parent: HTMLElement, _disposable: PublicDisposable) {
		const button = _disposable.registerWith(new Button(parent, {}));
		_disposable.registerWith(attachButtonStyler(button, this.themeService));
		button.element.classList.add('remove');
		append(button.element, $('span.octicon.octicon-x'));
		return button;
	}

	private createMoveButton(action: string, parent: HTMLElement, _disposable: PublicDisposable) {
		const button = _disposable.registerWith(new Button(parent, {}));
		_disposable.registerWith(attachButtonStyler(button, this.themeService));
		button.element.classList.add('move');
		button.element.classList.add(action);
		append(button.element, $('span.octicon.octicon-chevron-' + action));
		return button;
	}

	public setNewRoot(rootPath: string) {
		this.rootPath = rootPath;
	}
}

