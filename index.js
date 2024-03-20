const { Telegraf, session } = require('telegraf');
const axios = require('axios');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const BOT_TOKEN = process.env.API_KEY_BOT;
const API_URL = process.env.API_URL;

const bot = new Telegraf(BOT_TOKEN);

const SESSION_STEP = { EMAIL: 'Email', PASSWORD: 'Password' }
const USER_ROLE = { ADMIN: 'Admin', USER: 'User' }

bot.use(session());

// Объединенное промежуточное ПО для проверки аутентификации пользователя, ввода логина и пароля, и получения информации о пользователе
bot.use(async (ctx, next) => {
  if (ctx.session.isAuthenticated) {
    await next();
  } else {
    if (!ctx.session.step) {
      ctx.session.step = SESSION_STEP.EMAIL;
      ctx.reply('Для входа введите ваш логин:');
      return;
    }
  
    if (ctx.session.step === SESSION_STEP.EMAIL) {
      ctx.session.email = ctx.message.text;
      ctx.session.step = SESSION_STEP.PASSWORD;
      ctx.reply('Теперь введите ваш пароль:');
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

        console.log('Успешная аутентификация:', response.data);
        ctx.reply(`Добро пожаловать, ${ctx.session.user.email}!`);
      } catch (error) {
        ctx.session.step = '';
        ctx.session.email = '';
        
        console.error('Ошибка аутентификации:', error);
        ctx.reply('Неверный логин или пароль. Попробуйте снова.');
        return;
      }
    }
  }
});

// Команда для просмотра заявок пользователя
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
      let message = 'Ваши заявки:\n';

      tickets.forEach(ticket => {
          message += `ID: ${ticket.id}, Статус: ${ticket.isDone ? 'Готова' : 'Не готова'}\n`;
      });

      ctx.reply(message);
    } else {
      ctx.reply('У вас нет заявок.');
    }
  } catch (error) {
      console.error('Ошибка получения заявок:', error);
      ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
});

// Команда для просмотра текущих неготовых заявок (только для администраторов)
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
          let message = 'Текущие неготовые заявки:\n';

          pendingTickets.forEach(ticket => {
              message += `ID: ${ticket.id}\n`;
          });

          ctx.reply(message);
      } else {
          ctx.reply('Нет текущих неготовых заявок.');
      }
    } catch (error) {
      console.error('Ошибка получения неготовых заявок:', error);
      ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  } else {
    ctx.reply('У вас нет доступа к этой команде.');
  }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
