# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Bundle app source
COPY . .

# Set the environment variable
ENV API_URL https://ns1.119463.ip-ns.net/qr-itsupport-api
ENV WEBSOCKET_API_URL https://ns1.119463.ip-ns.net/qr-itsupport-websocket

# Expose the app's port
EXPOSE 8030

# Define the command to run your app
CMD ["npm", "start"]