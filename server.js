require("dotenv").config();

const { App } = require("@slack/bolt");
const { handleMessage } = require("./handlers/messageHandler");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Respond to @mentions in any channel
app.event("app_mention", async (args) => {
  await handleMessage(args);
});

// Respond to direct messages
app.event("message", async (args) => {
  const { event } = args;

  // DMs have channel type "im"
  if (event.channel_type === "im") {
    await handleMessage(args);
    return;
  }

  // Designated Q&A channel — respond to every message
  if (
    process.env.SLACK_QA_CHANNEL &&
    event.channel === process.env.SLACK_QA_CHANNEL
  ) {
    await handleMessage(args);
  }
});

(async () => {
  await app.start();
  console.log("CompeteIQ bot is running!");
})();
