require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const { HttpsCookieAgent } = require('http-cookie-agent/http');
const { CookieJar } = require('tough-cookie');

//TODO: Make other service for axios an make http request from there

// Set some axios config just to make sure
// we'll recieve authenticacion credentials
axios.default.defaults.withCredentials = true;

const { API_URL_LOGIN } = process.env;

class AxiosFrontService{
    jar = new CookieJar();
    axiosScraping = axios.create({
        httpsAgent: new HttpsCookieAgent({
            cookies: { jar: this.jar },
            rejectUnauthorized: false, // API doesn't use secure protocol
        })
    })

    /**
     * @description Make an Http Post Request to authenticate user
     * @param {Array<*>} body Contains user credentials
     * such a username and password
     * @returns {Promise<String>} APSNET authentication token
     */
    async login(body){
        //TODO: Implement a body validator
        try{
            const data = this.setupAuthData(body);
            const res = await this.axiosScraping.post(API_URL_LOGIN, data);
            return res;
        }catch(err){
            console.log('An error occurs trying to login');
            return err;
        }
    }


    setupAuthData(body){
        const { username, password } = body;
        //TODO: Make a body validator
        let authData = new FormData();
        authData.append('__VIEWSTATE', 'MsWi2YESAch8QFyJ8ArIGgsD9rfu0giqA8ZOmKPO74bbDXgANquKEU8Ee81zgar1YDjBaWknrCPLrRyTihsDT6iQ8zheRm9V1mXIQbGmARMeCpk/EzdsABrB6ycaB7LMVagAmNqMuchWQVtoAKFCOpcc3imIGu2FBwiB1wh0SsuqcgPsOoqgpApC3Kf6L/nUOx4as0D+xJh2GnSWIMh6W6y78jLqdl2TayNd5cbn/pre4gB9oADMoW4/lwf7h1ALjWwQZq1geXlpD+EZPrjprOubonNFKwQcq8EyazfzvyMBhtvLBhxGKuJLIK0ADJmE43UnZvKy/vQDIM3oFivy1YFCmxoh56UUBl0hjSkfLinu7dDnXOMUD0jzJzVS/WQ4');
        authData.append('ctl00$MainContent$LoginUser$LoginButton', 'login');
        authData.append('ctl00$MainContent$LoginUser$UserName', username);
        authData.append('ctl00$MainContent$LoginUser$Password', password);
        console.log(body);
        return authData;
    }
}

module.exports = AxiosFrontService;