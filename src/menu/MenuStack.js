const MenuFactoryManager = require("./MenuFactoryManager");

const validTypes = ["Home", "Reportes", "Confirmar"];

class MenuStack {
  factoryManager = new MenuFactoryManager();

  constructor() {
    this.menus = [];
  }

  push(menuType) {
    try {
      this.menus.push(this.factoryManager.createMenuInstance(menuType));
    } catch (err) {
      throw new Error(err.message);
    }
  }

  pop() {
    if (this.isEmpty()) {
      throw new Error("Menu Stack is already empty");
    }
    this.menus.pop();
  }

  isEmpty() {
    return this.menus.length === 0;
  }

  peek() {
    // if(this.menus.length === 1) { return this.menus[0] }
    return this.menus[this.menus.length - 1];
  }
}

module.exports = MenuStack;
