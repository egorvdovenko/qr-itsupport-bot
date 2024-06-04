const process = require('process');

const { Telegraf, session } = require('telegraf');
const { BOT_API_KEY } = require('./config');

const middleware = require('./src/middleware');
const commands = require('./src/commands');
const actions = require('./src/actions');

const bot = new Telegraf(BOT_API_KEY);

bot.use(session());

bot.use(middleware.greetUser);
bot.use(middleware.authenticateUser);

bot.command('login', commands.loginUser);
bot.command('actions', commands.viewAvailableActions);

bot.action('completed_tickets', actions.viewCompletedTickets);
bot.action('uncompleted_tickets', actions.viewUncompletedTickets);
bot.action('subscribe', actions.subscribeToNotifications);
bot.action('unsubscribe', actions.unsubscribeFromNotifications);
bot.action('language', actions.changeLanguage);
bot.action('ru', actions.changeLanguageToRu);
bot.action('en', actions.changeLanguageToEn);

bot.launch();

process.once('SIGINT', () => {
  if (actions.ws) {
    // Close the WebSocket connection when the bot is stopped.
    actions.ws.close();
  }

  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  if (actions.ws) {
    // Close the WebSocket connection when the bot is stopped.
    actions.ws.close();
  }
  
  bot.stop('SIGTERM'); 
});