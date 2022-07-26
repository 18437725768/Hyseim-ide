import { IHyseimMainIpcChannel, IHyseimMainIpcChannelClient, IHyseimServiceRunnerChannel } from 'vs/hyseim/vs/services/ipc/browser/ipc';
import { IHyseimClientService, IPCServiceCaller, symbolIpcObj } from 'vs/hyseim/vs/services/ipc/common/ipcType';
import { ServiceIdentifier } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/base/common/event';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ILogService } from 'vs/platform/log/common/log';
import { URI } from 'vs/base/common/uri';
import { ChannelLogger } from 'vs/hyseim/vs/services/channelLogger/common/logger';
import { LogEvent } from 'vs/hyseim/vs/services/channelLogger/common/type';
import { IPC_ID_IS_ME_FIRST, IPC_ID_STOP_LOG_EVENT } from 'vs/hyseim/vs/base/common/ipcIds';
import { IElectronEnvironmentService } from 'vs/workbench/services/electron/electron-browser/electronEnvironmentService';
import { registerChannelClient } from 'vs/hyseim/vs/platform/instantiation/common/ipcExtensions';

const symbolMethod = Symbol('ipc-method-mark');
const symbolEventMethod = Symbol('ipc-event-method-mark');
const symbolEvent = Symbol('ipc-event-mark');

class HyseimIPCWorkbenchService implements IHyseimClientService, IPCServiceCaller {
	_serviceBrand: any;
	private readonly mapper = new Map<string, any>();

	constructor(
		@IHyseimMainIpcChannel protected readonly mainChannel: IHyseimMainIpcChannelClient,
		@IElectronEnvironmentService private readonly electronEnvironmentService: IElectronEnvironmentService,
		@IHyseimServiceRunnerChannel protected readonly runnerChannel: IHyseimMainIpcChannelClient,
		@ILogService protected readonly logService: ILogService,
	) {
	}

	public initService<T extends { _serviceBrand: any }>(serviceObj: T, iinterface: ServiceIdentifier<T>): void {
		if (!serviceObj.hasOwnProperty(symbolIpcObj)) {
			Object.defineProperty(serviceObj, symbolIpcObj, {
				configurable: false,
				enumerable: true,
				value: this,
				writable: false,
			});
		}
	}

	isMeFirst(): Thenable<boolean> {
		const windowId = this.electronEnvironmentService.windowId;
		return this.mainChannel.call<boolean>(IPC_ID_IS_ME_FIRST, windowId);
	}

	public listen<T>(event: string): Event<T> {
		return this.mainChannel.listen(event);
	}

	markEvents<T>(service: ServiceIdentifier<T>, events: (keyof T)[]) {
		if (!service.hasOwnProperty(symbolEvent)) {
			Object.defineProperty(service, symbolEvent, {
				value: [],
				configurable: false,
				enumerable: true,
				writable: false,
			});
		}
		(service as any)[symbolEvent].push(...events);
	}

	markMethod<T>(service: ServiceIdentifier<T>, methods: (keyof T)[]) {

		if (!service.hasOwnProperty(symbolMethod)) {
			Object.defineProperty(service, symbolMethod, {
				value: [],
				configurable: false,
				enumerable: true,
				writable: false,
			});
		}
		(service as any)[symbolMethod].push(...methods);
	}

	markEventMethod<T>(service: ServiceIdentifier<T>, methods: (keyof T)[]) {

		if (!service.hasOwnProperty(symbolEventMethod)) {
			Object.defineProperty(service, symbolEventMethod, {
				value: [],
				configurable: false,
				enumerable: true,
				writable: false,
			});
		}
		(service as any)[symbolEventMethod].push(...methods);
	}

	public as<T>(service: ServiceIdentifier<T>): T {
		const id = service.toString();
		if (!this.mapper.has(id)) {
			const channel = this._create(
				id,
				(service as any)[symbolMethod] || [],
				(service as any)[symbolEvent] || [],
				(service as any)[symbolEventMethod] || [],
			);
			this.mapper.set(id, channel);
		}
		return this.mapper.get(id);
	}

	private _create(id: string, methods: string[], events: string[], eventMethods: string[]) {
		const proxy = Object.create(null);
		proxy[Symbol.toStringTag] = () => id;

		for (const method of methods) {
			Object.defineProperty(proxy, method, {
				configurable: false,
				enumerable: true,
				value: (...arg: any[]) => this._callService(id, method, arg),
				writable: false,
			});
		}
		for (const event of events) {
			Object.defineProperty(proxy, event, {
				configurable: false,
				enumerable: true,
				get: () => this._listenService(id, event),
			});
		}
		for (const em of eventMethods) {
			Object.defineProperty(proxy, em, {
				configurable: false,
				enumerable: true,
				value: (...arg: any[]) => this._listenService(id, em, arg),
			});
		}
		Object.freeze(proxy);
		return proxy;
	}

	_callService(id: string, method: string, args: any[]): Promise<any> {
		this.logService.info(`callService(${id}, ${method},`, args, ');');

		return this.runnerChannel.call(`${id}:${method}`, this.serializeArg(args));
	}

	_listenService(id: string, method: string, args?: any[]): Event<any> {
		if (args) {
			this.logService.info(`listenService(${id}, ${method},`, args, ');');
			return this.runnerChannel.listen(`${id}:${method}`, this.serializeArg(args));
		} else {
			this.logService.info(`listenService(${id}, [getter]${method});`);
			return this.runnerChannel.listen(`${id}:${method}`);
		}
	}

	private serializeArg(args: any[]) {
		return args.map((item) => {
			if (URI.isUri(item)) {
				return { __type: 'URI', value: item.toString() };
			}
			if (item instanceof ChannelLogger) {
				this._listenLogger(item);
				return { __type: 'ChannelLogger', value: item.serialize() };
			}

			return item;
		});
	}

	private readonly loggers = new WeakMap<ChannelLogger, boolean>();

	_listenLogger(logger: ChannelLogger) {
		if (this.loggers.has(logger)) {
			return;
		}
		this.loggers.set(logger, true);
		const { id, window } = logger.serialize();
		const dis = this.mainChannel.listen<LogEvent>('logEvent', [id, window])((d) => {
			logger[d.level](d.message, ...d.args);
		});
		logger.onDispose(() => {
			this.loggers.delete(logger);
			dis.dispose();
			this.mainChannel.call(IPC_ID_STOP_LOG_EVENT, [id, window]);
		});
	}
}

registerSingleton(IHyseimClientService, HyseimIPCWorkbenchService);

registerChannelClient(IHyseimMainIpcChannel);
registerChannelClient(IHyseimServiceRunnerChannel);
