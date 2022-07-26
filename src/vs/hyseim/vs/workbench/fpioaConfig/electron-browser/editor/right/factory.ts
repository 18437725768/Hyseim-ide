import { ChipPackageType, IChipPackagingCalculated } from 'vs/hyseim/vs/workbench/fpioaConfig/common/packagingTypes';
import { BGATableRender } from 'vs/hyseim/vs/workbench/fpioaConfig/electron-browser/editor/right/bgaTable';
import { AbstractTableRender } from 'vs/hyseim/vs/workbench/fpioaConfig/electron-browser/editor/right/abstract';
import { IThemeService } from 'vs/platform/theme/common/themeService';

export function chipRenderFactory(chip: IChipPackagingCalculated, themeService: IThemeService): AbstractTableRender<any> {
	switch (chip.geometry.type) {
		case ChipPackageType.BGA:
			return new BGATableRender(chip, themeService);
		default:
			throw new Error('unknwon chip type: ' + chip.geometry.type);
	}
}
