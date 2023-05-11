/**
 * @description It creates a config.txt to save session username and token
 * to better handle
 */
class Config {
  config = {};

  constructor() {}

  getConfig() {
    return this.config;
  }

  setConfig(body) {
    this.config = body;
  }

  setAuth(body) {
    const { lastUsernameSession, ASPXAUTH } = body;
    this.config.lastUsernameSession = lastUsernameSession;
    this.config.ASPXAUTH = ASPXAUTH;
  }
}

module.exports = Config;
