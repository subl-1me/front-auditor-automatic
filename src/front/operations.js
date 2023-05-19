const AxiosService = require("../services/AxiosService");
const PrinterService = require("../services/printerService");
const ConfigService = require("../services/ConfigService");
const inquirer = require("inquirer");
const fs = require("fs");
const PATH = require("path");
const ReportsByUser = require("../utils/reportsByUser");
const decompress = require("decompress");
const filesPath =
  PATH.normalize(process.env.userprofile) + "/Documents/reportes-front-temp/";

const { StandardError, PrinterError } = require("../Errors");
const { DECOMPRESS_ERROR } = require("../ErrCodes");
const FormData = require("form-data");

// extras
const Spinnies = require("spinnies");

// ENV VARS
const {
  API_URL_LOGIN,
  API_URL_REPORT,
  API_URL_REPORT_INDV,
  API_URL_AUDI_RPT_LIST,
  API_URL_AUDI_RPT,
  API_URL_COBRO_RPT_GENERATE,
  VIEWSTATE,
  BUTTON_CONTEXT,
} = process.env;

class Operations {
  axiosService = new AxiosService();
  printerService = new PrinterService();
  spinnies = new Spinnies();

  constructor() {
    this.config = ConfigService.getConfig();
    this.inquirer = inquirer;
  }

  /**
   * @description It handles the login Front 2 Go process
   * @returns {Promise<*>}
   */
  async login() {
    const userCredentials = await this.waitForCredentials();
    this.spinnies.add("spinner-1", { text: "Login..." });

    let formData = this.setupFormData(userCredentials);

    console.log(formData);
    const serviceResponse = await this.axiosService.login(formData);
    if (serviceResponse.status === "error") {
      this.spinnies.fail("spinner-1", { text: serviceResponse.errMessage });
      return serviceResponse;
    }

    const ASPXAUTH = ConfigService.parseAuthCookies(
      serviceResponse.request._header
    );
    if (!ASPXAUTH) {
      this.spinnies.fail("spinner-1", {
        text: "Contraseña o usuario invalidos.",
      });
      return {
        status: "error",
        errMessage: "Contraseña o usuario invalidos.",
      };
    }

    ConfigService.setAuthConfig({
      lastUsernameSession: userCredentials.username,
      ASPXAUTH,
    });

    this.spinnies.remove("spinner-1");
    return serviceResponse;
  }

  async getZipName(htmlData) {
    return new Promise((resolve, reject) => {
      // filter "__VIEWSTATE" string because it is very large and unnecessary
      // for this use case
      const shorterData = htmlData
        .split("\r\n")
        .filter((segment) => !segment.includes("__VIEWSTATE"));

      // we need scrap for the lastest reports.zip archive to download it
      // and start printing
      const liElementsListStrings = shorterData
        .filter((element) => element.includes("p_OpenFile.aspx"))
        .reverse();

      // in this use case the last report is in the [1] position
      const liElementToProcess = liElementsListStrings[1];
      const zipName = liElementToProcess
        .split("CECJS")
        .filter((segment) => segment.includes(".zip"))
        .pop();

      resolve("CECJS" + zipName.slice(0, zipName.length - 2));
    });
  }

