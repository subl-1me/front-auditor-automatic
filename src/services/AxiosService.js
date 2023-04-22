require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const { HttpsCookieAgent } = require('http-cookie-agent/http');
const { CookieJar } = require('tough-cookie');

// Set some axios config just to make sure that
// we'll recieve authentication token
axios.default.defaults.withCredentials = true;

// ENV VARS
const { BUTTON_CONTEXT, VIEWSTATE } = process.env;

class AxiosService{
    jar = new CookieJar();
    axiosScrapping = axios.create({
        httpsAgent: new HttpsCookieAgent({
            cookies: { jar: this.jar },
            rejectUnauthorized: false
        })
    })

    /**
     * @description Creates a post request to API
     * @param {String} url Contains API_URL
     * @param {Array<*>} body Contains body params
     */
    async postRequest(url, body){
        try{
            const formData = this.setupFormData(body);
            const res = await this.axiosScrapping(url, formData);

            return res;
        }catch(err){
            console.log('An error occurs trying to login');
            return err.message;
        }
    }

    /**
     * Creates a new Form Data with body recieved
     * @param {Array<*>} body Contains data params
     * @returns Form Data
     */
    setupFormData(body){
        let formData = new FormData();
        const { username, password } = body;
        formData.append('__VIEWSTATE', VIEWSTATE);
        formData.append('ctl00$MainContent$LoginUser$LoginButton', BUTTON_CONTEXT);
        formData.append('ctl00$MainContent$LoginUser$UserName', username);
        formData.append('ctl00$MainContent$LoginUser$Password', password);

        return formData;
    }
}

module.exports = AxiosService;