import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ICMakeService } from 'vs/hyseim/vs/workbench/cmake/common/type';
import { localize } from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { CMakeService } from 'vs/hyseim/vs/workbench/cmake/electron-browser/cmakeService';
import { MaixCMakeBuildAction } from 'vs/hyseim/vs/workbench/cmake/electron-browser/actions/buildAction';
import { MaixCMakeBuildDebugAction, MaixCMakeDebugAction } from 'vs/hyseim/vs/workbench/cmake/electron-browser/actions/debugAction';
import { MaixCMakeCleanupAction } from 'vs/hyseim/vs/workbench/cmake/electron-browser/actions/cleanupAction';
import { MaixCMakeSelectTargetAction } from 'vs/hyseim/vs/workbench/cmake/electron-browser/actions/selectTargetAction';
import { MaixCMakeSelectVariantAction } from 'vs/hyseim/vs/workbench/cmake/electron-browser/actions/selectVariantAction';
import { MaixCMakeHelloWorldAction } from 'vs/hyseim/vs/workbench/cmake/electron-browser/actions/helloWorldAction';
import { MaixCMakeConfigureAction } from 'vs/hyseim/vs/workbench/cmake/electron-browser/actions/configureAction';
import { Extensions as JSONExtensions, IJSONContributionRegistry } from 'vs/platform/jsonschemas/common/jsonContributionRegistry';
import { registerExternalAction, registerInternalAction } from 'vs/hyseim/vs/workbench/actionRegistry/common/registerAction';
import { OpenLocalCMakeListAction } from 'vs/hyseim/vs/workbench/cmake/electron-browser/actions/openLocalCMakeList';
import { registerCMakeSchemas } from 'vs/hyseim/vs/base/common/jsonSchemas/cmakeConfigSchema';
import { MaixCMakeBuildRunAction, MaixCMakeRunAction } from 'vs/hyseim/vs/workbench/cmake/electron-browser/actions/runAction';
import { ACTION_CATEGORY_BUILD_DEBUG } from 'vs/hyseim/vs/base/common/menu/cmake';
import { MaixCMakeOpenLogAction } from 'vs/hyseim/vs/workbench/cmake/electron-browser/actions/openLogAction';
import { SelectWorkspaceFolderAction } from 'vs/hyseim/vs/services/workspace/electron-browser/selectProjectAction';

// Import Open Folder action
import { OpenFolderAction } from 'vs/workbench/browser/actions/workspaceActions';

registerSingleton(ICMakeService, CMakeService);

const category = localize('hyseim', 'Hyseim');

// BUILD
registerExternalAction(ACTION_CATEGORY_BUILD_DEBUG, MaixCMakeBuildAction);

// CONFIGURE
registerExternalAction(ACTION_CATEGORY_BUILD_DEBUG, MaixCMakeConfigureAction);

// RUN
registerExternalAction(ACTION_CATEGORY_BUILD_DEBUG, MaixCMakeDebugAction);
registerInternalAction(ACTION_CATEGORY_BUILD_DEBUG, MaixCMakeBuildDebugAction);

registerExternalAction(ACTION_CATEGORY_BUILD_DEBUG, MaixCMakeRunAction);
registerInternalAction(ACTION_CATEGORY_BUILD_DEBUG, MaixCMakeBuildRunAction);

// clean
registerExternalAction(ACTION_CATEGORY_BUILD_DEBUG, MaixCMakeCleanupAction);

// target select
registerExternalAction(ACTION_CATEGORY_BUILD_DEBUG, MaixCMakeSelectTargetAction);

// target select
registerExternalAction(ACTION_CATEGORY_BUILD_DEBUG, MaixCMakeSelectVariantAction);

// hello world project
registerExternalAction(ACTION_CATEGORY_BUILD_DEBUG, MaixCMakeHelloWorldAction);

// open config file
registerExternalAction(category, OpenLocalCMakeListAction);

// CONFIG json
registerCMakeSchemas((id, schema) => {
	Registry.as<IJSONContributionRegistry>(JSONExtensions.JSONContribution).registerSchema(id, schema);
});

// open log
registerInternalAction(ACTION_CATEGORY_BUILD_DEBUG, MaixCMakeOpenLogAction);

// select project
registerExternalAction(ACTION_CATEGORY_BUILD_DEBUG, SelectWorkspaceFolderAction);

// open folder
registerExternalAction('Open Folder', OpenFolderAction);
