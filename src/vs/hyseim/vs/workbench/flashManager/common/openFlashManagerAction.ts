import { Action } from 'vs/base/common/actions';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ACTION_ID_OPEN_FLASH_MANAGER, ACTION_LABEL_OPEN_FLASH_MANAGER } from 'vs/hyseim/vs/base/common/menu/tools';
import { URI } from 'vs/base/common/uri';
import { FLASH_MANAGER_CONFIG_FILE_NAME, PROJECT_CONFIG_FOLDER_NAME } from 'vs/hyseim/vs/base/common/constants/wellknownFiles';
import { IHyseimWorkspaceService } from 'vs/hyseim/vs/services/workspace/common/type';
import { ICustomJsonEditorService } from 'vs/hyseim/vs/workbench/jsonGUIEditor/service/common/type';
import { KENDRYTE_FLASH_MANAGER_ID } from 'vs/hyseim/vs/workbench/flashManager/common/type';

export class OpenFlashManagerAction extends Action {
	public static readonly ID = ACTION_ID_OPEN_FLASH_MANAGER;
	public static readonly LABEL = ACTION_LABEL_OPEN_FLASH_MANAGER;

	constructor(
		id: string = OpenFlashManagerAction.ID, label: string = OpenFlashManagerAction.LABEL,
		@IEditorService private editorService: IEditorService,
		@ICustomJsonEditorService private customJsonEditorService: ICustomJsonEditorService,
		@IHyseimWorkspaceService private readonly hyseimWorkspaceService: IHyseimWorkspaceService,
	) {
		super(id, label);
	}

	async run(switchTab: string): Promise<any> {
		const resource = URI.file(this.hyseimWorkspaceService.requireCurrentWorkspaceFile(PROJECT_CONFIG_FOLDER_NAME, FLASH_MANAGER_CONFIG_FILE_NAME));
		const input = this.customJsonEditorService.openEditorAs(resource, KENDRYTE_FLASH_MANAGER_ID);
		return this.editorService.openEditor(input, {
			revealIfOpened: true,
			pinned: true,
		});
	}
}
