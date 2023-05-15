const inquirer = require("inquirer");
const ConfigService = require("../services/ConfigService");

class Menu {
  config = {};

  constructor(type) {
    this.type = type;
    this.inquirer = inquirer;
    this.config = ConfigService.getConfig();
  }
}

class Home extends Menu {
  constructor() {
    super("Home");
  }

  async waitForChoice() {
    try {
      console.log("----------------");
      if (!this.config.lastUsernameSession) {
        console.log(`Front 2 Go TOOLS (Sin sesión)`);
      } else {
        console.log(`Front 2 Go TOOLS (${this.config.lastUsernameSession})`);
      }
      console.log("----------------");
      const list = [
        {
          type: "list",
          name: "menuDecision",
          message: "Elije una opcion:",
          choices: [
            "Iniciar Sesion",
            "Revisar PIT",
            "Auditoria",
            "Reportes",
            new inquirer.Separator(),
            "Exit",
          ],
        },
      ];

      const input = await this.inquirer.prompt(list);
      return input.menuDecision;
    } catch (err) {
      console.log(err);
    }
  }
}

class Reports extends Menu {
  constructor() {
    super("Reportes");
  }

  async waitForChoice() {
    const questionList = [
      {
        type: "list",
        name: "reportSelect",
        message: "Elija un tipo de reporte:",
        choices: [
          "Corte",
          "Cobro por operador",
          "Auditoria",
          "Ama de llaves",
          new inquirer.Separator(),
          "Volver",
        ],
      },
    ];
    const input = await this.inquirer.prompt(questionList);

    return input.reportSelect;
    // const input = await this.inquirer.prompt(questionList);
    // if (input.reportSelect === 'Volver') { return '' }
  }
}

class Confirm extends Menu {
  constructor() {
    super("Confirmar");
  }

  async waitForChoice() {
    const questionList = [
      {
        type: "confirm",
        name: "confirm",
        message: "Confirmar?",
        choices: ["Si", "No"],
      },
    ];

    const response = await this.inquirer.prompt(questionList);
    return response.confirm;
  }
}

module.exports = { Home, Reports, Confirm };
