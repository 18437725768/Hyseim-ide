import { ILifecycleService, LifecyclePhase } from 'vs/platform/lifecycle/common/lifecycle';
import { localize } from 'vs/nls';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { OpenDevToolsAction } from 'vs/hyseim/vs/workbench/actionRegistry/common/openDevToolsAction';
import { IElectronService } from 'vs/platform/electron/node/electron';
import { IHyseimClientService } from 'vs/hyseim/vs/services/ipc/common/ipcType';
import { ILogService } from 'vs/platform/log/common/log';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ICMakeService } from 'vs/hyseim/vs/workbench/cmake/common/type';
import { MaixBuildSystemPrepare } from 'vs/hyseim/vs/workbench/cmake/electron-browser/maixBuildSystemService';
import { INodePathService } from 'vs/hyseim/vs/services/path/common/type';
import { INodeFileSystemService } from 'vs/hyseim/vs/services/fileSystem/common/type';
import { isMacintosh, isWindows } from 'vs/base/common/platform';
import { unClosableNotify } from 'vs/hyseim/vs/workbench/progress/common/unClosableNotify';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IRelaunchService } from 'vs/hyseim/vs/platform/vscode/common/relaunchService';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { IFpioaService } from 'vs/hyseim/vs/workbench/fpioaConfig/common/types';
import { ipcRenderer } from 'electron';

class HyseimContribution implements IWorkbenchContribution {

	constructor(
		@IEnvironmentService environmentService: IEnvironmentService,
		@IFpioaService fpioaService: IFpioaService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ILogService private readonly logService: ILogService,
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
		@INotificationService private readonly notificationService: INotificationService,
		@IElectronService private readonly electronService: IElectronService,
		@IHyseimClientService private readonly client: IHyseimClientService,
		@INodePathService private readonly nodePathService: INodePathService,
		@INodeFileSystemService private readonly nodeFileSystemService: INodeFileSystemService,
		@IRelaunchService private readonly relaunchService: IRelaunchService,
	) {


		if (!process.env['VSCODE_PORTABLE']) { // for safe

			debugger;
			throw new Error('----- ERROR -----\n bootstrap.js is not ok. VSCODE_PORTABLE not set.\n----- ERROR -----');
		}

		this.run();
	}

	async extensions() {
		this.logService.info('{update} Install Extensions');
		const extensionChanged = await this.instantiationService.invokeFunction(MaixBuildSystemPrepare);
		if (extensionChanged) {
			this.logService.info('{update} will relaunch now');
			this.electronService.relaunch({});
			return;
		}
		this.logService.info('{update} Install Extensions {complete}');
	}

	activateCmake() {
		this.instantiationService.invokeFunction((accessor) => accessor.get(ICMakeService));
	}

	async _run() {
		await this.lifecycleService.when(LifecyclePhase.Ready);

		const hasPermInPackages = await this.nodeFileSystemService.tryWriteInFolder(this.nodePathService.getPackagesPath('test-perm'));
		const installingRoot = this.nodePathService.getSelfControllingRoot();
		if (!hasPermInPackages) {
			let platformMessage = '';
			if (isMacintosh) {
				if (/\/Downloads\//.test(installingRoot)) {
					platformMessage = 'please move IDE out from Downloads folder';
				} else {
					platformMessage = '"chown" is needed';
				}
			} else if (isWindows) {
				if (/c:\//i.test(installingRoot) && !/c:\/users\//i.test(installingRoot)) {
					platformMessage = 'do not place IDE in C:';
				} else {
					platformMessage = 'check your anti-virus program and "Safe" tab.';
				}
			} else {
				platformMessage = '"chown" is needed';
			}

			unClosableNotify(this.notificationService, {
				severity: Severity.Error,
				message: 'Hyseim IDE cannot write data on disk, ' + platformMessage,
				source: this.nodePathService.getPackagesPath(),
			});
			return;
		}

		await this.lifecycleService.when(LifecyclePhase.Restored);
		if (await this.client.isMeFirst()) {
			this.logService.info('{update} I\'m first window in this session, start check extension update.');
			await this.extensions();
		} else {
			this.logService.info('{update} not first window, skip extension update progress');
		}

		this.logService.info('{update} {COMPLETE}');
		await this.lifecycleService.when(LifecyclePhase.Eventually);
		this.logService.info('{update} active cmake');
		this.activateCmake();
		this.logService.info('{update} active complete');

		console.log('workbench load complete');
		ipcRenderer.send('hyseim-health-window-ready');
	}

	run() {
		this.lifecycleService.when(LifecyclePhase.Eventually).then(() => {
			this.logService.info('{update} connecting to updater...');
			this.relaunchService.connect().then(() => {
				this.logService.info('{update} connected to updater');
			}, (e) => {
				this.logService.error('{update} failed to connect updater: ' + e.message);
			});
		});

		this._run().catch((e) => {
			console.error(e);
			this.notificationService.notify({
				severity: Severity.Error,
				message: localize('bootstrap.hyseim.fatal', 'Something goes wrong when starting Hyseim IDE: {0}', e.message),
				actions: {
					primary: [
						new OpenDevToolsAction(OpenDevToolsAction.ID, OpenDevToolsAction.LABEL, this.electronService),
					],
				},
			});
		});
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(HyseimContribution, LifecyclePhase.Starting);
