"use strict";

const request = require('request-promise-native');
const fs = require('fs');
const moment = require("moment");
const schedule = require('node-schedule');
const EventEmitter = require('events');

const winston = require('winston');

const log = new (winston.Logger)({
    exitOnError: true,
    transports: [
      new (winston.transports.Console)({colorize: true, level: process.env.logLevel || "error" })
    ]
  });

const USERAGENT = process.env.npm_package_config_useragent || "nodejs - node-zdf-api-client";


class ZDFApi extends EventEmitter {

    constructor(client, secret, apihost){
        super();

        this.api = {
            client: client,
            secret: secret
        };

        this.api.host = apihost;

        //try restore from file
        this.api.token = this.loadTokenFile(); //retuns promise
    }

    //event version
    publishTokenE(token){
        this.emit("token-ready",token);
    }

    //getter version
    get token(){
        return this.api.token; //return token promise
    }

    


    async loadTokenFile(){
        const api = this.api;
        let filename = api.host + ".token.json";
        let oldtokenstring = "";
        let oldtoken = false, oldtokenvalid = false;

        if (fs.existsSync(filename)){
        
            //have old token but verify it
            log.verbose("Using cached Token");
            try {

                oldtokenstring = fs.readFileSync(filename);
                oldtoken = JSON.parse(oldtokenstring);                

            } catch (error) {
                log.warn("Token not readable");
                fs.unlink(filename);
            }
            
            oldtokenvalid = await this.verifyToken( oldtoken );

            if (oldtokenvalid === true) {
                log.verbose("cached Token is valid");
                
                //token valid return resolved promise
                this.createTokenRefreshTask( oldtoken ); //create task for old token
                //trigger event
                this.publishTokenE( oldtoken );
                
                return Promise.resolve( oldtoken );
            }               
        }

        //cant load old token OR token outdated
        //request new token        
        return this.requestNewToken();
    
    }

    async verifyToken(token){
        const api = this.api;

        //part1
        return await request({
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
        .then( result => result.statusCode==200 )
        .catch( ()=> false );    

    }


    async requestNewToken(){
        const api = this.api;
        
        log.verbose("request new Token");

        let result = await request({
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

    saveTokenFile(token){
        const api = this.api;
        let filename = api.host + ".token.json";       

        fs.writeFile(filename, JSON.stringify(token), function(err) {
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

    createTokenRefreshTask(token){
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


