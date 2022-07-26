import { ISerialMonitorControlService } from 'vs/hyseim/vs/workbench/serialMonitor/electron-browser/outputWindowControlService';
import { CONTEXT_IN_SERIAL_PORT_OUTPUT, SERIAL_MONITOR_ACTION_CLEAR } from 'vs/hyseim/vs/workbench/serialMonitor/common/actionId';
import { registerActionWithKey } from 'vs/hyseim/vs/workbench/actionRegistry/common/registerAction';
import { ClearTerminalAction } from 'vs/workbench/contrib/terminal/browser/terminalActions';
import { KeyCode, KeyMod } from 'vs/base/common/keyCodes';
import { Action } from 'vs/base/common/actions';
import { ACTION_CATEGORY_SERIAL_PORT } from 'vs/hyseim/vs/base/common/menu/serialPort';

export class SerialPortClearAction extends Action {
	public static readonly ID = SERIAL_MONITOR_ACTION_CLEAR;
	public static readonly LABEL = ClearTerminalAction.LABEL;

	constructor(
		id: string,
		label: string,
		@ISerialMonitorControlService private serialMonitorControlService: ISerialMonitorControlService,
	) {
		super(id, label, 'terminal-action octicon octicon-trashcan');
	}

	public run(event?: any): Promise<void> {
		this.serialMonitorControlService.clearScreen();
		return Promise.resolve(void 0);
	}
}

registerActionWithKey(ACTION_CATEGORY_SERIAL_PORT, SerialPortClearAction, {
	primary: KeyMod.CtrlCmd | KeyCode.KEY_K,
	linux: { primary: KeyCode.Unknown },
}, CONTEXT_IN_SERIAL_PORT_OUTPUT);
