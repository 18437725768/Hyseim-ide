import { BrowserWindow, dialog, ipcMain, IpcMainEvent } from 'electron';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { localize } from 'vs/nls';

const windowTimeouts = new Map<number, NodeJS.Timeout>();

ipcMain.on('hyseim-health-window-ready', (event: IpcMainEvent) => {
	const tmr = windowTimeouts.get(event.sender.id);
	if (tmr) {
		console.log('window [%s] check ok.', event.sender.id);
		clearTimeout(tmr);
		windowTimeouts.delete(event.sender.id);
	} else {
		console.log('window [%s] invalid sender.', event.sender.id);
	}

});

export function __hyseim_check_window_health(win: BrowserWindow, environmentService: IEnvironmentService) {
	const tmr = setTimeout(() => {
		console.log('window [%s] check timeout after 15s.', win.id);
		if (environmentService.isBuilt) {
			dialog.showErrorBox('Error', localize('windowLoadError', 'Sorry.\nThe main window cannot load because some unknown reason.\nPlease send report to us.'));
		} else {
			win.webContents.openDevTools({ mode: 'detach' });
		}
	}, 15000);
	windowTimeouts.set(win.id, tmr);
}
