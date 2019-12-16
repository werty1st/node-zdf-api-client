var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import request from 'request-promise-native';
import fs from 'fs';
import moment from "moment";
import schedule from 'node-schedule';
import EventEmitter from 'events';
import winston from 'winston';
const log = winston.createLogger({
    exitOnError: true,
    transports: [
        new winston.transports.Console({
            level: process.env.logLevel || "error",
            format: winston.format.combine(winston.format.colorize(), winston.format.simple())
        })
    ]
});
const USERAGENT = process.env.npm_package_config_useragent || "nodejs - node-zdf-api-client";
class ZDFApi extends EventEmitter {
    constructor(client, secret, apihost) {
        super();
        if (client == "")
            throw new Error(`invalid client ID`);
        if (secret == "")
            throw new Error(`invalid client secret`);
        if (apihost == "")
            throw new Error(`invalid api host`);
        this.api = {
            client: client,
            secret: secret,
            host: apihost,
            //try restore from file
            token: this.loadTokenFile() //retuns promise
        };
    }
    //event version
    publishTokenE(token) {
        this.emit("token-ready", token);
    }
    //getter version
    get token() {
        return this.api.token; //return token promise
    }
    loadTokenFile() {
        return __awaiter(this, void 0, void 0, function* () {
            const api = this.api;
            let filename = api.host + ".token.json";
            let oldtokenstring;
            let oldtoken;
            let oldtokenvalid = false;
            if (fs.existsSync(filename)) {
                //have old token but verify it
                log.verbose("Using cached Token");
                try {
                    oldtokenstring = fs.readFileSync(filename, 'utf8');
                    oldtoken = JSON.parse(oldtokenstring);
                    oldtokenvalid = yield this.verifyToken(oldtoken);
                    if (oldtokenvalid === true) {
                        log.verbose("cached Token is valid");
                        //token valid return resolved promise
                        this.createTokenRefreshTask(oldtoken); //create task for old token
                        //trigger event
                        this.publishTokenE(oldtoken);
                        return Promise.resolve(oldtoken);
                    }
                }
                catch (error) {
                    log.warn("Token not readable");
                    fs.unlink(filename, () => { });
                }
            }
            //cant load old token OR token outdated
            //request new token        
            return this.requestNewToken();
        });
    }
    verifyToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const api = this.api;
            //part1
            return yield request({
                url: `https://${api.host}/oauth/validate`,
                method: 'POST',
                auth: {
                    user: api.client,
                    pass: api.secret
                },
                headers: {
                    'User-Agent': USERAGENT,
                },
                form: {
                    'token': token.access_token
                },
                resolveWithFullResponse: true
            })
                .then((result) => result.statusCode == 200)
                .catch(() => false);
        });
    }
    requestNewToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const api = this.api;
            log.verbose("request new Token");
            let result = yield request({
                url: `https://${api.host}/oauth/token`,
                method: 'POST',
                auth: {
                    user: api.client,
                    pass: api.secret
                },
                headers: {
                    'User-Agent': USERAGENT,
                },
                form: {
                    'grant_type': 'client_credentials'
                }
            });
            try {
                let token = JSON.parse(result);
                token.outdatedAt = moment().add(token.expires_in, "seconds").subtract(1, "hour").format();
                this.saveTokenFile(token);
                this.createTokenRefreshTask(token); //create task for new token
                //trigger event
                this.publishTokenE(token);
                return Promise.resolve(token);
            }
            catch (error) {
                return Promise.reject("Failed to request new Token.");
            }
        });
    }
    saveTokenFile(token) {
        const api = this.api;
        let filename = api.host + ".token.json";
        fs.writeFile(filename, JSON.stringify(token), function (err) {
            if (err) {
                log.warning("Token not saved.", err);
                return;
            }
            log.verbose("Token saved");
        });
    }
    stopTokenRefreshTask() {
        //clear existing Task
        if (this.RefreshTask) {
            schedule.cancelJob(this.RefreshTask);
            log.debug("RefreshTask canceled");
        }
    }
    createTokenRefreshTask(token) {
        const api = this.api;
        this.stopTokenRefreshTask();
        //token's max-age
        let outdatedAt = moment(token.outdatedAt).toDate();
        //create Token refresh Task
        this.RefreshTask = schedule.scheduleJob(outdatedAt, () => {
            api.token = this.requestNewToken(); //overwrite old promise with new one
        });
        log.debug("createdRefreshTask");
    }
}
module.exports = ZDFApi;
export default ZDFApi;
