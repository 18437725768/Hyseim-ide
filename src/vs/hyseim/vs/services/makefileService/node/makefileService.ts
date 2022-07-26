import { IBeforeBuildEvent, IMakefileService, IProjectInfo } from 'vs/hyseim/vs/services/makefileService/common/type';
import { AsyncEmitter } from 'vs/base/common/event';
import { INodeFileSystemService } from 'vs/hyseim/vs/services/fileSystem/common/type';
import { ILogService, LogLevel } from 'vs/platform/log/common/log';
import { IChannelLogService } from 'vs/hyseim/vs/services/channelLogger/common/type';
import { CMAKE_CHANNEL, CMAKE_CHANNEL_TITLE } from 'vs/hyseim/vs/workbench/cmake/common/type';
import { IHyseimWorkspaceService } from 'vs/hyseim/vs/services/workspace/common/type';
import { BeforeBuildEvent, BeforeBuildEventResult } from 'vs/hyseim/vs/services/makefileService/node/extensionHandler';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { MakefileServiceResolve } from 'vs/hyseim/vs/services/makefileService/node/resolve';
import { MakefileServiceWritter } from 'vs/hyseim/vs/services/makefileService/node/write';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { CONFIG_KEY_BUILD_VERBOSE } from 'vs/hyseim/vs/base/common/configKeys';
import { IMarkerService } from 'vs/platform/markers/common/markers';
import { URI } from 'vs/base/common/uri';
import { createSimpleErrorMarker } from 'vs/hyseim/vs/platform/marker/common/simple';
import { PathAttachedError } from 'vs/hyseim/vs/platform/marker/common/errorWithPath';
import { CMAKE_CONFIG_FILE_NAME } from 'vs/hyseim/vs/base/common/constants/wellknownFiles';
import { MapLike } from 'vs/hyseim/vs/base/common/extendMap';

const MARKER_ID = 'makefile';

function createCapIdentifier(param: string) {
	return 'INSTALLED_' + param.replace(/[^a-zA-Z0-9_$]+/g, '_').replace(/^_+/, '').toUpperCase();
}

export class MakefileService implements IMakefileService {
	public _serviceBrand: any;

	private readonly _onPrepareBuild = new AsyncEmitter<IBeforeBuildEvent>();
	public readonly onPrepareBuild = this._onPrepareBuild.event;

	private readonly _projectNameMap = new Map<string/* projectName */, string/* project absolute path */>();

	private readonly logger: ILogService;
	private isDebugMode: boolean;

	constructor(
		@IChannelLogService channelLogService: IChannelLogService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@INodeFileSystemService private readonly nodeFileSystemService: INodeFileSystemService,
		@IHyseimWorkspaceService private readonly hyseimWorkspaceService: IHyseimWorkspaceService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IMarkerService private readonly markerService: IMarkerService,
	) {
		this.logger = channelLogService.createChannel(CMAKE_CHANNEL_TITLE, CMAKE_CHANNEL);

		this.updateLevel();
		configurationService.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration(CONFIG_KEY_BUILD_VERBOSE)) {
				this.updateLevel();
			}
		});
	}

	private updateLevel() {
		this.isDebugMode = this.configurationService.getValue<boolean>(CONFIG_KEY_BUILD_VERBOSE);
		if (this.isDebugMode) {
			this.logger.setLevel(LogLevel.Debug);
		} else {
			this.logger.setLevel(LogLevel.Info);
		}
	}

	async generateMakefile(projectPath: string) {
		this.markerService.changeAll(MARKER_ID, []);
		return this._generateMakefile(projectPath).catch((e) => {
			if (e instanceof PathAttachedError) {
				this.markerService.changeOne(MARKER_ID, e.resource, [createSimpleErrorMarker(e)]);
			} else {
				this.markerService.changeOne(MARKER_ID, URI.file(projectPath + '/' + CMAKE_CONFIG_FILE_NAME), [createSimpleErrorMarker(e)]);
			}
			throw e;
		});
	}

	private async _generateMakefile(projectPath: string) {
		this.logger.info('Generate CMakeLists.txt file:');

		await this.refreshProjectMap();

		const treeResolver = this.instantiationService.createInstance(MakefileServiceResolve, projectPath, this._projectNameMap, this.logger);
		const projectList = await treeResolver.readProjectJsonList();

		// TODO: cross project compile

		await this.firePrepareBuildEvent(projectList);

		const resolvedProjectList = await treeResolver.resolveDependencies();

		const depMapper: MapLike<string> = {};
		for (const item of resolvedProjectList) {
			depMapper[item.json.name!] = item.path;
			treeResolver.pushDefinitions(createCapIdentifier(item.json.name!), '1');
		}

		for (const project of resolvedProjectList) {
			const listOutput = this.instantiationService.createInstance(
				MakefileServiceWritter,
				project,
				resolvedProjectList,
				this.isDebugMode,
				treeResolver.getDefinitions(),
				treeResolver.getLinkArguments(),
				this.logger,
			);
			await listOutput.write();
		}
	}

	public async firePrepareBuildEvent(projectList: ReadonlyArray<IProjectInfo>) {
		const sourceProjects = projectList.filter(({ shouldHaveSourceCode }) => {
			return shouldHaveSourceCode;
		});

		const result = new BeforeBuildEventResult(sourceProjects, this.nodeFileSystemService, this.logger, this.configurationService);
		await this._onPrepareBuild.fireAsync((thenables) => {
			return new BeforeBuildEvent(sourceProjects, result, thenables);
		});
		this.logger.info('Generating IDE tools hook file...');

		await result.commit();
	}

	private async refreshProjectMap() {
		this._projectNameMap.clear();
		for (const workspaceFolder of this.hyseimWorkspaceService.getAllWorkspace()) {
			const json = await this.hyseimWorkspaceService.readProjectSetting(workspaceFolder);
			if (json && json.name) {
				this._projectNameMap.set(json.name, workspaceFolder);
			}
		}
	}
}
