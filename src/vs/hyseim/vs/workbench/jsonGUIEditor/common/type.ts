import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IConstructorSignature2 } from 'vs/platform/instantiation/common/instantiation';
import { URI } from 'vs/base/common/uri';
import { IJsonEditorModel } from 'vs/hyseim/vs/workbench/jsonGUIEditor/service/common/type';

export namespace JsonEditorExtensions {
	export const CustomJson = 'workbench.registry.kenderyte.json';
}

export const JsonEditorFocusContext = new RawContextKey<boolean>('hyseimJsonEditorFocus', false);
export const JsonEditorFocusIdContext = new RawContextKey<string>('hyseimJsonEditorFocusId', '');

export type IJsonEditorModelConstructor = IConstructorSignature2<string, URI, IJsonEditorModel<any>>;