  async getAuditoriaReports() {
    try {
      // console.log(`\x1b[33mBuscando último archivo de reportes...\x1b[0m`);
      this.spinnies.add("spinner-1", {
        text: "Searching for last Front reports...",
      });
      // Get html data that contains report list
      const htmlData = await this.axiosService.getRequest(
        API_URL_AUDI_RPT_LIST
      );

      // Scrap for zip name
      const zipName = await this.getZipName(htmlData);

      // Check if directory is already created
      if (!fs.existsSync(filesPath)) {
        fs.mkdir(filesPath, (err) => {
          if (err) {
            throw new Error(err.message);
          }
        });
      }

      this.spinnies.update("spinner-1", {
        text: "Downloading main file" + ` (${zipName})...`,
      });
      // download ZIP file
      const zipFile = await this.axiosService.axiosScrapping({
        url: API_URL_AUDI_RPT + zipName,
        responseType: "arraybuffer",
      });

      this.spinnies.update("spinner-1", {
        text: "Saving file...",
      });
      // decompress zip file and save in files path
      fs.writeFile(filesPath + zipName, zipFile.data, "binary", (err) => {
        if (err) {
          console.log(err);
          this.spinnies.fail("spinner-1", {
            text: "An error was occured trying to save main file.",
          });
          throw new Error(err.message);
        }
      });
      this.spinnies.update("spinner-1", { text: "Decompressing..." });
      const files = await decompress(
        filesPath + zipName,
        filesPath + "08-05-2023"
      );
      if (!files) {
        throw new StandardError(
          "An unexpected error was caugth decompressing main reports file. Try to print it manually.",
          DECOMPRESS_ERROR,
          "error"
        );
      }

      this.spinnies.update("spinner-1", { text: "File saved successfully." });
      // filter only .pdf to avoid problems with printer
      const pdfFiles = files.filter((file) => file.path.includes(".pdf"));
      const users = Object.getOwnPropertyNames(ReportsByUser);
      let printerErrors = [];
      // console.log("\x1b[33mEnviando reportes a impresora...\x1b[0m");
      this.spinnies.succeed("spinner-1");
      for (const user of users) {
        let reports = ReportsByUser[user];
        this.spinnies.add("spinner-1", { text: "Printing: " });
        for (const report of reports) {
          if (pdfFiles.filter((file) => file.path.includes(report + ".pdf"))) {
            let printerRes;
            this.spinnies.update("spinner-1", {
              text: "Printing: " + report,
            });
            printerRes = await this.printerService.print(
              filesPath + "08-05-2023/" + report + ".pdf"
            );
            if (printerRes.status !== "success") {
              console.log(`Error al imprimir`);
              printerErrors.push(printerRes);
              console.log("---");
            }
          }
        }
      }

      this.spinnies.succeed("spinner-1", {
        text: "All reports where printed successfully.",
      });
      return {
        status: "success",
        printerErrors: printerErrors,
      };
    } catch (err) {
      this.spinnies.stopAll("fail");
      return {
        status: "error",
        message: err.message,
      };
    }
  }

  /**
   * Creates a new Form Data with body recieved
   * @param {Array<*>} body Contains data params
   * @returns Form Data
   */
  setupFormData(body) {
    let formData = new FormData();
    const { username, password } = body;
    formData.append("__VIEWSTATE", VIEWSTATE);
    formData.append("ctl00$MainContent$LoginUser$LoginButton", BUTTON_CONTEXT);
    formData.append("ctl00$MainContent$LoginUser$UserName", username);
    formData.append("ctl00$MainContent$LoginUser$Password", password);

    return formData;
  }

  /**
   * @description It creates an Form Data by following an event name
   * @param {string} eventName Name of the Front operation event when user clicks a button
   */
  createFormData(eventName) {
    // set default
    let formData = new FormData();
    switch (eventName) {
      case "CobroPorOperador":
        return this.setCobroXOperadorForm(formData);
      case "CobroPorOperadorGenerator":
        return this.setCobroXOperadorFormGenerator(formData);

      default:
        return "error";
    }
  }

  setFormDataDefault(formData) {
    formData.append("_VIEWSTATE", VIEWSTATE);
    return formData;
  }

