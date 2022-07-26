import 'vs/css!vs/hyseim/vs/workbench/packageManager/browser/viewletPanels/side-bar';
import { IViewletPanelOptions, ViewletPanel } from 'vs/workbench/browser/parts/views/panelViewlet';
import { WorkbenchList } from 'vs/platform/list/browser/listService';
import { localize } from 'vs/nls';
import { IListVirtualDelegate } from 'vs/base/browser/ui/list/list';
import { IPagedRenderer } from 'vs/base/browser/ui/list/listPaging';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IViewletViewOptions } from 'vs/workbench/browser/parts/views/viewsViewlet';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { $, addDisposableListener, append } from 'vs/base/browser/dom';
import { IPackageRegistryService } from 'vs/hyseim/vs/workbench/packageManager/common/type';
import { INodeFileSystemService } from 'vs/hyseim/vs/services/fileSystem/common/type';
import { dispose, IDisposable } from 'vs/base/common/lifecycle';
import { renderOcticons } from 'vs/base/browser/ui/octiconLabel/octiconLabel';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { CancellationTokenSource } from 'vs/base/common/cancellation';
import { Emitter } from 'vs/base/common/event';
import { isUndefinedOrNull } from 'vs/base/common/types';
import { IHyseimWorkspaceService } from 'vs/hyseim/vs/services/workspace/common/type';
import { packageJsonObject } from 'vs/hyseim/vs/base/common/cmakeTypeHelper';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';

const templateId = 'local-package-tree';

class Delegate implements IListVirtualDelegate<IConfigSection> {
	getHeight() { return 32; }

	getTemplateId() { return templateId; }
}

interface IConfigSection {
	key: string;
	value: string;
	type: string;
}

interface ITemplateData {
	name: HTMLSpanElement;
	value: HTMLSpanElement;
	button: HTMLAnchorElement;
	event: IDisposable[];
}

export class Renderer implements IPagedRenderer<IConfigSection, ITemplateData> {
	templateId = templateId;

	private readonly _onValueDidChange = new Emitter<IConfigSection>();
	public readonly onValueDidChange = this._onValueDidChange.event;

	constructor(
		@IQuickInputService private readonly quickInputService: IQuickInputService,
	) {
	}

	public renderPlaceholder(index: number, templateData: ITemplateData): void {
	}

	public renderTemplate(container: HTMLElement): ITemplateData {
		const root = append(container, $('.item'));

		const name = append(root, $('span.name'));
		append(root, $('span.sp')).innerText = '|';
		const value = append(root, $('span.value'));
		const button = append(root, $('a.edit')) as HTMLAnchorElement;
		button.innerHTML = renderOcticons('$(pencil)');

		return {
			name,
			value,
			button,
			event: [],
		};
	}

	public renderElement(element: IConfigSection, index: number, templateData: ITemplateData): void {
		templateData.name.innerText = element.key;
		templateData.value.innerText = element.value;
		const source = new CancellationTokenSource();
		templateData.event.push(source);
		templateData.event.push(addDisposableListener(templateData.button, 'click', () => {
			this.quickInputService.input({
				value: element.value,
				prompt: element.key,
				placeHolder: localize('leave.empty.to.use.default', 'Leave empty to use the default value'),
				validateInput: element.type === 'number' ? validateNumber : undefined,
			}, source.token).then((input) => {
				if (isUndefinedOrNull(input)) {
					return;
				}

				templateData.value.innerText = element.value = input;

				this._onValueDidChange.fire(element);
			});
		}));
	}

	public disposeElement(element: IConfigSection, index: number, templateData: ITemplateData): void {
		dispose(templateData.event);
		templateData.event.length = 0;
	}

	public disposeTemplate(templateData: ITemplateData): void {
		dispose(templateData.event);
		templateData.event.length = 0;
	}
}

function validateNumber(s: string) {
	return Promise.resolve(isNaN(parseFloat(s)) ? 'number required' : '');
}

export class PackageConfigView extends ViewletPanel {
	private list: WorkbenchList<IConfigSection>;
	private packageList: HTMLElement;
	private _visible: boolean = false;

	constructor(
		options: IViewletViewOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IPackageRegistryService private readonly packageRegistryService: IPackageRegistryService,
		@INodeFileSystemService private readonly nodeFileSystemService: INodeFileSystemService,
		@IHyseimWorkspaceService private readonly hyseimWorkspaceService: IHyseimWorkspaceService,
	) {
		super({ ...(options as IViewletPanelOptions), ariaHeaderLabel: options.title }, keybindingService, contextMenuService, configurationService, contextKeyService);

		this._register(this.packageRegistryService.onLocalPackageChange(e => this.show()));
		this._register(this.hyseimWorkspaceService.onCurrentWorkingDirectoryChange(e => this.show()));
	}

	protected renderBody(container: HTMLElement): void {
		this.packageList = append(container, $('.package-config-list'));

		const delegate = new Delegate();
		const renderer = this.instantiationService.createInstance(Renderer);
		this._register(renderer.onValueDidChange(item => this.writeChange(item)));

		this.list = this.instantiationService.createInstance(WorkbenchList, 'package-config', this.packageList, delegate, [renderer], {
			ariaLabel: localize('dependency tree', 'Dependency Tree'),
			multipleSelectionSupport: false,
		}) as WorkbenchList<IConfigSection>;
		this._register(this.list);
	}

	protected layoutBody(size: number): void {
		this.packageList.style.height = size + 'px';
		this.list.layout(size);
	}

	public setVisible(visible: boolean): void {
		super.setVisible(visible);
		if (this._visible !== visible) {
			this._visible = visible;
		}
		this.show();
	}

	async show(): Promise<void> {
		if (!this._visible) {
			return;
		}
		this.list.splice(0, this.list.length);

		const root = this.hyseimWorkspaceService.getCurrentWorkspace();
		if (!root) {
			return;
		}
		const json = await this.hyseimWorkspaceService.readProjectSetting(root);
		if (!json) {
			return;
		}

		const packages = await this.packageRegistryService.listLocal(root);
		const localObject: any = {};

		const defines = Object.assign(localObject, ...packages.map(e => e.definitions), packageJsonObject(json, 'definitions'));

		const kv = Object.entries(defines).map(([k, v]) => {
			return <IConfigSection>{
				key: k,
				value: '' + v,
				type: typeof v,
			};
		});

		this.list.splice(0, this.list.length, kv);
	}

	private async writeChange(item: IConfigSection) {
		const project = this.hyseimWorkspaceService.getProjectSetting(this.hyseimWorkspaceService.requireCurrentWorkspace());

		const val = item.type === 'number' ? parseFloat(item.value) : item.value;

		await this.nodeFileSystemService.editJsonFile(project, ['definitions', item.key], val);
	}
}
