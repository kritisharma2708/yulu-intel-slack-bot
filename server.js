require("dotenv").config();

const { App } = require("@slack/bolt");
const { handleMessage } = require("./handlers/messageHandler");

const PORT = process.env.PORT || 3000;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Ignore Slack retries (caused by cold-start delays on Render free tier)
app.use(async ({ context, next }) => {
  const retryNum = context.retryNum;
  if (retryNum) {
    console.log(`Ignoring Slack retry #${retryNum} (reason: ${context.retryReason})`);
    return;
  }
  await next();
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
  await app.start(PORT);
  console.log(`CompeteIQ bot is running on port ${PORT}`);
})();
