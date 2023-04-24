const inquirer = require('inquirer');

/**
 * @description Handles the creation of menus to handle user's responses
 */
class Menu{
    questionsList = [];

    constructor(){
        this.inquirer = inquirer;
    }

    /**
     * @description Creates a new home/principal menu to user
     * @returns {Promise<string>} An user's response
     * 
     */
    async home(){
        const list = [
            {
                type: 'list',
                name: 'menuDecision',
                message: 'What do you want to do?',
                choices: [
                        'Check pit',
                        'Aud',
                        'Reports',
                        new inquirer.Separator(),
                        'Exit'
                ]
            }
        ]

        const response = await this.inquirer.prompt(list);
        return response.menuDecision;
    }

    /**
     * @description Creates a new menu to handle API reports
     * @returns {Promise<String>} An user's response
     */
    async reports(){
        const list = [
            {
                type: 'list',
                name: 'reportsDecision',
                message: 'Choose an option',
                choices: [
                    'Print cobro x operador',
                    'Print cashier summary',
                    "Print report de ama de llaves",
                    "Print audit reports",
                    new inquirer.Separator(),
                    "Return"
                ]
            }
        ]

        const response = await this.inquirer.prompt(list);
        return response.extraDecision;
    }

    /**
     * @description Creates a confirm menu
     * @param {string} message A message to print to check if user is sure of his response
     * @returns {Promise<String>} An user's response
     */
    async confirm(message){
        const list = [
            {
                type: 'confirm',
                name: 'confirmDecision',
                message: message,
                choices: [ 'Yes', 'No' ]
            }
        ]

        const response = this.inquirer.prompt(list);
        return response.confirmDecision;
    }
}

module.exports = Menu;