class StandardError extends Error {
  constructor(errMessage, errCode, status) {
    super(errMessage);
    this.errCode = errCode;
    this.status = status;
  }
}

class FilesError extends StandardError {
  constructor(errMessage, errCode, status, errFiles) {
    super(errMessage, errCode, status);
    this.errFiles = errFiles;
  }
}

class PrinterError extends Error {
  constructor(reason, filePath) {
    super(reason);
    this.filePath = filePath;
  }
}

module.exports = {
  StandardError,
  FilesError,
  PrinterError,
};
