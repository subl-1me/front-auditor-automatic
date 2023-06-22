const Config = require("../config/Config");
const fs = require("fs");

class ConfigService {
  ConfigInstance = new Config();

  constructor() {
    if (!ConfigService.instance) {
      ConfigService.instance = this;
    }

    this.configFilePath = __dirname + "/config.json";
    this.loadConfig();
    return ConfigService.instance;
  }

  loadConfig() {
    try {
      console.log("Loading config file...");
      const data = fs.readFileSync(this.configFilePath, "utf-8");
      const configData = JSON.parse(data);
      this.ConfigInstance.setConfig(configData);
      console.log("\x1b[32mConfig loaded successfully.\x1b[0m");
    } catch (err) {
      console.log(
        "\x1b[33mDefault config file was not found. Creating new...\x1b[0m"
      );
      this.createDefaultConfig();
    }
  }

  getConfig() {
    return this.ConfigInstance.getConfig();
  }

  createDefaultConfig() {
    const defaultConfig = {
      API_URL_LOGIN: "https://65.61.146.77/WHS-PMS/Account/Login.aspx",
      VIEWSTATE:
        "MsWi2YESAch8QFyJ8ArIGgsD9rfu0giqA8ZOmKPO74bbDXgANquKEU8Ee81zgar1YDjBaWknrCPLrRyTihsDT6iQ8zheRm9V1mXIQbGmARMeCpk/EzdsABrB6ycaB7LMVagAmNqMuchWQVtoAKFCOpcc3imIGu2FBwiB1wh0SsuqcgPsOoqgpApC3Kf6L/nUOx4as0D+xJh2GnSWIMh6W6y78jLqdl2TayNd5cbn/pre4gB9oADMoW4/lwf7h1ALjWwQZq1geXlpD+EZPrjprOubonNFKwQcq8EyazfzvyMBhtvLBhxGKuJLIK0ADJmE43UnZvKy/vQDIM3oFivy1YFCmxoh56UUBl0hjSkfLinu7dDnXOMUD0jzJzVS/WQ4",
      BUTTON_CONTEXT: "login",
    };

    this.writeLocalFile(defaultConfig, true);
    console.log("Default config file created.");
    return;
  }

  parseAuthCookies(header) {
    try {
      const headersSegments = header.split("\r\n");
      const cookiesSegments = headersSegments
        .filter((segment) => segment.includes(".ASPXAUTH"))
        .pop()
        .split(";");
      const ASPXAUTH = cookiesSegments
        .filter((segment) => segment.includes(".ASPXAUTH"))
        .pop()
        .split("=")
        .filter((value) => value !== " .ASPXAUTH")
        .pop();

      return ASPXAUTH;
    } catch (err) {
      console.log(err.message);
      return null;
    }
  }

  writeLocalFile(body, createDefault) {
    // First step is get the current config to concatenate new config
    const bodyString = JSON.stringify(body);
    let concatedData = "";
    if (!createDefault) {
      const data = fs.readFileSync(this.configFilePath, "utf-8");
      const currentConfig = JSON.parse(data);
      if (!currentConfig) {
        throw new Error("Cannot parse undefined config data");
      }

      currentConfig.lastUsernameSession = body.lastUsernameSession;
      currentConfig.ASPXAUTH = body.ASPXAUTH;
      concatedData = JSON.stringify(currentConfig);
    } else {
      concatedData += bodyString;
    }
    fs.writeFileSync(this.configFilePath, concatedData);
  }

  setAuthConfig(body) {
    this.ConfigInstance.setAuth(body);
    this.writeLocalFile(this.ConfigInstance.config, false);
  }

  /**
   * Set a new property into config.json.
   * It is recommended to set only config values or another not sensitive information.
   * The data is only for globally uses of the entire programm for better handling.
   * @param {Object} data Values to be stored
   * @example { isTestMode: true, lastAccountUpdate: '2023/05/01' }
   */
  async set(newData) {
    console.log(newData);
    const actualConfigData = fs.readFile(
      this.configFilePath,
      "utf-8",
      (err, configData) => {
        if (err) {
          console.log(err);
          return;
        }

        let config = JSON.parse(configData);
        const newProperties = Object.getOwnPropertyNames(newData);
        console.log(newProperties);
        newProperties.forEach((property) => {
          console.log(property);
          config[property] = newData[property];
        });

        // write in local config.json
        const configString = JSON.stringify(config);
        fs.writeFile(this.configFilePath, configString, (err) => {
          if (err) {
            console.log("error trying to save new config");
            console.log(err);
            return;
          }

          console.log("Config file updated!");
        });
      }
    );
  }

  readLocalFile() {}
}

const globalConfigService = new ConfigService();
module.exports = globalConfigService;
