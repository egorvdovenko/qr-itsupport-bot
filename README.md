# qr-itsupport-bot

This is a Telegram bot designed to provide IT support. It allows users to view their tickets, view pending tickets, subscribe to notifications and change the bot's language. The bot uses WebSocket technology for real-time communication, ensuring instant updates and seamless interaction between the bot and the users.

## Commands

- `/login`: Starts the authentication process.
- `/actions`: Displays the available actions.

## Actions

- `completed_tickets`: Displays the user's completed tickets.
- `uncompleted_tickets`: Displays the user's uncompleted tickets.
- `language`: Changes the bot's language. Allows to switch between English and Russian.
- `subscribe`: Subscribes the user to notifications.
- `unsubscribe`: Unsubscribes the user from notifications.

## Running the Bot

To run the bot, use the following command:

```sh
npm run start
```

To run the bot with nodemon (which will automatically restart the bot when files change), use the following command:

```sh
npm run serve
```

## Dependencies

This project uses several dependencies to function properly:

- `telegraf`: A modern framework for building efficient Telegram bots.
- `axios`: A promise-based HTTP client for the browser and node.js.
- `dotenv`: A zero-dependency module that loads environment variables from a `.env` file into `process.env`.
- `nodemon`: A utility that will monitor for any changes in your source and automatically restart your server.
- `ws`: A simple to use, blazing fast, and thoroughly tested WebSocket client and server for Node.js.

## Language Support

This bot supports English and Russian. The language can be changed using the `language` action.
