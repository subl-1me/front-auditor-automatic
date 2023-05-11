const OperationManager = require("./src/front/OperationManager");
const MenuStackService = require("./src/services/MenuStackService");

const main = async () => {
  const operationManager = new OperationManager();
  const Menu = new MenuStackService(operationManager);

  do {
    const response = await Menu.waitForChoice();
    await Menu.choiceHandler(response);
  } while (!Menu.isFinalized());

  console.log("app finalized");
  return;
};

main();
