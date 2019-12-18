/// <reference types="node" />
import EventEmitter from 'events';
export interface IToken {
    token_type: string;
    expires_in: number;
    access_token: string;
    outdatedAt: Date | string;
    [propName: string]: any;
}
export declare class ZDFApi extends EventEmitter {
    private client;
    private secret;
    private host;
    private _token;
    RefreshTask: any;
    constructor(client: string, secret: string, apihost: string);
    publishTokenE(token: IToken): void;
    get token(): Promise<IToken>;
    loadTokenFile(): Promise<any>;
    verifyToken(token: IToken): Promise<boolean>;
    requestNewToken(): Promise<any>;
    saveTokenFile(token: IToken): void;
    stopTokenRefreshTask(): void;
    createTokenRefreshTask(token: IToken): void;
}
//# sourceMappingURL=api.d.ts.map