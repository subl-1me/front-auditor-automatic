const { Home, Reports, Confirm } = require('./Menu');

/**
 * @returns It handles the creation of menus' instances
 */
class MenuFactory{
    constructor(){}

    /**
     * 
     * @param {string} type The type of menu that the user is currently in
     * @returns A new instance of menu type provided
     */
    createMenu(type){
        if(typeof type !== 'string') {
            throw new Error(`Menu type must be a STRING. Recieved: ${typeof type}`);
        }

        switch(type){
            case 'Home':
                return new Home();
            case 'Reportes':
                return new Reports();
            case 'Confirmar':
                return new Confirm();
            default:
                throw new Error(`Invalid menu type was caught: ${type}`)
        }
    }
}

module.exports = MenuFactory;
