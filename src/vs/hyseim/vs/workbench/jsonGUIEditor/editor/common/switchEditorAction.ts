import { Action } from 'vs/base/common/actions';
import {
	ACTION_ID_GUI_SWITCH_TO_GUI,
	ACTION_ID_GUI_SWITCH_TO_JSON,
	ACTION_LABEL_GUI_SWITCH_TO_GUI,
	ACTION_LABEL_GUI_SWITCH_TO_JSON,
} from 'vs/hyseim/vs/workbench/jsonGUIEditor/editor/common/actionId';
import { vscodeIconClass } from 'vs/hyseim/vs/platform/vsicons/browser/vsIconRender';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { AbstractJsonEditorInput } from 'vs/hyseim/vs/workbench/jsonGUIEditor/editor/browser/abstractJsonEditorInput';

export class ShowJsonEditorAction extends Action {
	public static readonly ID: string = ACTION_ID_GUI_SWITCH_TO_JSON;
	public static readonly LABEL: string = ACTION_LABEL_GUI_SWITCH_TO_JSON;

	constructor(
		id: string = ShowJsonEditorAction.ID, label: string = ShowJsonEditorAction.LABEL,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super(id, label, vscodeIconClass('json'));
	}

	async run() {
		if (this.editorService.activeEditor instanceof AbstractJsonEditorInput) {
			await this.editorService.activeEditor.switchTo('json');
		}
	}
}

export class ShowGuiEditorAction extends Action {
	public static readonly ID: string = ACTION_ID_GUI_SWITCH_TO_GUI;
	public static readonly LABEL: string = ACTION_LABEL_GUI_SWITCH_TO_GUI;

	constructor(
		id: string = ShowJsonEditorAction.ID, label: string = ShowJsonEditorAction.LABEL,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super(id, label, vscodeIconClass('PreferencesEditor'));
	}

	async run() {
		if (this.editorService.activeEditor instanceof AbstractJsonEditorInput) {
			await this.editorService.activeEditor.switchTo('gui');
		}
	}
}

