import { IMarkerData, IMarkerService, MarkerSeverity } from 'vs/platform/markers/common/markers';
import { TextProgressBar } from 'vs/hyseim/vs/base/common/textProgressBar';
import { dispose, IDisposable } from 'vs/base/common/lifecycle';
import { isAbsolute } from 'vs/base/common/path';
import { normalizePosixPath, resolvePath } from 'vs/hyseim/vs/base/common/resolvePath';
import { IHyseimStatusControllerService } from 'vs/hyseim/vs/workbench/bottomBar/common/type';
import { ExtendMap } from 'vs/hyseim/vs/base/common/extendMap';
import { CMAKE_ERROR_MARKER } from 'vs/hyseim/vs/workbench/cmake/common/type';
import { IHyseimWorkspaceService } from 'vs/hyseim/vs/services/workspace/common/type';
import { URI } from 'vs/base/common/uri';

const regLdMissingReference = /^(.*?):(\d+): (undefined reference to .+)$/;
const regIsLdPassingMessage = /riscv32-unknown-elf[/\\]bin[/\\]ld(?:\.exe)?/;
const regGCCError = /^(.*?):(\d+):(?:(\d+):)?\s+((?:fatal )?error|Error|warning|note):\s+(.*)/;
const regCMakeProgress = /^\[\s*(\d+)%]/;
const isDeclareInfo = /^declared here/;

export class CMakeProcessList implements IDisposable {
	constructor(
		private pros: CMakeProcessor[],
	) {
	}

	parseLine(line: string) {
		CMakeProcessor.parseLine(line, this.pros);
	}

	finalize() {
		for (const obj of this.pros) {
			obj.finalize();
		}
	}

	dispose() {
		dispose(this.pros);
	}
}

export abstract class CMakeProcessor implements IDisposable {
	protected abstract onData(line: string): boolean;

	public static parseLine(line: string, processors: CMakeProcessor[]) {
		for (const item of processors) {
			if (item.onData(line)) {
				break;
			}
		}
	}

	abstract finalize(): void;

	abstract dispose(): void;
}

export class CMakeBuildErrorProcessor extends CMakeProcessor {
	private readonly errorMarkers = new ExtendMap<string/* abs path */, IMarkerData[]>();
	private readonly currentProjectPath: string;
	private lastError?: IMarkerData;
	private warningCount: number = 0;

	constructor(
		@IMarkerService private readonly markerService: IMarkerService,
		@IHyseimWorkspaceService hyseimWorkspaceService: IHyseimWorkspaceService,
	) {
		super();
		this.currentProjectPath = hyseimWorkspaceService.requireCurrentWorkspace();
	}

	protected onData(line: string) {
		const m1 = regLdMissingReference.exec(line);
		if (m1) {
			if (!regIsLdPassingMessage.test(m1[1])) {
				this.diagnostic('error', 'LD: ' + m1[3], m1[1], m1[2], '0');
			}
			return true;
		}
		const m2 = regGCCError.exec(line);
		if (m2) {
			this.diagnostic(m2[4], m2[5], m2[1], m2[2], m2[3]);
			return true;
		}

		return false;
	}

	protected diagnostic(_severity: string, message: string, file: string, _line: string, _column: string) {
		const severity = cmakeSeverityToMarker(_severity);
		const line = parseInt(_line);
		const column = parseInt(_column);

		file = normalizePosixPath(file);
		if (!isAbsolute(file)) {
			file = resolvePath(this.currentProjectPath, file);
		}

		if (this.lastError && isDeclareInfo.test(message)) {
			this.lastError.relatedInformation!.push({
				resource: URI.file(file),
				message,
				startLineNumber: line,
				startColumn: column,
				endLineNumber: line,
				endColumn: column,
			});
			delete this.lastError;
			return;
		}

		const list = this.errorMarkers.entry(file, () => {
			return [];
		});

		this.lastError = {
			message,
			severity,
			startLineNumber: line,
			startColumn: column,
			endLineNumber: line,
			endColumn: column,
			relatedInformation: [],
		};
		list.push(this.lastError);

		if (severity === MarkerSeverity.Warning) {
			this.warningCount++;
		}
	}

	public finalize() {
		for (const [file, markers] of this.errorMarkers.entries()) {
			this.markerService.changeOne(CMAKE_ERROR_MARKER, URI.file(file), markers);
		}
	}

	public dispose() {
	}

	public getWarningCount() {
		return this.warningCount;
	}
}

function cmakeSeverityToMarker(_severity: string): MarkerSeverity {
	switch (_severity.toLowerCase()) {
		case 'error':
		case 'fatal error':
			return MarkerSeverity.Error;
		case 'warning':
		case 'warn':
		case 'note':
			return MarkerSeverity.Warning;
		default:
			return MarkerSeverity.Info;
	}
}

export class CMakeBuildProgressProcessor extends CMakeProcessor {
	private bar: TextProgressBar;
	private readonly CMAKE_PROGRESS = 'cmake.progress';

	constructor(
		protected statusBarController: IHyseimStatusControllerService,
	) {
		super();
		this.bar = new TextProgressBar(20);
		this.bar.infinite();
	}

	protected onData(line: string) {
		const m1 = regCMakeProgress.exec(line);
		if (m1) {
			this.bar.percent(parseInt(m1[1]));
			this.statusBarController.showMessage(this.CMAKE_PROGRESS).text = this.bar.toString();
			return true;

		}
		return false;
	}

	finalize(): void {
		this.bar.dispose();
		delete this.bar;
		this.statusBarController.resolveMessage(this.CMAKE_PROGRESS);
	}

	dispose(): void {
		// nothing to do
	}
}
