import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IServerChannel } from 'vs/base/parts/ipc/common/ipc';
import { IPCServiceAttachedData } from 'vs/hyseim/vs/services/ipc/common/ipcType';

export interface IHyseimRelaunchChannel extends IServerChannel {
	_serviceBrand: any;
}

export interface IRelaunchService extends IPCServiceAttachedData {
	_serviceBrand: any;

	/** @deprecated use lifecycleService */
	relaunch(): void;

	connect(): Promise<void>;
	launchUpdater(): Promise<void>;
	createLogsTarball(): Promise<string>;
}

export const IRelaunchService = createDecorator<IRelaunchService>('relaunchService');
