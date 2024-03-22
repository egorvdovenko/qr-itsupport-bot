const process = require('process');
const { Telegraf, session } = require('telegraf');
const axios = require('axios');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const RU_STRINGS = require('./strings_ru');
const EN_STRINGS = require('./strings_en');

let token = null;
let refreshToken = null;
let subscriptionIntervalId = null;

// Add an interceptor to include the token in the request headers
axios.interceptors.request.use(
  (config) => {
    config.headers.Authorization = `Bearer ${token}`;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add an interceptor to handle 401 errors
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const { response } = error;

    if (response && response.status === 401) {
      if (token && refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token, refreshToken })
          });
          const data = await refreshResponse.json();
          token = data.token;
          refreshToken = data.refreshToken;

          error.config.headers.Authorization = `Bearer ${token}`;
          return axios.request(error.config);
        } catch (error) {
          return Promise.reject(error);
        }
      }
    }

    return Promise.reject(error);
  }
);

// Function to check if the time difference is within the specified number of minutes
function isWithin5Minutes(currentTime, targetTime, minutes = 1) {
  const differenceInMilliseconds = currentTime - targetTime;
  const differenceInMinutes = differenceInMilliseconds / (1000 * 60);

  return differenceInMinutes <= minutes;
}

// Function to select strings depending on the selected language
function getLocalizedString(key, lang) {
  const strings = lang === 'en' ? EN_STRINGS : RU_STRINGS;
  return strings[key] || ''; // Return an empty string if the key is not found
}

// Function to format the date
const getFormatedDate = (date, lang) => {
  return (new Date(date)).toLocaleString(lang, {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
};

const API_KEY_BOT = process.env.API_KEY_BOT;
const API_URL = process.env.API_URL;

const bot = new Telegraf(API_KEY_BOT);

const SESSION_STEP = { EMAIL: 'Email', PASSWORD: 'Password' };
const USER_ROLE = { ADMIN: 'Admin', USER: 'User' };

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

        token = response.data.token;
        refreshToken = response.data.refreshToken;

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
        [{ text: getLocalizedString('VIEW_COMPLETED_TICKETS', ctx.session.language), callback_data: 'completed_tickets' }],
        [{ text: getLocalizedString('VIEW_UNCOMPLETED_TICKETS', ctx.session.language), callback_data: 'uncompleted_tickets' }],
        [{ text: getLocalizedString('SUBSCRIBE_TO_NOTIFICATIONS', ctx.session.language), callback_data: 'subscribe' }],
        [{ text: getLocalizedString('CHANGE_LANGUAGE', ctx.session.language), callback_data: 'language' }],
      ]
    }
  });
});

// Action to view completed tickets
bot.action('completed_tickets', async (ctx) => {
  const userId = ctx.session.user.id;

  try {
    const response = await axios.get(ctx.session.user.role === USER_ROLE.ADMIN 
      ? `${API_URL}/tickets?includeDevice=${true}` 
      : `${API_URL}/tickets?userId=${userId}&includeDevice=${true}`
    );

    const completedTickets = response.data.items.filter(ticket => ticket.isDone);

    if (completedTickets.length > 0) {
      let message = `<b>${getLocalizedString('COMPLETED_TICKETS', ctx.session.language)}</b>\n\n`;

      completedTickets.forEach(ticket => {
        message += '<b>──────────────────</b>\n';

        message += `<b>${getLocalizedString('TICKET_TITLE', ctx.session.language)}:</b> ${ticket.title}\n`;
        message += `<b>${getLocalizedString('TICKET_DESCRIPTION', ctx.session.language)}:</b> ${ticket.description}\n`;
        message += `<b>${getLocalizedString('TICKET_CREATED_AT', ctx.session.language)}:</b> ${getFormatedDate(ticket.createdAt, ctx.session.language)}\n`;

        if (ticket.device) {
          message += `<b>${getLocalizedString('DEVICE_TITLE', ctx.session.language)}:</b> ${ticket.device.title}\n`;
          message += `<b>${getLocalizedString('DEVICE_INVENTORY_NUMBER', ctx.session.language)}:</b> ${ticket.device.inventoryNumber}\n`;
        }

        message += '\n';
      });

      ctx.replyWithHTML(message);
    } else {
      ctx.reply(getLocalizedString('NO_COMPLETED_TICKETS', ctx.session.language));
    }
  } catch (error) {
    console.error('Error fetching completed tickets:', error);
    ctx.reply(getLocalizedString('ERROR', ctx.session.language));
  }
});

