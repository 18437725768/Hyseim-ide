import { CMAKE_LIBRARY_FOLDER_NAME } from 'vs/hyseim/vs/base/common/jsonSchemas/cmakeConfigSchema';

export const alwaysIgnorePattern = [
	CMAKE_LIBRARY_FOLDER_NAME + '/**',
	'.*',
	'.*/**',
];
export const rootIgnorePattern = [
	'build/**',
];

export const ignorePattern = [
	...rootIgnorePattern,
	...alwaysIgnorePattern,
];
