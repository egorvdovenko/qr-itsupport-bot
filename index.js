const { Telegraf, session } = require('telegraf');
const axios = require('axios');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const RU_STRINGS = require('./strings_ru');
const EN_STRINGS = require('./strings_en');

// Function to select strings depending on the selected language
function getLocalizedString(key, lang) {
  const strings = lang === 'en' ? EN_STRINGS : RU_STRINGS;
  return strings[key] || ''; // Return an empty string if the key is not found
}

const BOT_TOKEN = process.env.API_KEY_BOT;
const API_URL = process.env.API_URL;

const bot = new Telegraf(BOT_TOKEN);

const SESSION_STEP = { EMAIL: 'Email', PASSWORD: 'Password' }
const USER_ROLE = { ADMIN: 'Admin', USER: 'User' }

bot.use(session());

// Middleware to greet the user on the first run
bot.use(async (ctx, next) => {
  if (!ctx.session.isFirstRun) {
    ctx.session.isFirstRun = true;
    ctx.reply(getLocalizedString('WELCOME_MESSAGE', ctx.session.language));
    return;
  }

  await next();
});

// Middleware to handle user authentication
bot.use(async (ctx, next) => {
  if (!ctx.session.isAuthenticated && ctx.message.text !== '/login') {
    if (ctx.session.step === SESSION_STEP.EMAIL) {
      ctx.session.email = ctx.message.text;
      ctx.session.step = SESSION_STEP.PASSWORD;
      ctx.reply(getLocalizedString('ENTER_PASSWORD', ctx.session.language));
      return;
    }

    if (ctx.session.step === SESSION_STEP.PASSWORD) {
      const email = ctx.session.email;
      const password = ctx.message.text;

      try {
        const response = await axios.post(`${API_URL}/auth/login`, { email, password });

        ctx.session.isAuthenticated = true;
        ctx.session.user = response.data.user;
        ctx.session.token = response.data.token;
        ctx.session.refreshToken = response.data.refreshToken;

        console.log('Successful authentication:', response.data);
        ctx.reply(getLocalizedString('WELCOME_MESSAGE', ctx.session.language));
      } catch (error) {
        ctx.session.step = '';
        ctx.session.email = '';

        console.error('Authentication error:', error);
        ctx.reply(getLocalizedString('INVALID_CREDENTIALS', ctx.session.language));
        return;
      }
    }

    ctx.reply(getLocalizedString('NOT_AUTHENTICATED', ctx.session.language));
    return;
  }

  await next();
});

// Command to start the authentication process
bot.command('login', async (ctx) => {
  ctx.session.step = SESSION_STEP.EMAIL;
  ctx.reply(getLocalizedString('ENTER_LOGIN', ctx.session.language));
});

// Command to view user tickets
bot.command('tickets', async (ctx) => {
  const userId = ctx.session.user.id;
  const token = ctx.session.token;

  try {
    const response = await axios.get(`${API_URL}/tickets?userId=${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const tickets = response.data.items;

    if (tickets.length > 0) {
      let message = getLocalizedString('YOUR_TICKETS', ctx.session.language) + '\n';

      tickets.forEach(ticket => {
          message += `ID: ${ticket.id}, ${getLocalizedString(ticket.isDone ? 'DONE' : 'NOT_DONE', ctx.session.language)}\n`;
      });

      ctx.reply(message);
    } else {
      ctx.reply(getLocalizedString('NO_TICKETS', ctx.session.language));
    }
  } catch (error) {
      console.error('Error fetching tickets:', error);
      ctx.reply(getLocalizedString('ERROR', ctx.session.language));
  }
});

// Command to view current pending tickets (only for administrators)
bot.command('pending', async (ctx) => {
  const userRole = ctx.session.user.role;
  const token = ctx.session.token;

  if (userRole === USER_ROLE.ADMIN) {
    try {
      const response = await axios.get(`${API_URL}/tickets`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const pendingTickets = response.data.items.filter(ticket => !ticket.isDone);

      if (pendingTickets.length > 0) {
          let message = getLocalizedString('PENDING_TICKETS', ctx.session.language) + '\n';

          pendingTickets.forEach(ticket => {
              message += `ID: ${ticket.id}\n`;
          });

          ctx.reply(message);
      } else {
          ctx.reply(getLocalizedString('NO_PENDING_TICKETS', ctx.session.language));
      }
    } catch (error) {
      console.error('Error fetching pending tickets:', error);
      ctx.reply(getLocalizedString('ERROR', ctx.session.language));
    }
  } else {
    ctx.reply(getLocalizedString('ACCESS_DENIED', ctx.session.language));
  }
});

// Command to set user language
bot.command('language', async (ctx) => {
  ctx.reply(getLocalizedString('LANGUAGE_PROMPT', ctx.session.language), {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🇷🇺 Russian', callback_data: 'ru' }],
        [{ text: '🇬🇧 English', callback_data: 'en' }]
      ]
    }
  });
});

bot.action('ru', async (ctx) => {
  ctx.session.language = 'ru';
  ctx.reply(getLocalizedString('LANGUAGE_SET_TO_RU', 'ru'));
});

bot.action('en', async (ctx) => {
  ctx.session.language = 'en';
  ctx.reply(getLocalizedString('LANGUAGE_SET_TO_EN', 'en'));
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
