import { Action } from 'vs/base/common/actions';
import {
	ACTION_ID_JTAG_INSTALL_DRIVER,
	ACTION_ID_JTAG_INSTALL_DRIVER_O,
	ACTION_LABEL_JTAG_INSTALL_DRIVER,
	ACTION_LABEL_JTAG_INSTALL_DRIVER_O,
} from 'vs/hyseim/vs/base/common/menu/openocd';
import { isWindows } from 'vs/base/common/platform';
import { URL_INSTALL_JLINK_DRIVER } from 'vs/hyseim/vs/base/common/urlList';
import { IElectronService } from 'vs/platform/electron/node/electron';
import { INodePathService } from 'vs/hyseim/vs/services/path/common/type';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { localize } from 'vs/nls';
import { OpenUrlAction } from 'vs/hyseim/vs/platform/open/common/openUrlAction';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { dirname, normalize } from 'vs/base/common/path';
import { writeFile } from 'vs/base/node/pfs';
import { osTempDir } from 'vs/hyseim/vs/base/common/resolvePath';
import { dispose, IDisposable } from 'vs/base/common/lifecycle';
import { IChannelLogger, IChannelLogService } from 'vs/hyseim/vs/services/channelLogger/common/type';
import { OPENOCD_CHANNEL, OPENOCD_CHANNEL_TITLE } from 'vs/hyseim/vs/services/openocd/common/channel';
import { ISudoService } from 'vs/hyseim/vs/platform/sudo/node/sudoService';

export class InstallJTagDriverAction extends Action {
	public static readonly ID = ACTION_ID_JTAG_INSTALL_DRIVER;
	public static readonly LABEL = ACTION_LABEL_JTAG_INSTALL_DRIVER;

	private readonly logger: IChannelLogger;
	private toDispose: IDisposable[] = [];

	constructor(
		id: string, label: string,
		@IElectronService private readonly electronService: IElectronService,
		@INodePathService private readonly nodePathService: INodePathService,
		@IChannelLogService private readonly channelLogService: IChannelLogService,
		@INotificationService private readonly notificationService: INotificationService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IStorageService private readonly storageService: IStorageService,
		@ISudoService private readonly sudoService: ISudoService,
	) {
		super(id, label);
		this.logger = channelLogService.createChannel(OPENOCD_CHANNEL_TITLE, OPENOCD_CHANNEL, true);
	}

	async run() {
		if (isWindows) {
			this.channelLogService.show(OPENOCD_CHANNEL);
			const zadigExe = normalize(this.nodePathService.getPackagesPath('jlink/zadig-2.4.exe'));
			const tempScriptFile = osTempDir('execzadig.bat');
			this.logger.info(`zadig: ${zadigExe}`);

			await writeFile(tempScriptFile, `chcp 65001
start "zadig" /D ${JSON.stringify(dirname(zadigExe))} /WAIT ${JSON.stringify(zadigExe)}
`, { encoding: { charset: 'utf8', addBOM: false } });
			const command = `cmd.exe /C "${JSON.stringify(tempScriptFile)}"`;

			this.logger.info(`spawn: ${command}`);

			this.showNotify();

			await this.sudoService.exec(command, { logger: this.logger });

			this.notificationService.info('ZADIG Program exit. Note: You may need un-plug and plug again.');
		} else {
			await this.electronService.openExternal(URL_INSTALL_JLINK_DRIVER);
		}
	}

	private showNotify() {
		const sid = 'jtag.install.usage.never.show.again1';
		if (this.storageService.get(sid, StorageScope.GLOBAL)) {
			this.logger.info(`storage::${sid} is true, not show help.`);
			return;
		}

		const handle = this.notificationService.notify({
			severity: Severity.Info,
			message: localize('leanHow', 'Learn how to install JLink driver.'),
			actions: {
				primary: [this.instantiationService.createInstance(OpenUrlAction, localize('detail', 'Show Detail'), URL_INSTALL_JLINK_DRIVER)],
				secondary: [
					new Action(
						'never.show',
						localize('never again', 'Don\'t Show Again'),
						'', true,
						async () => {
							this.storageService.store(sid, 1, StorageScope.GLOBAL);
							handle.close();
						},
					),
				],
			},
		});

		this.toDispose.push({
			dispose() {
				handle.close();
			},
		});
	}

	dispose() {
		super.dispose();
		dispose(this.toDispose);
	}
}

export class InstallJTagOfficialDriverAction extends Action {
	public static readonly ID = ACTION_ID_JTAG_INSTALL_DRIVER_O;
	public static readonly LABEL = ACTION_LABEL_JTAG_INSTALL_DRIVER_O;

	private readonly logger: IChannelLogger;

	constructor(
		id: string, label: string,
		@INodePathService private readonly nodePathService: INodePathService,
		@IChannelLogService private readonly channelLogService: IChannelLogService,
		@INotificationService private readonly notificationService: INotificationService,
		@ISudoService private readonly sudoService: ISudoService,
	) {
		super(id, label);
		this.logger = channelLogService.createChannel(OPENOCD_CHANNEL_TITLE, OPENOCD_CHANNEL, true);
	}

	async run() {
		if (isWindows) {
			this.channelLogService.show(OPENOCD_CHANNEL);
			const dpinst_x64 = normalize(this.nodePathService.getPackagesPath('jlink/x64/dpinst_x64.exe'));
			this.logger.info(`dpinst_x64: ${dpinst_x64}`);

			const command = `${dpinst_x64} /S /C /F`;
			this.logger.info(`spawn: ${command}`);

			await this.sudoService.exec(command, { logger: this.logger });

			this.notificationService.info('Driver installed, You may need un-plug and plug again.');
		} else {
			this.notificationService.warn('Only windows need this action. If your OpenOCD does not work, please check our documents.');
		}
	}
}
