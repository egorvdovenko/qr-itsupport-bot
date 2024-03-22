const { axios } = require('../utils/axios');
const { getLocalizedString } = require('../utils/localization');
const { isWithinTimeframe, formatDateTime } = require('../utils/dates');
const { USER_ROLE } = require('../constants');
const { API_URL } = require('../config');

/**
 * The ID of the subscription interval.
 * @type {number|null}
 */
let subscriptionIntervalId = null;

/**
 * Fetches and displays completed tickets for a user.
 * @param {Object} ctx - The context object containing information about the user.
 * @returns {Promise<void>} - A promise that resolves once the completed tickets are displayed.
 */
async function viewCompletedTickets(ctx) {
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
        message += `<b>${getLocalizedString('TICKET_CREATED_AT', ctx.session.language)}:</b> ${formatDateTime(ticket.createdAt, ctx.session.language)}\n`;

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
}

/**
 * Fetches and displays uncompleted tickets for a user.
 * @param {Object} ctx - The context object containing information about the user.
 * @returns {Promise<void>} - A promise that resolves once the tickets are displayed.
 */
async function viewUncompletedTickets(ctx) {
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
        message += `<b>${getLocalizedString('TICKET_CREATED_AT', ctx.session.language)}:</b> ${formatDateTime(ticket.createdAt, ctx.session.language)}\n`;
  
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
}

/**
 * Changes the language of the bot.
 * @param {Object} ctx - The context object.
 * @returns {Promise<void>} - A promise that resolves when the language is changed.
 */
async function changeLanguage(ctx) {
  ctx.reply(getLocalizedString('LANGUAGE_PROMPT', ctx.session.language), {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🇷🇺 Русский', callback_data: 'ru' }],
        [{ text: '🇬🇧 English', callback_data: 'en' }]
      ]
    }
  });
}

/**
 * Changes the language to Russian and sends a reply with the updated language message.
 * @param {Object} ctx - The context object containing information about the current state of the bot.
 * @returns {Promise<void>} - A promise that resolves when the language is changed and the reply is sent.
 */
async function changeLanguageToRu(ctx) {
  ctx.session.language = 'ru';
  ctx.reply(getLocalizedString('LANGUAGE_SET_TO_RU', ctx.session.language));
}

/**
 * Changes the language to English.
 * @param {Object} ctx - The context object.
 * @returns {Promise<void>} - A promise that resolves when the language is set to English.
 */
async function changeLanguageToEn(ctx) {
  ctx.session.language = 'en';
  ctx.reply(getLocalizedString('LANGUAGE_SET_TO_EN', ctx.session.language));
}

/**
 * Subscribes to notifications and periodically checks for ticket updates.
 * @param {Object} ctx - The context object.
 * @returns {Promise<void>} - A promise that resolves when the subscription is successful.
 */
async function subscribeToNotifications(ctx) {
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
  
        const isNew = isWithinTimeframe(currentTime, createdAtTime, 1);
        const isUpdated = isWithinTimeframe(currentTime, updatedAtTime, 1);
  
        if (isNew || isUpdated) {
          let message = isNew 
            ? `<b>${getLocalizedString('TICKET_CREATED', ctx.session.language)}</b>\n\n`
            : `<b>${getLocalizedString('TICKET_UPDATED', ctx.session.language)}</b>\n\n`;

          message += '<b>──────────────────</b>\n';
        
          message += `<b>${getLocalizedString('TICKET_TITLE', ctx.session.language)}:</b> ${ticket.title}\n`;
          message += `<b>${getLocalizedString('TICKET_DESCRIPTION', ctx.session.language)}:</b> ${ticket.description}\n`;
          message += `<b>${getLocalizedString('TICKET_CREATED_AT', ctx.session.language)}:</b> ${formatDateTime(ticket.createdAt, ctx.session.language)}\n`;
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
  }, 1 * 60 * 1000);

  ctx.reply(getLocalizedString('SUBSCRIPTION_SUCCESS', ctx.session.language));
}

module.exports = {
  subscriptionIntervalId,
  viewCompletedTickets,
  viewUncompletedTickets,
  changeLanguage,
  changeLanguageToRu,
  changeLanguageToEn,
  subscribeToNotifications
};
