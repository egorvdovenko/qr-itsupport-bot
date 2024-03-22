const process = require('process');

const { Telegraf, session } = require('telegraf');
const { API_KEY_BOT } = require('./config');

const middleware = require('./src/middleware');
const commands = require('./src/commands');
const actions = require('./src/actions');

const bot = new Telegraf(API_KEY_BOT);

bot.use(session());

bot.use(middleware.greetUser);
bot.use(middleware.authenticateUser);

bot.command('login', commands.loginUser);
bot.command('actions', commands.viewAvailableActions);

bot.action('completed_tickets', actions.viewCompletedTickets);
bot.action('uncompleted_tickets', actions.viewUncompletedTickets);
bot.action('subscribe', actions.subscribeToNotifications);
bot.action('language', actions.changeLanguage);
bot.action('ru', actions.changeLanguageToRu);
bot.action('en', actions.changeLanguageToEn);

bot.launch();

process.once('SIGINT', () => {
  clearInterval(actions.subscriptionIntervalId);
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  clearInterval(actions.subscriptionIntervalId);
  bot.stop('SIGTERM'); 
});