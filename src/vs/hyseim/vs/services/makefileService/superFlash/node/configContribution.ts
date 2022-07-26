import { registerConfiguration } from 'vs/hyseim/vs/platform/config/common/registry';
import { CONFIG_CATEGORY } from 'vs/hyseim/vs/base/common/configKeys';
import { localize } from 'vs/nls';
import { CONFIG_KEY_SUPER_FLASH_ENABLE } from 'vs/hyseim/vs/services/makefileService/superFlash/common/type';

registerConfiguration({
	id: 'super-flash',
	category: CONFIG_CATEGORY.KENDRYTE.id,
	overridable: true,
	properties: {
		[CONFIG_KEY_SUPER_FLASH_ENABLE]: {
			title: localize('superFlashEnabled', 'Enable fast flash functional'),
			type: 'boolean',
			default: false,
			description: localize('superFlash', 'Use an alternative ISP program to get faster development.'),
		},
	},
});
