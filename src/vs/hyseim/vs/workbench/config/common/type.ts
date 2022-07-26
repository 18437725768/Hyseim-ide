import { IDisposable } from 'vs/base/common/lifecycle';
import { ISetting } from 'vs/workbench/services/preferences/common/preferences';
import { EnumProviderConfig } from 'vs/hyseim/vs/platform/config/common/dynamicEnum';

export function isDynamicEnum(setting: ISetting): boolean {
	return setting && setting.enumDescriptions && '__dyn_enum' in setting.enumDescriptions || false;
}

export function getDynamicEnum<T>(setting: ISetting): EnumProviderConfig<T> | void {
	if (isDynamicEnum(setting)) {
		return setting.enumDescriptions as any as EnumProviderConfig<T>;
	} else {
		return;
	}
}

export interface IDisposableTemplate {
	toDispose: IDisposable[];
}

export interface ISettingItemTemplate<T = any> extends IDisposableTemplate {
	onChange?: (value: T) => void;

	containerElement: HTMLElement;
	categoryElement: HTMLElement;
	labelElement: HTMLElement;
	descriptionElement: HTMLElement;
	controlElement: HTMLElement;
	isConfiguredElement: HTMLElement;
	otherOverridesElement: HTMLElement;
}
