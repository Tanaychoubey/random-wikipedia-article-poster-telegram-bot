const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config(); // Load the environment variables from .env file

const token = process.env.TELEGRAM_BOT_TOKEN; // Access the bot token from the environment variable
const bot = new TelegramBot(token, { polling: true });

// Function to fetch a random Wikipedia article title
async function getRandomWikiArticle() {
  try {
    const response = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        list: "random",
        format: "json",
      },
    });

    const randomArticle = response.data.query.random[0];
    return randomArticle;
  } catch (error) {
    console.error("Error fetching random Wikipedia article:", error.message);
    throw error;
  }
}

// Function to fetch the summary of a Wikipedia article
async function getSummary(title) {
  try {
    const response = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        prop: "extracts",
        exintro: true,
        titles: title,
        format: "json",
      },
    });

    const page = Object.values(response.data.query.pages)[0];
    if (page.missing || page.ns !== 0) {
      // If the page is missing or not a main namespace article, try again to get another article
      return null;
    }

    const summary = page.extract;
    return summary;
  } catch (error) {
    console.error("Error fetching Wikipedia article summary:", error.message);
    throw error;
  }
}

// Function to remove HTML tags from the summary
function stripHTML(html) {
  return html.replace(/<[^>]*>?/gm, "");
}

// Function to post to the Telegram group
async function postToTelegramGroup(chatId, title, summary) {
  if (!summary) {
    // If summary is null (article not found), try again to get another article
    console.log("Article not found. Trying again...");
    handleRandomWikiCommand(chatId);
    return;
  }

  // Clean up the summary by removing HTML tags
  const cleanedSummary = stripHTML(summary);

  const message = `Random Wikipedia Article:\n\nTitle: ${title}\n\nSummary: ${cleanedSummary}`;

  try {
    await bot.sendMessage(chatId, message);
    console.log("Posted to Telegram group successfully!");
  } catch (error) {
    console.error("Error posting to Telegram group:", error.message);
    throw error;
  }
}

// Function to handle the /randomwiki command
async function handleRandomWikiCommand(chatId) {
  try {
    const randomArticle = await getRandomWikiArticle();
    const summary = await getSummary(randomArticle.title);
    postToTelegramGroup(chatId, randomArticle.title, summary);
  } catch (error) {
    console.error("Error handling /randomwiki command:", error.message);
  }
}

// Listen for incoming messages and check for the /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const suggestion =
    "To get a random Wikipedia article, type /randomwiki and wait for a second.";
  bot.sendMessage(chatId, suggestion);
});

// Listen for incoming messages and check for the /randomwiki command
bot.onText(/\/randomwiki/, (msg) => {
  const chatId = msg.chat.id;
  handleRandomWikiCommand(chatId);
});

// Start the bot
console.log("Bot is running...");
