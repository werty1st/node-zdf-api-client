const request = require("request-promise-native");
const assert = require('assert');

const ZDFApi = require('../api.js');

const API_CLIENT = process.env.apiclient;
const API_SECRET = process.env.apisecret;
const API_HOST   = process.env.apihost;

const zdfapi = new ZDFApi(API_CLIENT, API_SECRET, API_HOST);

//stop refresh task
zdfapi.once("token-ready",zdfapi.stopTokenRefreshTask);


describe('get zdfapi token', function () {

    it('should get an API token', function () {
        return zdfapi.token; //return the promise
    });

});


describe('use zdfapi token', function () {

    it('should successfully call the api', async function () {
        this.timeout(5000);

        /**
         * generic download function returns JSON
         */
        async function downloadUrl(url){
            
            const token = await zdfapi.token;
            
            return request({
                url: url,
                method: 'GET',
                headers: {
                    'Api-Auth': `bearer ${token.access_token}`,
                    'Accept': "application/vnd.de.zdf.v1.0+json;charset=utf-8"
                },
                resolveWithFullResponse: true
            });

        }

        const brandlist = ["c78223ab-14bd-3950-adeb-e5b0c7b0f049"]; //news

        const result = await downloadUrl(`https://${API_HOST}/cmdm/epg/broadcasts?brands=${brandlist}&tvServices=ZDF&limit=1&page=1&order=asc&onlyCompleteBroadcasts=false&profile=teaser`);

        assert(result.statusCode == 200, "API call failed");
    });



});