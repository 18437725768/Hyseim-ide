import { IHyseimWorkspaceService } from 'vs/hyseim/vs/services/workspace/common/type';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IWorkspaceContextService, IWorkspaceFolder, IWorkspaceFolderData, WorkbenchState } from 'vs/platform/workspace/common/workspace';
import { resolvePath } from 'vs/hyseim/vs/base/common/resolvePath';
import { CMAKE_CONFIG_FILE_NAME } from 'vs/hyseim/vs/base/common/constants/wellknownFiles';
import { Emitter } from 'vs/base/common/event';
import { LogLevel } from 'vs/platform/log/common/log';
import { ERROR_REQUIRE_FOLDER } from 'vs/hyseim/vs/base/common/messages';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { CONTEXT_KENDRYTE_MULTIPLE_PROJECT, CONTEXT_KENDRYTE_NOT_EMPTY } from 'vs/hyseim/vs/services/workspace/common/contextKey';
import { exists } from 'vs/base/node/pfs';
import { INodeFileSystemService } from 'vs/hyseim/vs/services/fileSystem/common/type';
import { EXTEND_JSON_MARKER_ID } from 'vs/hyseim/vs/base/common/jsonComments';
import { URI } from 'vs/base/common/uri';
import { createSimpleJsonWarningMarkers } from 'vs/hyseim/vs/platform/marker/common/simple';
import { IMarkerService } from 'vs/platform/markers/common/markers';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IChannelLogger, IChannelLogService } from 'vs/hyseim/vs/services/channelLogger/common/type';
import IContextKey = monaco.editor.IContextKey;

class HyseimWorkspaceService implements IHyseimWorkspaceService {
	public _serviceBrand: any;

	private readonly _onCurrentWorkingDirectoryChange = new Emitter<void | string>();
	public readonly onCurrentWorkingDirectoryChange = this._onCurrentWorkingDirectoryChange.event;

