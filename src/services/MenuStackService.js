const MenuStack = require("../menu/MenuStack");
const ConfigService = require("../services/ConfigService");

class MenuStackService {
  MenuStack = new MenuStack();
  config = {};

  constructor(operationManager) {
    this.operationManager = operationManager;
    this.config = ConfigService.getConfig();
  }

  add(menuType) {
    this.MenuStack.push(menuType);
  }

  /**
   * @description Initialize "Home" menu and makes the first menu input request
   * @returns {Promise<string>} User's choice (see the Menu Schema)
   */
  async init() {
    this.add("Home"); // default
    const currentMenu = this.MenuStack.peek();
    const choice = await currentMenu.waitForChoice();
    return choice;
  }

  /** Make some step validations before star proccessing user's choice
   * Check user's choice
   * @param {*} choice
   * @returns
   */
  async choiceHandler(choice) {
    if (choice === "Volver" || choice === "Exit") {
      console.clear();
      this.MenuStack.pop();
      return;
    }

    // Check if the user is already authenticated
    // if user select an option different from Log in
    if (
      choice !== "Iniciar Sesion" &&
      !this.config.lastUsernameSession &&
      !this.config.ASPXAUTH
    ) {
      // console.clear();
      console.log(
        "\x1b[31mInicia sesión antes de realizar cualquier acción.\x1b[0m"
      );

      return;
    }

    const module = await this.operationManager.choiceVerificator(choice);
    if (module === "categories" || module === "subCategory") {
      this.add(choice);
      return;
    }

    // If choice gets here, it means the choice is
    // an action or final step at the same time
    // Confirm choice first
    const confirm = await this.confirmChoice();
    if (!confirm) {
      this.MenuStack.pop();
      // console.clear();
      return;
    }

    // otherwise manager must handle the action/operation selected by user
    const responseHandler = await this.operationManager.handleAction(choice);
    this.MenuStack.pop(); // remove confirm menu
    return;
  }

  isUserAuthenticated() {
    const currentMenu = this.MenuStack.peek();
  }

  isFinalized() {
    return this.MenuStack.isEmpty();
  }

  async confirmChoice() {
    this.add("Confirmar");
    const confirm = await this.waitForChoice();
    return confirm;
  }
}

module.exports = MenuStackService;
