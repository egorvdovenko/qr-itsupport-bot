const { getLocalizedString } = require('../utils/localization');
const { SESSION_STEP } = require('../constants');

/**
 * Logs in the user.
 * @param {Object} ctx - The context object.
 * @returns {Promise<void>} - A promise that resolves when the login is complete.
 */
async function loginUser(ctx) {
  ctx.session.step = SESSION_STEP.EMAIL;
  ctx.reply(getLocalizedString('ENTER_LOGIN', ctx.session.language));
}

/**
 * Displays the available actions to the user.
 * @param {Object} ctx - The context object.
 * @returns {Promise<void>} - A promise that resolves when the actions are displayed.
 */
async function viewAvailableActions(ctx) {
  ctx.replyWithMarkdown(getLocalizedString('AVAILABLE_ACTIONS', ctx.session.language), {
    reply_markup: {
      inline_keyboard: [
        [{ text: getLocalizedString('VIEW_COMPLETED_TICKETS', ctx.session.language), callback_data: 'completed_tickets' }],
        [{ text: getLocalizedString('VIEW_UNCOMPLETED_TICKETS', ctx.session.language), callback_data: 'uncompleted_tickets' }],
        [{ text: getLocalizedString('SUBSCRIBE_TO_NOTIFICATIONS', ctx.session.language), callback_data: 'subscribe' }],
        [{ text: getLocalizedString('UNSUBSCRIBE_FROM_NOTIFICATIONS', ctx.session.language), callback_data: 'unsubscribe' }],
        [{ text: getLocalizedString('CHANGE_LANGUAGE', ctx.session.language), callback_data: 'language' }],
      ]
    }
  });
}

module.exports = { 
  loginUser, 
  viewAvailableActions 
};