	private _currentWorkspace?: IWorkspaceFolderData;
	private _currentWorkspacePath?: string;
	private _allWorkspacePaths: string[];
	private isNotEmpty: IContextKey<boolean>;
	private isMultiple: IContextKey<boolean>;
	private logger: IChannelLogger;

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@IChannelLogService channelLogService: IChannelLogService,
		@IWorkspaceContextService public readonly workspaceContextService: IWorkspaceContextService,
		@INodeFileSystemService private readonly nodeFileSystemService: INodeFileSystemService,
		@IMarkerService private readonly markerService: IMarkerService,
		@IStorageService private readonly storageService: IStorageService,
	) {
		this.logger = channelLogService.createChannel('workspace');
		this.logger.setLevel(LogLevel.Debug);

		const my = (item: IWorkspaceFolder) => {
			return item.uri.fsPath === this._currentWorkspacePath;
		};

		this.isNotEmpty = CONTEXT_KENDRYTE_NOT_EMPTY.bindTo(contextKeyService);
		this.isMultiple = CONTEXT_KENDRYTE_MULTIPLE_PROJECT.bindTo(contextKeyService);

		workspaceContextService.onDidChangeWorkspaceFolders((event) => {
			this.logger.debug('Change status: %O', event);
			this.flushStatus();

			if (event.removed.findIndex(my) !== -1) {
				if (this.isEmpty()) {
					this.changeWorkspaceByIndex(-1);
				} else {
					this.changeWorkspaceByIndex(0);
				}
			} else if (event.changed.findIndex(my) !== -1) {
				const newOne = workspaceContextService.getWorkspace().folders.find(my);
				console.log(newOne, newOne === this._currentWorkspace);
				debugger;
			} else if (this.isEmpty()) {
				this.changeWorkspaceByIndex(-1);
			} else if (event.added.length === this._allWorkspacePaths.length) {
				this.changeWorkspaceByIndex(0);
			}
		});

		this.flushStatus();
		if (!this.isEmpty()) {
			this.trySwitchLastProject();
		}
	}

	isEmpty() {
		return this.workspaceContextService.getWorkbenchState() === WorkbenchState.EMPTY || this.isEmptyWorkspace();
	}

	isEmptyWorkspace() {
		return this.workspaceContextService.getWorkbenchState() === WorkbenchState.WORKSPACE &&
		       this.workspaceContextService.getWorkspace().folders.length === 0;
	}

	private trySwitchLastProject() {
		const knownWorkspace = this.storageService.get('lastOpenWorkspace', StorageScope.WORKSPACE, '');
		this.logger.debug('Last known workspace: %s', knownWorkspace);
		if (knownWorkspace) {
			try {
				this.changeWorkspaceByName(knownWorkspace);
				return;
			} catch (e) {
				this.logger.debug('  - ignore this error.');
			}
		}
		this.changeWorkspaceByIndex(0);
	}

	private rememberSelectedProject() {
		this.logger.debug('rememberSelectedProject()');
		if (this._currentWorkspace) {
			this.logger.debug('  remember: %s', this._currentWorkspace.name);
			this.storageService.store('lastOpenWorkspace', this._currentWorkspace.name, StorageScope.WORKSPACE);
		} else {
			this.logger.debug('  forgot.');
			this.storageService.remove('lastOpenWorkspace', StorageScope.WORKSPACE);
		}
	}

	private flushStatus() {
		this.logger.debug('flushStatus()');
		this._allWorkspacePaths = this.workspaceContextService.getWorkspace().folders.map((item) => {
			return resolvePath(item.uri.fsPath);
		});

		this.logger.debug('  folder count =', this._allWorkspacePaths.length);
		this.isNotEmpty.set(this._allWorkspacePaths.length !== 0);
		this.isMultiple.set(this._allWorkspacePaths.length > 1);
	}

	requireCurrentWorkspace() {
		if (this._currentWorkspacePath) {
			return this._currentWorkspacePath;
		} else {
			throw new Error(ERROR_REQUIRE_FOLDER);
		}
	}

	requireCurrentWorkspaceFile(...s: string[]) {
		if (this._currentWorkspacePath) {
			return resolvePath(this._currentWorkspacePath, ...s);
		} else {
			throw new Error(ERROR_REQUIRE_FOLDER);
		}
	}

	getCurrentWorkspace() {
		if (this._currentWorkspacePath) {
			return this._currentWorkspacePath;
		} else {
			return '';
		}
	}

	getCurrentFolderName() {
		if (this._currentWorkspace) {
			return this._currentWorkspace.name;
		} else {
			return '';
		}
	}

	async getCurrentProjectName() {
		if (this._currentWorkspacePath) {
			const json = await this.readProjectSetting(this._currentWorkspacePath);
			if (json) {
				return json.name;
			}
		}
		return undefined;
	}

	getCurrentWorkspaceFile(...s: string[]) {
		if (this._currentWorkspacePath) {
			return resolvePath(this._currentWorkspacePath, ...s);
		} else {
			return '';
		}
	}

	getAllWorkspace() {
		return this._allWorkspacePaths;
	}

	getAllWorkspaceFile(...s: string[]) {
		return this._allWorkspacePaths.map((f) => {
			return resolvePath(f, ...s);
		});
	}

	changeWorkspaceByName(name: string) {
		this.logger.debug('changeWorkspaceByName(%s)', name);
		const folder = this.workspaceContextService.getWorkspace().folders.find((item) => {
			return item.name === name;
		});
		if (!folder) {
			this.logger.error('  error: no such folder.');
			throw new Error(`Workspace name ${name} did not opened`);
		}
		this._changeWorkspace(folder);
	}

	changeWorkspaceByPath(path: string) {
		this.logger.debug('changeWorkspaceByPath(%s)', path);
		path = resolvePath(path);
		const index = this._allWorkspacePaths.findIndex((wsPath) => {
			return wsPath === path;
		});
		const folder = this.workspaceContextService.getWorkspace().folders[index];
		if (!folder) {
			this.logger.error('  error: no such folder.');
			throw new Error(`Workspace path ${path} did not opened`);
		}
		this._changeWorkspace(folder);
	}

	changeWorkspaceByIndex(index: number) {
		this.logger.debug('changeWorkspaceByIndex(%s)', index);
		if (index === -1) {
			this._closeWorkspace();
			return;
		}
		const sel = this.workspaceContextService.getWorkspace().folders[index];
		if (!sel) {
			this.logger.error('  error: no such folder.');
			throw new Error(`Workspace index ${index} does not exists`);
		}
		this._changeWorkspace(sel);
	}

	private _closeWorkspace() {
		this.logger.info('_closeWorkspace()');
		const actualChanged = !!this._currentWorkspace;
		this.logger.info('  actualChanged =', actualChanged);
		delete this._currentWorkspace;
		delete this._currentWorkspacePath;

		if (actualChanged) {
			this._onCurrentWorkingDirectoryChange.fire();
		}
	}

	private _changeWorkspace(ws: IWorkspaceFolderData) {
		this.logger.info('_changeWorkspace()');
		const newPath = resolvePath(ws.uri.fsPath);
		this.logger.info('  newPath =', newPath);
		const actualChanged = this._currentWorkspacePath !== newPath;
		this.logger.info('  actualChanged =', actualChanged);

		this.logger.info('Switch workspace: ' + newPath);

		this._currentWorkspace = ws;
		this._currentWorkspacePath = newPath;

		this.rememberSelectedProject();

		if (actualChanged) {
			this._onCurrentWorkingDirectoryChange.fire(newPath);
		}
	}

	getProjectSetting(root: string) {
		return resolvePath(root, CMAKE_CONFIG_FILE_NAME);
	}

	isHyseimProject(root: string): Promise<boolean> {
		return exists(this.getProjectSetting(root));
	}

	async readProjectSetting(root: string) {
		const file = this.getProjectSetting(root);

		if (!await exists(file)) {
			return null;
		}

		this.logger.info('Load project file: %s', file);
		const { json, warnings } = await this.nodeFileSystemService.readJsonFile(file);

		this.markerService.changeOne(EXTEND_JSON_MARKER_ID, URI.file(file), createSimpleJsonWarningMarkers(warnings));

		return json;
	}

}

registerSingleton(IHyseimWorkspaceService, HyseimWorkspaceService);
