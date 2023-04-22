const operations = require('./src/front/operations');
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

const main = async() => {
    // const option = await selectOption();
    // console.log(option);
    const result = await operations.login('HTJUGALDEA', 'UGALDE3312-');
    console.log('Login operation was completed with the following result');
    console.log(result);
    return;
    
}

const selectOption = () => {
    return new Promise((resolve, reject) => {
        while(true){
            console.log("FRONT 2 GO OPERATIONS");
            console.log("----------------------");
            console.log('1. Iniciar sesion/Login');
            console.log('2. Imprimir reportes/Print docs');
            console.log('3. Revisar pit/Check pit');
            console.log('4. Correr auditoria/Run auditory')
            console.log('5. Facturacion/Bills');
            console.log('0. Salir/Exit');
            console.log("----------------------");
            readline.question('Elija una opcion:', (input) => {
                console.log(`You selected option: ${input}`);
                const inputValidator = inputChecker(input);
                if(inputValidator.status === 'success'){
                    resolve(input);
                }
                readline.close();
            })
        }
    })
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