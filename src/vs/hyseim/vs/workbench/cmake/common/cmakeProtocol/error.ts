import { CMAKE_EVENT_TYPE, ICMakeResponse } from 'vs/hyseim/vs/workbench/cmake/common/cmakeProtocol/cmakeProtocol';

export interface ICMakeProtocolError extends ICMakeResponse {
	type: CMAKE_EVENT_TYPE.ERROR;
	errorMessage: string;
}
