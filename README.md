# headlessScrAPI

This little helper exposes an API that allows you to capture screenshots of websites, scrape their HTML DOM, and generate thumbnails. It uses `Puppeteer`, `Puppeteer-Extra` and `puppeteer-extra-plugin-stealth` for headless browsing.

## Features

- **Capture full-page screenshots** of websites.
- **Extract the HTML DOM** of the loaded page.
- **Generate a thumbnail** of the screenshot while maintaining the aspect ratio.
- **Dynamic configuration** via POST request (set viewport, user-agent, timeouts, headless mode, etc.).

## API Documentation

### Endpoint: `/scraper`

This endpoint allows you to capture a screenshot of a given URL, extract the HTML DOM, and generate a thumbnail.

#### **Request Format**

- **Method**: `POST`
- **URL**: `/scraper`

##### **Request Body Parameters**

- `url` (required): The URL of the website you want to capture.
- `config` (optional): Configuration settings for the scraper. The configuration will override default settings if provided.

  **config object parameters**:

  - `viewport`: (optional) Object specifying the width and height of the browser viewport (e.g., `{ width: 1366, height: 768 }`). Default: `{ width: 1920, height: 1080 }`.
  - `userAgent`: (optional) The user agent string to use. Default: `'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'`.
  - `browserLaunchTimeout`: (optional) Timeout (in milliseconds) for launching the browser. Default: `5000`.
  - `pageLoadTimeout`: (optional) Timeout (in milliseconds) for loading the page. Default: `10000`.
  - `headless`: (optional) Whether to run the browser in headless mode (`true` or `false`). Default: `true`.
  - `args`: (optional) Array of Puppeteer arguments. Default: `["--no-sandbox", "--disable-setuid-sandbox"]`.
  - `thumbnailSettings`: (optional) Settings for generating the thumbnail.
    - `thumbnail_width`: (optional) Maximum width for the thumbnail. Default: `400`.
    - `thumbnail_height`: (optional) Maximum height for the thumbnail. Default: `400`.
    - `quality`: (optional) Quality of the thumbnail (0-100). Default: `80`.

##### **Response**

The API will return a JSON object with the following fields:

- `meta`: Requested url and some meta informationen
- `screenshot`: A base64-encoded full-page screenshot.
- `thumbnail`: A base64-encoded thumbnail image.
- `htmlContent`: The HTML DOM of the loaded page.

#### **Example Request**

```json
{
  "url": "https://example.com",
  "config": {
    "viewport": { "width": 1366, "height": 768 },
    "userAgent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
    "browserLaunchTimeout": 7000,
    "pageLoadTimeout": 15000,
    "headless": false,
    "args": [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ],
    "thumbnailSettings": {
      "thumbnail_width": 300,
      "thumbnail_height": 300,
      "quality": 70
    }
  }
}
```

#### **Example Response**

```json
{
  "requested_url": "https://example.com",
  "timestamp": "2025-08-11T15:45:30.123Z",
  "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "thumbnail": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAA...",
  "htmlContent": "<html><body><h1>Example Domain</h1></body></html>"
}
```

## Running the Application with Docker

### Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (if using `docker-compose.yml`)

### 1. **Clone the Repository**

First, clone this repository to your local machine:

```bash
git clone https://github.com/your-username/puppeteer-scraper.git
cd puppeteer-scraper
```

### 2. **Build and Run the Docker Container**

#### **Option 1: Using Docker Compose**

If you have Docker Compose installed, you can use it to build and run the application:

1. **Create an `.env` file** in the root of your project directory and add your `API_ACCESS_TOKEN`:

   ```
   API_ACCESS_TOKEN=your_secure_api_token
   ```

2. **Run the application** with Docker Compose:
   ```bash
   sudo docker-compose up -d --build
   ```

This will:

- Build the Docker image for the application.
- Start the container.
- Expose the application on port `5555`.

#### **Option 2: Using Docker CLI**

Alternatively, if you prefer not to use Docker Compose, follow these steps:

1. **Build the Docker image**:

   ```bash
   docker build -t headlessscrapi .
   ```

2. **Run the Docker container**:
   ```bash
    sudo docker run -d -p 5555:5555 --env-file .env --name headlessscrapi headlessscrapi
   ```

This will run the container and expose the application on port `5555`.

### 3. **Access the API**

Once the container is running, you can access the API at:

```
http://localhost:5555
```

You can test the `/scraper` endpoint using tools like **Postman** or **cURL** to send POST requests.

---

## Credits

This project uses the following open-source libraries:

- **[Puppeteer](https://github.com/puppeteer/puppeteer)** - A headless browser automation library for Node.js. Used for web scraping, taking screenshots, and interacting with web pages.
- **[puppeteer-extra](https://github.com/berstend/puppeteer-extra)** - A set of useful extensions for Puppeteer, including plugins like stealth mode to prevent detection.
- **[puppeteer-puppeteer-extra-plugin-stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)** - Stealth mode: Applies various techniques to make detection of headless puppeteer harder.
- **[sharp](https://github.com/lovell/sharp)** - An image processing library used for resizing and compressing screenshots to generate thumbnails.
