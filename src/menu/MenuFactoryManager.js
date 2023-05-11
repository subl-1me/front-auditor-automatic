const MenuFactory = require("./MenuFactory");

class MenuFactoryManager {
  factory = new MenuFactory();

  constructor() {}

  createMenuInstance(menuType) {
    return this.factory.createMenu(menuType);
  }
}

module.exports = MenuFactoryManager;
