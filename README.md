# Introduction

The library is useful for incorporating API Token Lifecycle Management into a project by preventing the use of a pre-generated token.


## Install

```bash
npm install --save "git+https://github.com/werty1st/node-zdf-api-client.git#2.0.1"
```

The module will be installed and added to the package.json.



## Usage Example

- First copy the *.npmrc_default* of this Repository to *.npmrc* in your Project's root directory **or** ensure otherwise to set the API environment variables. ❗Don't forget to add .npmrc to .gitignore.❗

- Load the Module and initialize it.
```javascript
const ZDFApi = require('node-zdf-api-client');

const API_CLIENT = process.env.apiclient;
const API_SECRET = process.env.apisecret;
const API_HOST   = process.env.apihost;

const zdfapi = new ZDFApi(API_CLIENT, API_SECRET, API_HOST);
```

- Add the authentication token to the request.
```javascript
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
```

- For batch Tasks the Token is writte to the filesystem. This prevents the API Client to request a new token each time. You may want to exclude this file (**API_HOST.token.json**) from git too.

## Optional

- For long running Tasks the API Client schedules a Token refresh Task. This can be turned off by calling:
```javascript
zdfapi.once("token-ready",zdfapi.stopTokenRefreshTask);
```


# Test

```bash
npm test
```

![Run test output](test.gif)
