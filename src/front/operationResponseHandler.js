const responseHandler = (response) => {
  const { message, status, errCode, printerErrors } = response;
  if (printerErrors && printerErrors.length > 0) {
    console.log(
      `\x1b[31mLos siguientes archivos no pudieron ser impresos:\x1b[0m`
    );
    printerErrors.forEach((error) => {
      console.log(`${error.response.filePath}`);
      console.log(`\x1b[33mReason: ${error.response.reason}\x1b[0m`);
      console.log("---");
    });
  }

  if (status === "success") {
    console.log(`\x1b[32m${message}\x1b[0m`);
  }

  if (status === "error") {
    console.log(`\x1b[31m${message} (code:${errCode})\x1b[0m`);
  }

  if (status === "informative") {
    console.log(`\x1b[33m${message} (code:${errCode})\x1b[0m`);
  }

  return;
};

module.exports = responseHandler;
