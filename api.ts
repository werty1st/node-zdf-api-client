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
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });

const USERAGENT = process.env.npm_package_config_useragent || "nodejs - node-zdf-api-client";

export interface IToken {
    token_type: string
    expires_in: number
    access_token: string
    outdatedAt: Date | string
    [propName: string]: any
}

export class ZDFApi extends EventEmitter {

    private client: string
    private secret: string
    private host: string
    private _token: Promise<IToken>
    
    RefreshTask: any;

    constructor(client:string, secret:string, apihost:string){
        super();

        if ( client == "") throw new Error(`invalid client ID`);
        if ( secret == "") throw new Error(`invalid client secret`);
        if ( apihost == "") throw new Error(`invalid api host`);

        this.client  = client 
        this.secret  = secret 
        this.host = apihost

        //try restore from file
        this._token = this.loadTokenFile() //retuns promise
        
    }

    //event version
    publishTokenE(token:IToken){
        this.emit("token-ready",token);
    }

    //getter version
    get token(){
        return this._token; //return token promise
    }

    


    async loadTokenFile(){
        
        let filename = this.host + ".token.json";
        let oldtoken:IToken;
        let oldtokenvalid = false;

        if (fs.existsSync(filename)){
        
            //have old token but verify it
            log.verbose("Using cached Token");
            try {
                oldtoken = JSON.parse(
                    fs.readFileSync(filename, 'utf8')
                );                
                oldtokenvalid = await this.verifyToken( oldtoken );
    
                if (oldtokenvalid === true) {
                    log.verbose("cached Token is valid");
                    
                    //token valid return resolved promise
                    this.createTokenRefreshTask( oldtoken ); //create task for old token
                    //trigger event
                    this.publishTokenE( oldtoken );
                    
                    return Promise.resolve( oldtoken );
                }               

            } catch (error) {
                log.warn("Token not readable");
                fs.unlink(filename,()=>{});
            }
            
        }

        //cant load old token OR token outdated
        //request new token        
        return this.requestNewToken();
    
    }

    async verifyToken(token: IToken){

        //part1
        return await request({
            url: `https://${this.host}/oauth/validate`,
            method: 'POST',
            auth: {
                user: this.client,
                pass: this.secret
            },
            headers: {
                'User-Agent': USERAGENT,
            },
            form: {
                'token': token.access_token
            },
            resolveWithFullResponse: true
        })
        .then( (result: { statusCode: number; }) => result.statusCode==200 )
        .catch( ()=> false );    

    }


    async requestNewToken(){
        
        log.verbose("request new Token");

        let result = await request({
            url: `https://${this.host}/oauth/token`,
            method: 'POST',
            auth: {
                user: this.client,
                pass: this.secret
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
            token.outdatedAt = moment().add(token.expires_in,"seconds").subtract(1,"hour").format();
            
            this.saveTokenFile(token);
            this.createTokenRefreshTask(token); //create task for new token

            //trigger event
            this.publishTokenE( token );            

            return Promise.resolve(token);
            
        } catch (error) {
            return Promise.reject("Failed to request new Token.");
        }
    }

    saveTokenFile(token: IToken){
        let filename = this.host + ".token.json";       

        fs.writeFile(filename, JSON.stringify(token), function(err: any) {
            if(err) {
                log.warning("Token not saved.", err);
                return;
            }
            log.verbose("Token saved");
        });
    }
    
    stopTokenRefreshTask(){
        //clear existing Task
        if (this.RefreshTask){
            schedule.cancelJob(this.RefreshTask);
            log.debug("RefreshTask canceled")
        }        
    }

    createTokenRefreshTask(token: IToken){

        this.stopTokenRefreshTask();
        
        //token's max-age
        let outdatedAt = moment(token.outdatedAt).toDate();

        //create Token refresh Task
        this.RefreshTask = schedule.scheduleJob(outdatedAt, () => {
            this._token = this.requestNewToken(); //overwrite old promise with new one
        });

        log.debug("createdRefreshTask");
    }





}

