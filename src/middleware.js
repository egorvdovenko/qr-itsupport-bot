const { axios, setToken, setRefreshToken } = require('../utils/axios');
const { getLocalizedString } = require('../utils/localization');
const { SESSION_STEP } = require('../constants');
const { API_URL } = require('../config');

// Middleware to greet the user on the first run
async function greetUser(ctx, next) {
  if (!ctx.session.isFirstRun) {
    ctx.session.isFirstRun = true;
    ctx.reply(getLocalizedString('WELCOME_MESSAGE', ctx.session.language));
    return;
  }

  await next();
}

/**
 * Authenticates the user before proceeding to the next middleware.
 *
 * @param {Object} ctx - The context object containing information about the current session.
 * @param {Function} next - The next middleware function to be called.
 * @returns {Promise<void>} - A promise that resolves when the authentication process is complete.
 */
async function authenticateUser(ctx, next) {
  if (!ctx.session.isAuthenticated && ctx.message.text !== '/login') {
    if (ctx.session.step === SESSION_STEP.EMAIL) {
      return handleEmailInput(ctx);
    }

    if (ctx.session.step === SESSION_STEP.PASSWORD) {
      return handlePasswordInput(ctx);
    }

    ctx.reply(getLocalizedString('NOT_AUTHENTICATED', ctx.session.language));
    return;
  }

  await next();
}

/**
 * Handles the email input from the user.
 * Sets the email in the session, updates the session step to PASSWORD,
 * and sends a reply with the localized message for entering the password.
 *
 * @param {Object} ctx - The context object containing information about the message and session.
 * @returns {Promise<void>} - A promise that resolves when the function completes.
 */
async function handleEmailInput(ctx) {
  ctx.session.email = ctx.message.text;
  ctx.session.step = SESSION_STEP.PASSWORD;
  ctx.reply(getLocalizedString('ENTER_PASSWORD', ctx.session.language));
}

/**
 * Handles password input and performs user authentication.
 * @param {Object} ctx - The context object containing session and message information.
 * @returns {Promise<void>} - A promise that resolves when the authentication process is complete.
 */
async function handlePasswordInput(ctx) {
  const email = ctx.session.email;
  const password = ctx.message.text;

  try {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });

    ctx.session.isAuthenticated = true;
    ctx.session.language = 'ru'; // Change to appropriate default language
    ctx.session.user = response.data.user;

    setToken(response.data.token);
    setRefreshToken(response.data.refreshToken);

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

module.exports = {
  greetUser,
  authenticateUser
};
