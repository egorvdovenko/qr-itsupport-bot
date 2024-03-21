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

const getFormatedDate = (date, lang) => {
  console.log('lang: ', lang)

  return (new Date(date)).toLocaleString(lang, {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  })
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
        ctx.session.language = 'ru';
        ctx.session.user = response.data.user;
        ctx.session.token = response.data.token;
        ctx.session.refreshToken = response.data.refreshToken;

        console.log('Successful authentication:', response.data);
        ctx.reply(getLocalizedString('VIEW_AVAILABLE_ACTIONS', ctx.session.language));
        return;
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

// Command to view available actions
bot.command('actions', async (ctx) => {
  ctx.replyWithMarkdown(getLocalizedString('AVAILABLE_ACTIONS', ctx.session.language), {
    reply_markup: {
      inline_keyboard: [
        [{ text: getLocalizedString('VIEW_TICKETS', ctx.session.language), callback_data: 'tickets' }],
        [{ text: getLocalizedString('VIEW_PENDING_TICKETS', ctx.session.language), callback_data: 'pending' }],
        [{ text: getLocalizedString('CHANGE_LANGUAGE', ctx.session.language), callback_data: 'language' }]
      ]
    }
  });
});

// Action to view user tickets
bot.action('tickets', async (ctx) => {
  const userId = ctx.session.user.id;
  const token = ctx.session.token;

  try {
    const response = await axios.get(`${API_URL}/tickets?userId=${userId}&includeDevice=true`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const tickets = response.data.items;

    if (tickets.length > 0) {
      let message = `<b>${getLocalizedString('YOUR_TICKETS', ctx.session.language)}</b>\n\n`;

      tickets.forEach(ticket => {
        message += '<b>──────────────────</b>\n';

        message += `<b>${getLocalizedString('TICKET_TITLE', ctx.session.language)}:</b> ${ticket.title}\n`;
        message += `<b>${getLocalizedString('TICKET_DESCRIPTION', ctx.session.language)}:</b> ${ticket.description}\n`;
        message += `<b>${getLocalizedString('TICKET_CREATED_AT', ctx.session.language)}:</b> ${getFormatedDate(ticket.createdAt, ctx.session.language)}\n`
        message += `<b>${getLocalizedString('TICKET_STATUS', ctx.session.language)}:</b> ${getLocalizedString(ticket.isDone ? 'DONE' : 'NOT_DONE', ctx.session.language)}\n`;

        if (ticket.device) {
          message += `<b>${getLocalizedString('DEVICE_TITLE', ctx.session.language)}:</b> ${ticket.device.title}\n`;
          message += `<b>${getLocalizedString('DEVICE_INVENTORY_NUMBER', ctx.session.language)}:</b> ${ticket.device.inventoryNumber}\n`;
        }

        message += '\n';
      });

      ctx.replyWithHTML(message);
    } else {
      ctx.reply(getLocalizedString('NO_TICKETS', ctx.session.language));
    }
  } catch (error) {
      console.error('Error fetching tickets:', error);
      ctx.reply(getLocalizedString('ERROR', ctx.session.language));
  }
});

// Action to view current pending tickets (only for administrators)
bot.action('pending', async (ctx) => {
  const userRole = ctx.session.user.role;
  const token = ctx.session.token;

  if (userRole === USER_ROLE.ADMIN) {
    try {
      const response = await axios.get(`${API_URL}/tickets?includeDevice=true`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const pendingTickets = response.data.items.filter(ticket => !ticket.isDone);

      if (pendingTickets.length > 0) {
        let message = `<b>${getLocalizedString('PENDING_TICKETS', ctx.session.language)}</b>\n\n`;

        pendingTickets.forEach(ticket => {
          message += '<b>──────────────────</b>\n';

          message += `<b>${getLocalizedString('TICKET_TITLE', ctx.session.language)}:</b> ${ticket.title}\n`;
          message += `<b>${getLocalizedString('TICKET_DESCRIPTION', ctx.session.language)}:</b> ${ticket.description}\n`;
          message += `<b>${getLocalizedString('TICKET_CREATED_AT', ctx.session.language)}:</b> ${getFormatedDate(ticket.createdAt)}\n`
  
          if (ticket.device) {
            message += `<b>${getLocalizedString('DEVICE_TITLE', ctx.session.language)}:</b> ${ticket.device.title}\n`;
            message += `<b>${getLocalizedString('DEVICE_INVENTORY_NUMBER', ctx.session.language)}:</b> ${ticket.device.inventoryNumber}\n`;
          }

          message += '\n';
        });

        ctx.replyWithHTML(message);
      } else {
        ctx.reply(getLocalizedString('NO_PENDING_TICKETS', ctx.session.language));
      }
    } catch (error) {
      console.error('Error fetching pending tickets:', error);
      ctx.reply(getLocalizedString('ERROR', ctx.session.language));
    }
  }
});

// Action to set user language
bot.action('language', async (ctx) => {
  ctx.reply(getLocalizedString('LANGUAGE_PROMPT', ctx.session.language), {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🇷🇺 Русский', callback_data: 'ru' }],
        [{ text: '🇬🇧 English', callback_data: 'en' }]
      ]
    }
  });
});

bot.action('ru', async (ctx) => {
  ctx.session.language = 'ru';
  ctx.reply(getLocalizedString('LANGUAGE_SET_TO_RU', ctx.session.language));
});

bot.action('en', async (ctx) => {
  ctx.session.language = 'en';
  ctx.reply(getLocalizedString('LANGUAGE_SET_TO_EN', ctx.session.language));
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
