import { EditorInput } from 'vs/workbench/common/editor';
import { URI } from 'vs/base/common/uri';
import { PACKAGE_MANAGER_TITLE } from 'vs/hyseim/vs/workbench/packageManager/common/type';

export class PackageBrowserInput extends EditorInput {

	static readonly ID = 'workbench.package-manager.input2';
	private _query: URI;

	constructor(
		_query: string,
	) {
		super();
		if (!_query) {
			_query = 'packagemanager://homepage/';
		}
		this._query = URI.parse(_query);
	}

	getTypeId(): string {
		return PackageBrowserInput.ID;
	}

	getName(): string {
		return PACKAGE_MANAGER_TITLE;
	}

	matches(other: any): boolean {
		if (other instanceof PackageBrowserInput) {
			return other.getResource().toString() === this.getResource().toString();
		} else {
			return false;
		}
	}

	get tab() {
		return this._query.authority;
	}

	get queryString() {
		return this._query.query;
	}

	resolve(): Promise<any> {
		return Promise.resolve();
	}

	supportsSplitEditor(): boolean {
		return false;
	}

	getResource(): URI {
		return this._query;
	}
}
