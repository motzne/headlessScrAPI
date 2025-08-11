# Use official Node.js image based on Debian Bullseye
FROM node:16-bullseye

# Set working directory inside the container
WORKDIR /app

# Install dependencies for Puppeteer to run in headless mode
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the entire application code to the container
COPY . .

# Expose the port that the app will run on
EXPOSE 5555

# Set environment variable for production (can be changed when running container)
ENV NODE_ENV=production

# Run the application
CMD ["node", "server.js"]