  setCobroXOperadorFormGenerator(formData) {
    const data = {
      __EVENTTARGET:
        "ctl00$ctl00$content$SingleContent$ReportViewer1$ctl10$Reserved_AsyncLoadTarget",
      ctl00$ctl00$ScriptManager1:
        "ctl00$ctl00$ScriptManager1|ctl00$ctl00$content$SingleContent$ReportViewer1$ctl10$Reserved_AsyncLoadTarget",
      ctl00$ctl00$hdnValidateDelay: "",
      ctl00$ctl00$hdnCompanyURL: "/WHS-PMS/Company.aspx",
      ctl00$ctl00$hdnCountdownMsg: "please_wait_countdown_clock",
      ctl00$ctl00$hdnOffset: "",
      ctl00$ctl00$hdnHotelDB: "",
      ctl00$ctl00$content$hdnValidateDelay: "",
      ctl00$ctl00$content$hdnCompanyURL: "",
      ctl00$ctl00$content$hdnCountdownMsg: "please_wait_countdown_clock",
      ctl00$ctl00$content$SingleContent$hdngetdate: "05/17/2023",
      ctl00$ctl00$content$SingleContent$hdnAppdate: "",
      ctl00$ctl00$content$SingleContent$hdnIsFechaBW: "0",
      ctl00$ctl00$content$SingleContent$hdnHouseCort: "",
      ctl00$ctl00$content$SingleContent$hdnErrorUserNotExist: "",
      ctl00$ctl00$content$SingleContent$hdnErrorMultiple: "",
      ctl00$ctl00$content$SingleContent$hdnErrormessage: "",
      ctl00$ctl00$content$SingleContent$HiddenField2: "",
      ctl00$ctl00$content$SingleContent$hdnReportName: "CobroPorOperador",
      ctl00$ctl00$content$SingleContent$hdnUserMultiple: "",
      ctl00$ctl00$content$SingleContent$hdnTransMultiple: "",
      ctl00$ctl00$content$SingleContent$hdncboChecKingOut: "",
      ctl00$ctl00$content$SingleContent$CBpropcode:
        "City+Express+Ciudad+Juarez",
      ctl00_ctl00_content_SingleContent_CBpropcode_ClientState: "",
      ctl00$ctl00$content$SingleContent$CFecha1: "2023-05-15",
      ctl00$ctl00$content$SingleContent$CFecha1$dateInput: "2023/05/15",
      ctl00_ctl00_content_SingleContent_CFecha1_dateInput_ClientState:
        '{"enabled":true,"emptyMessage":"","validationText":"2023-05-15-00-00-00","valueAsString":"2023-05-15-00-00-00","minDateStr":"1980-01-01-00-00-00","maxDateStr":"2099-12-31-00-00-00","lastSetTextBoxValue":"2023/05/15"}',
      ctl00_ctl00_content_SingleContent_CFecha1_calendar_SD: "[[2023,5,15]]",
      ctl00_ctl00_content_SingleContent_CFecha1_calendar_AD:
        "[[1980,1,1],[2099,12,30],[2023,5,17]]",
      ctl00_ctl00_content_SingleContent_CFecha1_ClientState: "",
      ctl00$ctl00$content$SingleContent$CFecha2: "2023-05-15",
      ctl00$ctl00$content$SingleContent$CFecha2$dateInput: "2023/05/15",
      ctl00_ctl00_content_SingleContent_CFecha2_dateInput_ClientState:
        '{"enabled":true,"emptyMessage":"","validationText":"2023-05-15-00-00-00","valueAsString":"2023-05-15-00-00-00","minDateStr":"1980-01-01-00-00-00","maxDateStr":"2099-12-31-00-00-00","lastSetTextBoxValue":"2023/05/15"}',
      ctl00_ctl00_content_SingleContent_CFecha2_calendar_SD: "[[2023,5,15]]",
      ctl00_ctl00_content_SingleContent_CFecha2_calendar_AD:
        "[[1980,1,1],[2099,12,30],[2023,5,17]]",
      ctl00_ctl00_content_SingleContent_CFecha2_ClientState: "",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl03$ctl00: "",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl03$ctl01: "",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl11: "ltr",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl12: "standards",
      ctl00$ctl00$content$SingleContent$ReportViewer1$AsyncWait$HiddenCancelField:
        "False",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ToggleParam$store: "",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ToggleParam$collapse:
        "false",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl06$ctl03$ctl00: "",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl06$ctl00$CurrentPage:
        "",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl09$ClientClickedId: "",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl08$store: "",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl08$collapse: "false",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl10$VisibilityState$ctl00:
        "None",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl10$ScrollPosition: "",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl10$ReportControl$ctl02:
        "",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl10$ReportControl$ctl03:
        "",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl10$ReportControl$ctl04:
        "100",
      __EVENTARGUMENT: "",
      __VIEWSTATE:
        "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",
      __VIEWSTATEGENERATOR: "88DDBFBF",
      __ASYNCPOST: "true",
    };

    let formDataTemp = new FormData();
    const dataEntries = Object.getOwnPropertyNames(data);
    dataEntries.forEach((entry) => {
      formDataTemp.append(entry, data[entry]);
    });
    return formDataTemp;
  }

