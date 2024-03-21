# qr-itsupport-bot

This is a Telegram bot designed to provide IT support. It allows users to view their tickets, view pending tickets, and change the bot's language.

## Commands

- `/login`: Starts the authentication process.
- `/actions`: Displays the available actions.

## Actions

- `tickets`: Displays the user's tickets.
- `pending`: Displays the current pending tickets.
- `language`: Changes the bot's language.

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

This bot uses the following dependencies:

- `axios`: For making HTTP requests.
- `dotenv`: For managing environment variables.
- `nodemon`: For automatically restarting the bot during development.
- `telegraf`: For interacting with the Telegram Bot API.

## Language Support

This bot supports English and Russian. The language can be changed using the `language` action.

## License

This project is licensed under the ISC license.