const operations = require('./src/front/operations');
const Menu = require('./src/menu/menu');
const MenuInstance = new Menu();

const main = async() => {
    // const option = await selectOption();
    // console.log(option);
    // const result = await operations.login('HTJUGALDEA', 'UGALDE3312-');
    // console.log('Login operation was completed with the following result');
    // console.log(result);
    // try{
    //     const menuResponse = Object.values(await menuModule(questions))[0];
    //     console.log(menuResponse);
    // }catch(err){
    //     console.log(err);   
    // }

    console.log('Front 2 go AUDIT');
    const res = await MenuInstance.home();
    const res2 = await MenuInstance.reports();    
    const res3 = await MenuInstance.confirm('Are you sure you got cash?');
    console.log(res, res2, res3);
}

const menuModule = async(questions) => {
    const response = await inquirer.prompt(questions);
    console.log(response.menuDecision);
    return;
}

const inputChecker = (input) => {
    if(!Number(input)){
        return {
            status: 'error',
            errMessage: 'Ingrese una opcion valida'
        }
    }
}

main();