const AxiosService = require('../services/AxiosService')
const AxiosServiceInstance = new AxiosService();

// ENV VARS
const { API_URL_LOGIN } = process.env;

/**
 * @description Login
 * @param {String} Username User's username
 * @param {String} Password Users' password
 * @returns ASPXAUTH token
 */
const login = async(username, password) => {
    //TODO: Create a body validator
    if(!username || !password){
        return 'Username or password cannot be undefined'
    }

    const body = { username, password }
    try{
        const serviceResponse = await AxiosServiceInstance.postRequest(API_URL_LOGIN, body);
        console.log(serviceResponse);

        return 'AUTHORIZED';
    }catch(err){
        console.log('Something went wrong in login function');
        return err.message;
    }
}

module.exports = {
    login
}