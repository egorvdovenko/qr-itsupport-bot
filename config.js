const process = require('process');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

module.exports = {
  API_KEY_BOT: process.env.API_KEY_BOT,
  API_URL: process.env.API_URL,
  WEBSOCKET_SERVER_URL: process.env.WEBSOCKET_SERVER_URL,
};