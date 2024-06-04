const process = require('process');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

module.exports = {
  BOT_API_KEY: process.env.BOT_API_KEY,
  API_URL: process.env.API_URL,
  WEBSOCKET_SERVER_URL: process.env.WEBSOCKET_SERVER_URL,
};