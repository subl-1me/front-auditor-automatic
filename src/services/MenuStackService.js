const MenuStack = require("../menu/MenuStack");
const ConfigService = require("../services/ConfigService");

class MenuStackService {
  MenuStack = new MenuStack();
  config = {};

  constructor(operationManager) {
    this.operationManager = operationManager;
    this.config = ConfigService.getConfig();
  }

  /**
   * Adds a new menu to stack
   * @param {string} menu Menu name to push in stack
   */
  add(menu) {
    this.MenuStack.push(menu);
  }

  /**
   * @description Initialize "Home" menu by default
   */
  init() {
    this.add("Home"); // default
  }

  /**
   * Check if credential's session are stored in global config service
   * @returns {boolean}
   */
  isUserAuthenticated() {
    return this.config.lastUsernameSession && this.config.ASPXAUTH;
  }

  /** Make some step validations before star proccessing user's choice
   * Check user's choice
   * @param {String} choice User's choice to verify
   * @returns {Promise<array>}
   */
  async choiceHandler(choice) {
    if (choice === "Volver" || choice === "Exit") {
      console.clear();
      this.MenuStack.pop(); // remove menu from stack in both cases
      return;
    }

    // Check auth after start menu navigation
    if (choice !== "Iniciar Sesion" && !this.isUserAuthenticated()) {
      console.clear();
      console.log(
        "\x1b[33mInicia sesión antes de realizar cualquier acción.\x1b[0m"
      );

      return;
    }

    const module = await this.operationManager.performOperation(choice);
    if (module === "categories" || module === "subCategory") {
      this.add(choice); // Push another menu
      return;
    }

    // If choice gets here, it means the choice is
    // an action or final step at the same time
    // Confirm choice first
    const isConfirm = await this.confirmChoice();
    if (!isConfirm) {
      this.MenuStack.pop();
      // console.clear();
      return;
    }

    // otherwise manager must handle the action/operation selected by user
    const responseHandler = await this.operationManager.handleAction(choice);
    this.MenuStack.pop(); // remove confirm menu
    return;
  }

  isFinalized() {
    return this.MenuStack.isEmpty();
  }

  async confirmChoice() {
    this.add("Confirmar");
    return await this.choiceReader();
  }

  async choiceReader() {
    const currentMenu = this.MenuStack.peek();
    const input = await currentMenu.waitForChoice();
    return input;
  }
}

module.exports = MenuStackService;
