require("dotenv").config();
const axios = require("axios");
const FormData = require("form-data");
const { HttpsCookieAgent } = require("http-cookie-agent/http");
const { CookieJar } = require("tough-cookie");
const ConfigService = require("./ConfigService");
const fs = require("fs");
const path = require("path");
const reportNames = require("../utils/reportsByUser");
const AdmZip = require("adm-zip");
const decompress = require("decompress");
const filesPath =
  path.normalize(process.env.userprofile) + "/Documents/reportes-front-temp/";

// Set some axios config just to make sure that
// we'll recieve authentication token
axios.default.defaults.withCredentials = true;

// ENV VARS
const { BUTTON_CONTEXT, VIEWSTATE, API_URL_REPORT, API_URL_AUDI_RPT } =
  process.env;

class AxiosService {
  jar = new CookieJar();
  axiosScrapping = axios.create({
    httpsAgent: new HttpsCookieAgent({
      cookies: {
        jar: this.jar,
      },
      rejectUnauthorized: false,
    }),
  });

  /**
   * @description Creates a post request to API
   * @param {String} url Contains API_URL
   * @param {Array<*>} body Contains body params
   */
  async postRequest(url, body) {
    //TODO: Add this to the end of the report URL: =HTJUGALDEA|AND
    try {
      let formData;
      formData = this.setupFormData(body);

      const res = await this.axiosScrapping.post(url, formData);
      const ASPXAUTH = ConfigService.parseAuthCookies(res.request._header);
      if (!ASPXAUTH) {
        return {
          status: "error",
          errMessage: "Contraseña o usuario invalidos.",
        };
      }

      ConfigService.setAuthConfig({
        lastUsernameSession: body.username,
        ASPXAUTH,
      });

      return "success";
    } catch (err) {
      return {
        status: "error",
        errMessage: err.message,
      };
    }
  }

  /**
   * @description It makes a get request to Front 2 Go API
   * @param {String} url Front endpoint
   * @throws An http error
   */
  async getRequest(url) {
    const res = await this.axiosScrapping({
      url: url,
      headers: {
        Cookie:
          ".ASPXAUTH=" +
          ConfigService.ConfigInstance.getConfig().ASPXAUTH +
          "; " +
          "ASP.NET_SessionId=5ag503ou0yg1tjhrbwmsi1x0",
      },
    });

    const responseHeader = res.request._header;
    const isTokenExpired = responseHeader.includes(
      "/WHS-PMS/Account/Login.aspx"
    );

    if (isTokenExpired) {
      return {
        status: "error",
        errMessage: "Sesión expirada. Vuelva a ingresar sesión.",
      };
    }

    return {
      status: "success",
      htmlData: res.data,
    };
    const resSegments = res.data.split("\r\n");

    // first remove an insane value code
    const shortRes = resSegments.filter(
      (segment) => !segment.includes("__VIEWSTATE")
    );
    const liHtmlElementsArray = shortRes.filter((segment) =>
      segment.includes('<a class="rtIn"')
    );

    // uses '-2' because the API prints an entire list of old reports
    // so [array.length - 2] always is the most recent AUD reports
    const liElementToProcess =
      liHtmlElementsArray[liHtmlElementsArray.length - 2];
    const sanitizedLiElement = liElementToProcess
      .split("\\")
      .filter((segment) => segment.includes(".zip"))
      .shift();
    const zipReportId = sanitizedLiElement.split('"').shift();

    // const zipReportId =
    //   "CECJ" +
    //   htmlElementSegments.filter((segment) => segment.includes(".zip"));

    const newRes = await this.axiosScrapping({
      url: API_URL_AUDI_RPT + zipReportId,
      responseType: "arraybuffer",
    });

    fs.writeFileSync(filesPath + zipReportId, newRes.data);
    const files = await decompress(
      filesPath + zipReportId,
      filesPath + "08-05-2023"
    );

    // console.log(files.filter((file) => !file.includes(".cvs")));
    const sanitizedFiles = files.filter((file) => !file.path.includes(".csv"));
    return sanitizedFiles;
  }

  /**
   * @description http get request to recieve pdf files
   * @param {string} filename name of pdf file
   * @param {string} url http endpoint
   */
  async getRequestDownload(url, filename) {
    const res = await this.axiosScrapping({
      responseType: "stream",
      url: url,
      headers: {
        Cookie:
          ".ASPXAUTH=" +
          ConfigService.ConfigInstance.getConfig().ASPXAUTH +
          "; " +
          "ASP.NET_SessionId=5ag503ou0yg1tjhrbwmsi1x0",
      },
    });

    console.log(res);

    const responseHeader = res.request._header;
    const isTokenExpired = responseHeader.includes(
      "/WHS-PMS/Account/Login.aspx"
    );

    if (isTokenExpired) {
      return {
        status: "error",
        errMessage: "Sesión expirada. Vuelva a ingresar sesión.",
      };
    }

    if (!fs.existsSync(filesPath)) {
      await this.createDir(filesPath);
    }
    const writer = fs.createWriteStream(filesPath + filename + ".pdf");
    res.data.pipe(writer);

    return new Promise((resolve, reject) => {
      console.log("\x1b[33mDescargando archivo: \x1b[0m" + filename + ".pdf");
      writer.on(
        "finish",
        resolve({
          status: "success",
          message: "Reporte descargado con exito.",
          filePath: writer.path,
        })
      );

      writer.on(
        "error",
        resolve({
          status: "error",
          errMessage: "Error al intentar descargar el archivo: " + filename,
        })
      );
    });
  }

  async createDir(path) {
    return new Promise((resolve, reject) => {
      fs.mkdir(path, (err) => {
        console.log(err);
        if (err) {
          resolve(false);
        }

        resolve(true);
      });
    });
  }

  async handleDownload(writer, filename) {
    return new Promise((resolve, reject) => {
      console.log("Guardando reporte: " + writer.path);
      writer.on(
        "finish",
        resolve({
          status: "success",
          message: "Reporte guardado",
          filePath: writer.path,
        })
      );

      writer.on(
        "error",
        resolve({
          status: "error",
          errMessage:
            "Ocurrio un error al intentar guardar el archivo: " + filename,
        })
      );
    });
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
}

module.exports = AxiosService;
