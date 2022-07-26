import { Disposable } from 'vs/base/common/lifecycle';
import { IUISectionWidget } from 'vs/hyseim/vs/workbench/hyseimPackageJsonEditor/common/type';
import { localize } from 'vs/nls';
import { Button } from 'vs/base/browser/ui/button/button';
import { attachButtonStyler } from 'vs/platform/theme/common/styler';
import { $ } from 'vs/base/browser/dom';
import { URI } from 'vs/base/common/uri';
import { IFileDialogService, FileFilter } from 'vs/platform/dialogs/common/dialogs';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { resolvePath } from 'vs/hyseim/vs/base/common/resolvePath';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { async as fastGlobAsync, Pattern } from 'fast-glob';
import { CMAKE_LIBRARY_FOLDER_NAME } from 'vs/hyseim/vs/base/common/jsonSchemas/cmakeConfigSchema';
import { alwaysIgnorePattern, ignorePattern } from 'vs/hyseim/vs/platform/fileDialog/common/globalIgnore';
import { Emitter } from 'vs/base/common/event';
import { IHyseimWorkspaceService } from 'vs/hyseim/vs/services/workspace/common/type';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { createSyncDescriptor, SyncDescriptor2 } from 'vs/platform/instantiation/common/descriptors';

export interface IFieldControllerClass<TS, TG> {
	new(title: string, parent: HTMLDivElement, widget: IUISectionWidget<TS, TG>): AbstractFieldControl<TG>;
}

export type IFieldControllerClassBinding<TS, TG> = SyncDescriptor2<HTMLDivElement, IUISectionWidget<TS, TG>, AbstractFieldControl<TG>>;

export enum SelectType {
	SelectSingle = 1,
	SelectMany = 0,
}

export abstract class AbstractFieldControl<T> extends Disposable {

	private readonly _onUpdate = new Emitter<any>();
	public readonly onUpdate = this._onUpdate.event;
	private projectPath: string;

	abstract createControlList(): void;

	constructor(
		protected readonly title: string,
		protected readonly parent: HTMLDivElement,
		private readonly widget: IUISectionWidget<T>,
		@IFileDialogService private readonly fileDialogService: IFileDialogService,
		@IHyseimWorkspaceService private readonly hyseimWorkspaceService: IHyseimWorkspaceService,
		@IThemeService private readonly themeService: IThemeService,
		@IConfigurationService protected readonly configurationService: IConfigurationService,
		@ICommandService protected readonly commandService: ICommandService,
	) {
		super();
		this.createControlList();
	}

	public setProjectPath(projectPath: string) {
		this.projectPath = projectPath;
	}

	protected createCommonButton(iconClass: string, label: string, title: string) {
		const btn = this._register(new Button(this.parent));
		this._register(attachButtonStyler(btn, this.themeService));

		const icon = $('span.icon');
		icon.classList.add(...iconClass.split(' '));

		btn.label = label;
		btn.element.title = title;

		btn.element.prepend(icon);

		return btn;
	}

	protected selectFileSystem(type: 'folder', select: SelectType): Promise<string[]>;
	protected selectFileSystem(type: 'file', select: SelectType, filters?: FileFilter[]): Promise<string[]>;
	protected async selectFileSystem(type: 'file' | 'folder', select: SelectType, filters?: FileFilter[]): Promise<string[]> {
		const workspaceRoot = this.projectPath || this.hyseimWorkspaceService.requireCurrentWorkspace();
		const ret = await this.fileDialogService.showOpenDialog({
			title: localize('select', 'select ') + this.title,
			defaultUri: URI.file(workspaceRoot),
			openLabel: localize('add', 'Add'),
			canSelectFiles: type === 'file',
			canSelectFolders: type === 'folder',
			canSelectMany: select === SelectType.SelectMany,
			filters,
		});
		if (!ret) {
			return [];
		}

		const result: string[] = [];
		for (const file of ret) {
			const fsp = resolvePath(file.fsPath);
			if (!fsp.startsWith(workspaceRoot)) {
				continue;
			}

			const relative = fsp.replace(workspaceRoot, '').replace(/^\/+/, '');

			if (
				relative.startsWith('build/') || relative === 'build' ||
				relative.startsWith('config/') || relative === 'config' ||
				relative.startsWith(CMAKE_LIBRARY_FOLDER_NAME + '/') || relative === CMAKE_LIBRARY_FOLDER_NAME ||
				/(^|\/)\./.test(relative) // is hidden file (or in hidden folder)
			) {
				continue;
			}
			result.push(relative);
		}

		return result;
	}

	protected mergeArray<T extends any[]>(list: T) {
		if (list.length === 0) {
			return;
		}
		const arr: T = this.widget.get() as any;
		list.forEach((item: any) => {
			if (!arr.includes(item)) {
				arr.push(item);
			}
		});
		this.updateSimple(arr);
	}

	protected globPath(sourceDir: string, recursive: boolean, types: string[]): Promise<string[]> {
		let exclude: Pattern[];
		if (sourceDir === '') {
			exclude = ignorePattern;
		} else {
			exclude = alwaysIgnorePattern;
		}
		const glob = `${sourceDir}${recursive ? '/**' : ''}/*.{${types.join(',')}}`;
		// console.log('glob files: "%s" in %s', glob, sourceDir);
		return fastGlobAsync(glob, {
			cwd: this.projectPath || this.hyseimWorkspaceService.requireCurrentWorkspace(),
			stats: false,
			onlyFiles: true,
			followSymlinkedDirectories: false,
			absolute: false,
			brace: true,
			ignore: exclude,
		});
	}

	protected updateSimple(value: any): void {
		this.widget.set(value);
		this._onUpdate.fire(value);
	}

	static descriptor<TS, TG>(title: string): IFieldControllerClassBinding<TS, TG> {
		return createFieldControlDescriptor(this as any, title);
	}
}

export function createFieldControlDescriptor<TS, TG>(ctor: IFieldControllerClass<TS, TG>, title: string) {
	return createSyncDescriptor(ctor, title);
}
