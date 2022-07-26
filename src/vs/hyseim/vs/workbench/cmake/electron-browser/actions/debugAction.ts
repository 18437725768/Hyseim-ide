import { Action } from 'vs/base/common/actions';
import { IDebugService, ILaunch } from 'vs/workbench/contrib/debug/common/debug';
import { ICMakeService } from 'vs/hyseim/vs/workbench/cmake/common/type';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { resolvePath } from 'vs/hyseim/vs/base/common/resolvePath';
import { ILogService } from 'vs/platform/log/common/log';
import { DebugScript } from 'vs/hyseim/vs/workbench/cmake/node/environmentVars';
import { visit } from 'vs/base/common/json';
import * as encoding from 'vs/base/node/encoding';
import { IFileService } from 'vs/platform/files/common/files';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { dispose, IDisposable } from 'vs/base/common/lifecycle';
import { Range } from 'vs/editor/common/core/range';
import { IIdentifiedSingleEditOperation } from 'vs/editor/common/model';
import { Position } from 'vs/editor/common/core/position';
import { generateIndent } from 'vs/editor/contrib/indentation/indentUtils';
import {
	ACTION_ID_MAIX_CMAKE_BUILD,
	ACTION_ID_MAIX_CMAKE_BUILD_DEBUG,
	ACTION_ID_MAIX_CMAKE_DEBUG,
	ACTION_LABEL_MAIX_CMAKE_BUILD_DEBUG,
	ACTION_LABEL_MAIX_CMAKE_DEBUG,
} from 'vs/hyseim/vs/base/common/menu/cmake';
import { IOpenOCDService } from 'vs/hyseim/vs/services/openocd/common/openOCDService';
import { LaunchVisitor, WorkspaceMaixLaunch } from 'vs/hyseim/vs/workbench/cmake/common/launchConfig';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { createRunDisposeAction } from 'vs/hyseim/vs/workbench/actionRegistry/common/registerAction';

export class MaixCMakeDebugAction extends Action {
	public static readonly ID = ACTION_ID_MAIX_CMAKE_DEBUG;
	public static readonly LABEL = ACTION_LABEL_MAIX_CMAKE_DEBUG;
	private readonly disposeArr: IDisposable[] = [];

	constructor(
		id = MaixCMakeDebugAction.ID, label = MaixCMakeDebugAction.LABEL,
		@ICMakeService private cmakeService: ICMakeService,
		@IDebugService private debugService: IDebugService,
		@ILogService private logService: ILogService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IFileService private fileService: IFileService,
		@ITextModelService private textModelService: ITextModelService,
		@IOpenOCDService private openOCDService: IOpenOCDService,
		@ITextFileService private textFileService: ITextFileService,
	) {
		super(id, label);
	}

	dispose() {
		super.dispose();
		dispose(this.disposeArr);
		this.disposeArr.length = 0;
	}

	protected async saveToLaunchJson(config: ILaunch) {
		const resource = config.uri;
		const exists = await this.fileService.exists(resource);
		if (!exists) {
			await this.textFileService.write(resource, `{
	"$schema": "vscode://schemas/launch",
    "version": "0.2.0",
    "configurations": [
    ]
}`, { encoding: encoding.UTF8 });
		}
		const textModelRef = await this.textModelService.createModelReference(resource);
		this.disposeArr.push(textModelRef);

		if (textModelRef.object.isReadonly()) {
			throw new Error('readonly. please check your permission.');
		}

		const model = textModelRef.object.textEditorModel;

		const visitor = new LaunchVisitor();

		visit(model.getValue(), visitor);

		const result = visitor.Result;

		let configContent = indent(generateIndent(8, 4, true), JSON.stringify(config.getConfiguration('hyseim'), null, 4));

		let edits: IIdentifiedSingleEditOperation[] = [];
		if (result.found) {
			edits.push({
				range: Range.fromPositions(model.getPositionAt(result.start), model.getPositionAt(result.end)),
				text: configContent.trim(),
			});
		} else {
			const arrayPos = model.getPositionAt(result.arrayPos);
			const lastChar = model.getLineLastNonWhitespaceColumn(arrayPos.lineNumber);
			// Check if there are more characters on a line after a "configurations": [, if yes enter a newline
			if (lastChar > arrayPos.column) {
				configContent = '\n' + configContent + ',\n';
			} else {
				configContent = '\n' + configContent + ',';
			}
			const newPos = new Position(arrayPos.lineNumber, lastChar);
			edits.push({
				range: Range.fromPositions(newPos, newPos),
				text: configContent,
			});
		}
		model.applyEdits(edits);

		textModelRef.dispose();
	}

	async run(): Promise<void> {
		await this.openOCDService.start();
		const port = this.openOCDService.getCurrentPort();
		if (!port) {
			throw new Error('OpenOCD service not able to start.');
		}

		let file = await this.cmakeService.getOutputFile();
		file = file.replace(/\.bin$/, '');
		const myLaunch = this.instantiationService.createInstance(WorkspaceMaixLaunch, port, file);
		const config = myLaunch.getConfiguration();

		this.logService.info('Debug Config:', config);
		// const buildDir = config.env.PWD || resolvePath(myLaunch.workspace.uri.fsPath, 'build');
		const buildDir = config.cwd || resolvePath(myLaunch.workspace.uri.fsPath, 'build');

		// const dbg = new DebugScript(buildDir, config.env);
		const dbg = new DebugScript(buildDir, config.environment);
		// dbg.command(config.gdbpath, [
		dbg.command(config.miDebuggerPath, [
				'--eval',
			// `target remote ${config.target}`,
			// config.executable,
			`target remote 127.0.0.1:${port}`,
			config.program,
		]);
		dbg.writeBack(myLaunch.workspace.uri.fsPath, 'debug');

		await this.saveToLaunchJson(myLaunch).catch((e) => {
			e.message = 'invalid launch.json: ' + e.message;
			myLaunch.openConfigFile(false, false);
			throw e;
		});

		await this.debugService.stopSession(undefined);
		// await this.debugService.startDebugging(myLaunch, 'hyseim');
		await this.debugService.startDebugging(myLaunch, 'hyseim');
	}
}

function indent(tab: string, txt: string) {
	return txt.replace(/^/mg, tab);
}

export class MaixCMakeBuildDebugAction extends Action {
	public static readonly ID = ACTION_ID_MAIX_CMAKE_BUILD_DEBUG;
	public static readonly LABEL = ACTION_LABEL_MAIX_CMAKE_BUILD_DEBUG;

	constructor(
		id = MaixCMakeBuildDebugAction.ID, label = MaixCMakeBuildDebugAction.LABEL,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super(id, label);
	}

	async run() {
		await createRunDisposeAction(this.instantiationService, ACTION_ID_MAIX_CMAKE_BUILD, [false]);
		await createRunDisposeAction(this.instantiationService, ACTION_ID_MAIX_CMAKE_DEBUG);
	}
}
