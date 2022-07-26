import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ThemeColor } from 'vs/platform/theme/common/themeService';
import { StatusbarAlignment } from 'vs/workbench/services/statusbar/common/statusbar';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { MyStatusBarItemNames } from 'vs/hyseim/vs/workbench/bottomBar/common/myStatusBarItemId';

export enum StatusBarLeftLocation {
	CMAKE = 5,
	MESSAGE = 4,
	SERIAL = 3,
}

export interface IStatusButtonData {
	text: string;
	command: string;
	tooltip: string;
	color: string | ThemeColor;
	backgroundColor: string | ThemeColor;
	arguments: any[];
	showBeak: boolean;
	align: StatusbarAlignment;
	position: number;
	setContextKey(v: ContextKeyExpr | null): void;
}

export interface ISleepData extends Partial<Omit<IStatusButtonData, 'setContextKey'>> {
	contextKey?: string;
}

export interface IStatusButtonMethod { // extends IMyDisposable
	reload(): void;
	show(): void;
	hide(): void;
	isVisible(): boolean;
	sleep(): ISleepData;
	wakeup(data: IStatusButtonData): void;
}

export type IPublicStatusButton = IStatusButtonMethod & IStatusButtonData;

export type IPartMyStatusBarItem = Pick<IPublicStatusButton, 'text' | 'command' | 'tooltip' | 'color' | 'arguments' | 'showBeak'> ;

export interface IHyseimStatusControllerService {
	_serviceBrand: any;

	createInstance(id: MyStatusBarItemNames, bigPosition?: number): IPublicStatusButton;
	showMessage(buttonId: string): IPartMyStatusBarItem;
	resolveMessage(buttonId: string): void;
}

export const IHyseimStatusControllerService = createDecorator<IHyseimStatusControllerService>('hyseimStatusControllerService');