  setCobroXOperadorForm(formData) {
    let data = {
      __EVENTTARGET: "ctl00$ctl00$content$SingleContent$btnObtenerReporte",
      ctl00$ctl00$hdnCompanyURL: "/WHS-PMS/Company.aspx",
      ctl00$ctl00$hdnCountdownMsg: "please_wait_countdown_clock",
      ctl00$ctl00$content$hdnCountdownMsg: "please_wait_countdown_clock",
      ctl00$ctl00$content$SingleContent$hdngetdate: "05/17/2023",
      ctl00$ctl00$content$SingleContent$hdnIsFechaBW: "0",
      ctl00$ctl00$content$SingleContent$hdnReportName: "CobroPorOperador",
      ctl00$ctl00$content$SingleContent$CBpropcode:
        "City+Express+Ciudad+Juarez",
      ctl00$ctl00$content$SingleContent$CFecha1: "2023-05-15",
      ctl00$ctl00$content$SingleContent$CFecha1$dateInput: "2023/05/15",
      ctl00_ctl00_content_SingleContent_CFecha1_dateInput_ClientState:
        '{"enabled":true,"emptyMessage":"","validationText":"2023-05-15-00-00-00","valueAsString":"2023-05-15-00-00-00","minDateStr":"1980-01-01-00-00-00","maxDateStr":"2099-12-31-00-00-00","lastSetTextBoxValue":"2023/05/15"}',
      ctl00_ctl00_content_SingleContent_CFecha1_calendar_SD: "[[2023,5,15]]",
      ctl00_ctl00_content_SingleContent_CFecha1_calendar_AD:
        "[[1980,1,1],[2099,12,30],[2023,5,17]]",
      ctl00$ctl00$content$SingleContent$CFecha2: "2023-05-15",
      ctl00$ctl00$content$SingleContent$CFecha2$dateInput: "2023/05/15",
      ctl00_ctl00_content_SingleContent_CFecha2_dateInput_ClientState:
        '{"enabled":true,"emptyMessage":"","validationText":"2023-05-15-00-00-00","valueAsString":"2023-05-15-00-00-00","minDateStr":"1980-01-01-00-00-00","maxDateStr":"2099-12-31-00-00-00","lastSetTextBoxValue":"2023/05/15"}',
      ctl00_ctl00_content_SingleContent_CFecha2_calendar_SD: "[[2023,5,15]]",
      ctl00_ctl00_content_SingleContent_CFecha2_calendar_AD:
        "[[1980,1,1],[2099,12,30],[2023,5,17]]",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl11: "ltr",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl12: "standards",
      ctl00$ctl00$content$SingleContent$ReportViewer1$AsyncWait$HiddenCancelField:
        "False",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ToggleParam$collapse:
        "false",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl08$collapse: "false",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl10$VisibilityState$ctl00:
        "None",
      ctl00$ctl00$content$SingleContent$ReportViewer1$ctl10$ReportControl$ctl04:
        "100",
      __VIEWSTATE:
        "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",
      __VIEWSTATEGENERATOR: "88DDBFBF",
    };

    let formDatTemp = new FormData();
    const dataEntries = Object.getOwnPropertyNames(data);
    dataEntries.forEach((entry) => {
      formDatTemp.append(entry, data[entry]);
    });

    console.log(formDatTemp);
    return formDatTemp;
  }

