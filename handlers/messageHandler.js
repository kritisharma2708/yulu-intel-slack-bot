const { buildContext } = require("./contextBuilder");
const { chat } = require("../gpt/chat");

const WELCOME_MESSAGE =
  "Hey! I'm *CompeteIQ* — your competitive intelligence assistant.\n\n" +
  "Ask me about:\n" +
  "- Specific competitors (e.g. _What's Bounce's pricing?_)\n" +
  "- Market threats & opportunities\n" +
  "- Gig worker trends\n" +
  "- SWOT analysis & strategy\n\n" +
  'Type *reset* to start a fresh conversation.';

function stripMention(text) {
  // Remove <@BOT_ID> patterns
  return text.replace(/<@[A-Z0-9]+>/g, "").trim();
}

async function handleMessage({ event, say, client }) {
  // Ignore bot messages and message_changed subtypes
  if (event.bot_id || event.subtype) return;

  const rawText = event.text || "";
  const message = stripMention(rawText);

  // If empty after stripping mention, send welcome
  if (!message) {
    await say({ text: WELCOME_MESSAGE, thread_ts: event.ts });
    return;
  }

  const userId = event.user;
  const channelId = event.channel;
  const threadTs = event.thread_ts || event.ts;

  try {
    // Show typing indicator
    await client.reactions.add({
      channel: channelId,
      name: "thinking_face",
      timestamp: event.ts,
    }).catch(() => {});

    const context = await buildContext(message);
    const reply = await chat(userId, channelId, message, context);

    // Remove typing indicator
    await client.reactions.remove({
      channel: channelId,
      name: "thinking_face",
      timestamp: event.ts,
    }).catch(() => {});

    await say({ text: reply, thread_ts: threadTs });
  } catch (err) {
    console.error("Message handler error:", err);

    // Remove typing indicator on error
    await client.reactions.remove({
      channel: channelId,
      name: "thinking_face",
      timestamp: event.ts,
    }).catch(() => {});

    await say({
      text: "Something went wrong while processing your question. Please try again.",
      thread_ts: threadTs,
    });
  }
}

module.exports = { handleMessage };
