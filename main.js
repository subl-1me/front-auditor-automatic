const OperationManager = require("./src/front/OperationManager");
const MenuStackService = require("./src/services/MenuStackService");

const main = async () => {
  const operationManager = new OperationManager();
  const Menu = new MenuStackService(operationManager);
  Menu.init();

  do {
    const choice = await Menu.choiceReader();
    const handlerResponse = await Menu.choiceHandler(choice);
  } while (!Menu.isFinalized());

  console.log("app finalized");
  return;
};

main();