  async generateReport(reportName) {
    //TODO: Create a report mapping function
    const generableReports = ["Cobro por operador"];
    if (!generableReports.includes(reportName)) {
      throw new Error("Invalid report name");
    }

    const formData = this.createFormData("CobroPorOperador");
    const serviceResponse = await this.axiosService.postRequest(
      API_URL_COBRO_RPT_GENERATE,
      formData
    );

    // console.log(serviceResponse);
    const formDataGenerator = this.createFormData("CobroPorOperadorGenerator");
    const serviceResponse2 = await this.axiosService.postRequest(
      API_URL_COBRO_RPT_GENERATE,
      formDataGenerator
    );

    console.log(serviceResponse2.data);

    return {
      status: "success",
    };
    // const htmlElementReportId = htmlSegments.filter((segment) =>
    //   segment.includes("ReportSession")
    // );
    // console.log(htmlSegments);
  }

  async getCobroPorOperadorReport() {
    const reportId = await this.generateReport("Cobro por operador");
    return reportId;
  }

  /**
   * @description It handles two files to download
   * @returns
   */
  async getCorteReport() {
    try {
      let promises = [];
      promises.push(
        await this.axiosService.getRequestDownload(
          API_URL_REPORT + "=" + this.config.lastUsernameSession + "|AND;",
          "rpt_cajeros"
        )
      );
      promises.push(
        await this.axiosService.getRequestDownload(
          API_URL_REPORT_INDV + "=" + this.config.lastUsernameSession + "|AND;",
          "rpt_cajeroindividual"
        )
      );

      const filesPathsList = await Promise.all(promises)
        .then((responses) => {
          const errors = responses.filter(
            (response) => response.status === "error"
          );
          if (errors.length > 0) {
            return {
              status: "error",
              errors: errors,
            };
          }
          return responses.map((response) => response.filePath);
        })
        .catch((err) => {
          return {
            status: "error",
            errMessage: err.message,
          };
        });

      if (filesPathsList.status === "error") {
        return {
          status: "error",
          errMessage: filesPathsList.errMessage,
          errors: filesPathsList.errors,
        };
      }

      console.log("----");
      let printerPromises = [];
      for (let path of filesPathsList) {
        path = PATH.normalize(path);
        printerPromises.push(await this.printerService.print(path));
      }

      const printerResponses = await Promise.all(printerPromises);
      return {
        status: "success",
        printerRes: printerResponses,
      };
    } catch (err) {
      return err;
    }
  }

  /**
   * @description An inquirer prompt to let users input theirs credentials
   * @returns
   */
  async waitForCredentials() {
    // console.clear();
    const questionList = [
      {
        type: "input",
        name: "username",
        message: "Ingresa tu nombre de usuario:",
      },
      {
        type: "password",
        name: "password",
        message: "Ingresa tu contraseña:",
      },
    ];

    const input = await this.inquirer.prompt(questionList);
    return {
      username: input.username,
      password: input.password,
    };
  }
}

module.exports = Operations;

// /**
//  * @description Login
//  * @param {String} Username User's username
//  * @param {String} Password Users' password
//  * @returns ASPXAUTH token
//  */
// const login = async(username, password) => {
//     //TODO: Create a body validator
//     if(!username || !password){
//         return 'Username or password cannot be undefined'
//     }

//     try{
//         const serviceResponse = await AxiosServiceInstance.postRequest(API_URL_LOGIN, { username, password });
//         if(!serviceResponse){
//             console.log('Invalid username or password');
//             return;
//         }

//         console.log('Authorized succcessfully');
//         return serviceResponse;
//     }catch(err){
//         console.log('Something went wrong in login function');
//         return err.message;
//     }
// }

// module.exports = {
//     login
// }
