import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Segment } from 'vs/base/common/json';
import { ExParseError } from 'vs/hyseim/vs/base/common/jsonComments';
import { ICompileInfo } from 'vs/hyseim/vs/base/common/jsonSchemas/cmakeConfigSchema';

export interface IJSONResult<T> {
	json: T;
	warnings: ExParseError[];
}

export interface IJSONModel<T> {
	json: T;
	warnings: ExParseError[];
}

export interface IFileWithStat<T> {
	filepath: string;
	content: T;
	stat: {
		atime: number;
		mtime: number;
		ctime: number;
		birthtime: number;
	}
}

export type ILoadedCompileInfo = ICompileInfo;

export interface INodeFileSystemService {
	_serviceBrand: any;

	readFile(file: string): Promise<string>;

	readFileWithTime(file: string): Promise<IFileWithStat<string>>;
	readFileWithTime(file: string, raw: true): Promise<IFileWithStat<Buffer>>;
	didFileModifiedFrom(file: IFileWithStat<any>): Promise<boolean>;

	readFileIfExists(file: string): Promise<string>;
	readFileIfExists(file: string, raw: true): Promise<Buffer>;
	writeFileIfChanged(file: string, data: string | Buffer): Promise<boolean>;
	copyWithin(from: string, to: string): Promise<void>;
	copyReplace(from: string, to: string): Promise<void>;

	rawWriteFile(file: string, data: string | Buffer): Promise<void>

	/** @deprecated */
	readJsonFile<T>(file: string): Promise<IJSONResult<T>>;
	/** @deprecated */
	editJsonFile(file: string, key: Segment[] | Segment, value: any): Promise<void>;
	tryWriteInFolder(packagesPath: string): Promise<boolean>;
	prepareSocketFile(s: string): Promise<string>;

	deleteFileIfExists(filePath: string): Promise<boolean>;
}

export const INodeFileSystemService = createDecorator<INodeFileSystemService>('nodeFileSystemService');