// Action to view uncompleted tickets
bot.action('uncompleted_tickets', async (ctx) => {
  const userId = ctx.session.user.id;

  try {
    const response = await axios.get(ctx.session.user.role === USER_ROLE.ADMIN 
      ? `${API_URL}/tickets?includeDevice=${true}` 
      : `${API_URL}/tickets?userId=${userId}&includeDevice=${true}`
    );
      
    const uncompletedTickets = response.data.items.filter(ticket => !ticket.isDone);

    if (uncompletedTickets.length > 0) {
      let message = `<b>${getLocalizedString('UNCOMPLETED_TICKETS', ctx.session.language)}</b>\n\n`;

      uncompletedTickets.forEach(ticket => {
        message += '<b>──────────────────</b>\n';

        message += `<b>${getLocalizedString('TICKET_TITLE', ctx.session.language)}:</b> ${ticket.title}\n`;
        message += `<b>${getLocalizedString('TICKET_DESCRIPTION', ctx.session.language)}:</b> ${ticket.description}\n`;
        message += `<b>${getLocalizedString('TICKET_CREATED_AT', ctx.session.language)}:</b> ${getFormatedDate(ticket.createdAt, ctx.session.language)}\n`;
  
        if (ticket.device) {
          message += `<b>${getLocalizedString('DEVICE_TITLE', ctx.session.language)}:</b> ${ticket.device.title}\n`;
          message += `<b>${getLocalizedString('DEVICE_INVENTORY_NUMBER', ctx.session.language)}:</b> ${ticket.device.inventoryNumber}\n`;
        }

        message += '\n';
      });

      ctx.replyWithHTML(message);
    } else {
      ctx.reply(getLocalizedString('NO_UNCOMPLETED_TICKETS', ctx.session.language));
    }
  } catch (error) {
    console.error('Error fetching uncompleted tickets:', error);
    ctx.reply(getLocalizedString('ERROR', ctx.session.language));
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

// Action to subscribe to notifications
bot.action('subscribe', async (ctx) => {
  subscriptionIntervalId = setInterval(async () => {
    const userId = ctx.session.user.id;
  
    try {
      const response = await axios.get(ctx.session.user.role === USER_ROLE.ADMIN 
        ? `${API_URL}/tickets?includeDevice=${true}` 
        : `${API_URL}/tickets?userId=${userId}&includeDevice=${true}`
      );
  
      const tickets = response.data.items;
  
      tickets.forEach(ticket => {
        const currentTime = new Date();
        const createdAtTime = new Date(ticket.createdAt);
        const updatedAtTime = new Date(ticket.updatedAt);
  
        const isNew = isWithin5Minutes(currentTime, createdAtTime, 1);
        const isUpdated = isWithin5Minutes(currentTime, updatedAtTime, 1);
  
        if (isNew || isUpdated) {
          let message = isNew 
            ? `<b>${getLocalizedString('TICKET_CREATED', ctx.session.language)}</b>\n\n`
            : `<b>${getLocalizedString('TICKET_UPDATED', ctx.session.language)}</b>\n\n`;

          message += '<b>──────────────────</b>\n';
        
          message += `<b>${getLocalizedString('TICKET_TITLE', ctx.session.language)}:</b> ${ticket.title}\n`;
          message += `<b>${getLocalizedString('TICKET_DESCRIPTION', ctx.session.language)}:</b> ${ticket.description}\n`;
          message += `<b>${getLocalizedString('TICKET_CREATED_AT', ctx.session.language)}:</b> ${getFormatedDate(ticket.createdAt, ctx.session.language)}\n`;
          message += `<b>${getLocalizedString('TICKET_STATUS', ctx.session.language)}:</b> ${getLocalizedString(ticket.isDone ? 'COMPLETED' : 'IN_PROGRESS', ctx.session.language)}\n`;

          if (ticket.device) {
            message += `<b>${getLocalizedString('DEVICE_TITLE', ctx.session.language)}:</b> ${ticket.device.title}\n`;
            message += `<b>${getLocalizedString('DEVICE_INVENTORY_NUMBER', ctx.session.language)}:</b> ${ticket.device.inventoryNumber}\n`;
          }
        
          message += '\n';
        
          ctx.replyWithHTML(message);
        }
      });
    } catch (error) {
      console.error('An error occurred while checking for ticket updates:', error);
    }
  }, 1 * 60 * 1000); // Check every 1 minute

  ctx.reply(getLocalizedString('SUBSCRIPTION_SUCCESS', ctx.session.language));
});

bot.launch();

process.once('SIGINT', () => {
  clearInterval(subscriptionIntervalId);
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  clearInterval(subscriptionIntervalId);
  bot.stop('SIGTERM'); 
});
