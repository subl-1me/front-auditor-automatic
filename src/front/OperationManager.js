const Operations = require("../front/operations");
const MenuSchema = require("../Schemas/menu.schema");
const responseHandler = require("./operationResponseHandler");

// Operation Manager class is responsible for managing the Operation Class' methods
class OperationManager {
  /*
    Operation Manager class handles the Operation's methods by giving
    an interfaz to interact with business logic

    Atributtes:
      - frontOperationsInstance: An instance from Operations Class to interact with business logic.
    
    Methods:
      - performOperation: It gets the result of the operation provided by the "action argument" 
  */

  frontOperationsInstance;

  constructor() {
    this.frontOperationsInstance = new Operations();
  }

  /**
   * Gets the result of operation/action provided by an argument
   * @param {String} action A menu's choice
   */
  async performOperation(action) {
    let operationRes;
    switch (action) {
      case "Iniciar Sesion":
        operationRes = await this.frontOperationsInstance.login();
        return responseHandler(operationRes);
      case "Corte":
        operationRes = await this.frontOperationsInstance.getCorteReport();
        return responseHandler(operationRes);
      case "Auditoria":
        operationRes = await this.frontOperationsInstance.getAuditoriaReports();
        return responseHandler(operationRes);
      case "Cobro por operador":
        operationRes =
          await this.frontOperationsInstance.getCobroPorOperadorReport();
        return responseHandler(operationRes);
    }
  }

  /**
   * Determinates the type of property that corresponds to the user's choice by comparing
   * it with the Menu Schema
   * @param {String} choice Option to verify.
   * @returns The property type ("category", "subCategory", "action") or an 'invalid' string
   */
  getChoiceModule(choice) {
    const MenuSchemaProperties = Object.keys(MenuSchema);
    const module = MenuSchemaProperties.find((prop) => {
      if (
        MenuSchema.hasOwnProperty(prop) &&
        MenuSchema[prop].includes(choice)
      ) {
        return true;
      }
    });

    if (!module) {
      //TODO: Add an error handler
      return "invalid";
    }

    return module;
  }
}

module.exports = OperationManager;
