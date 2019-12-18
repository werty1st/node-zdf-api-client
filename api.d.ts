/// <reference types="node" />
import EventEmitter from 'events';
interface Token {
    token_type: string;
    expires_in: number;
    access_token: string;
    outdatedAt: Date | string;
}
export default class ZDFApi extends EventEmitter {
    private api;
    RefreshTask: any;
    constructor(client: string, secret: string, apihost: string);
    publishTokenE(token: Token): void;
    get token(): Promise<any>;
    loadTokenFile(): Promise<any>;
    verifyToken(token: Token): Promise<boolean>;
    requestNewToken(): Promise<any>;
    saveTokenFile(token: Token): void;
    stopTokenRefreshTask(): void;
    createTokenRefreshTask(token: Token): void;
}
export {};
//# sourceMappingURL=api.d.ts.map