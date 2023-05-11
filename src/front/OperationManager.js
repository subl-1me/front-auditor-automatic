const Operations = require("../front/operations");
const MenuSchema = require("../Schemas/menu.schema");

class OperationManager {
  frontOperations = new Operations();

  constructor() {}

  /**
   * It handles the action
   * @param {String} action A menu's choice
   */
  async handleAction(action) {
    let operationRes;
    switch (action) {
      case "Iniciar Sesion":
        operationRes = await this.frontOperations.login();
        if (operationRes.status === "error") {
          console.clear();
          console.log(`\x1b[33mError al intentar iniciar sesión:\x1b[0m`);
          this.printErrorMessage(operationRes.errMessage);
          return "error";
        }

        return "success";
      case "Corte":
        operationRes = await this.frontOperations.getCorteReport();
        if (operationRes.errMessage) {
          console.log(
            `\x1b[33mOcurrió un error al tratar de imprimir reporte:\x1b[0m`
          );
          this.printErrorMessage(operationRes.errMessage);
        }

        if (operationRes.errors) {
          console.log(
            `\x1b[33mOcurrieron los siguientes errores durante la ejecución:\x1b[0m`
          );

          const { errors } = operationRes;
          console.log("---");
          errors.forEach((error) => {
            console.log(error.errMessage);
          });
          console.log("---");
        }

        return "success";

      case "Auditoria":
        console.clear();
        operationRes = await this.frontOperations.getAuditoriaReports();
        if (operationRes.errMessage) {
          console.log(`\x1b[33mOcurrió un error de autenticacion:\x1b[0m`);
          this.printErrorMessage(operationRes.errMessage);
        }
        return "success";
      case "Cobro por operador":
        console.clear();
        operationRes = await this.frontOperations.getCobroPorOperadorReport();
        console.log(operationRes);
        if (operationRes.errMessage) {
          console.log(
            `\x1b[33mOcurrió un error al intentar descargar el reporte:\x1b[0m`
          );
          this.printErrorMessage(operationRes.errMessage);
        }
        return "success";
    }
  }

  printErrorMessage(message) {
    if (
      message ===
      "Client network socket disconnected before secure TLS connection was established"
    ) {
      console.log(`\x1b[31mNo hay conexión a Internet.\x1b[0m`);
      return;
    }
    console.log(`\x1b[31m${message}\x1b[0m`);
    console.log("----------------");
  }

  /**
   * It checks if the choice corresponds to category/sub-category/action
   * @param {String} choice
   * @returns null | Menu's module
   */
  choiceVerificator(choice) {
    const MenuSchemaProperties = Object.keys(MenuSchema);
    const module = MenuSchemaProperties.filter((prop) => {
      if (MenuSchema[prop].includes(choice)) {
        return prop;
      }
    }).pop();

    if (!module) {
      throw new Error("An invalid module type was caugth");
    }

    return module;
  }
}

module.exports = OperationManager;
