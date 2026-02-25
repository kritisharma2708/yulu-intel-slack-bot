const OpenAI = require("openai");

let _openai;
function openai() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const SYSTEM_PROMPT = `You are CompeteIQ, a competitive intelligence assistant for Yulu — India's leading micromobility company providing electric bikes and scooters for last-mile connectivity and gig workers.

Your expertise:
- Indian micromobility market (Yulu, Bounce, Vogo, and others)
- Gig worker economics (Swiggy, Zomato, Blinkit, Dunzo, Porter delivery riders)
- EV adoption, battery swap networks, and urban mobility trends
- Pricing, subscription models, and fleet operations
- Competitive strategy and market positioning

Guidelines:
- Be concise and actionable — this is a Slack conversation, not a report.
- When you have data from the intelligence database, cite specifics (pricing, features, sentiment).
- When you don't have data, say so clearly and answer from general knowledge.
- Focus on insights that help Yulu win — threats, opportunities, and strategic moves.
- Use bullet points and bold text for readability in Slack.`;

const RESET_TRIGGERS = ["start over", "reset", "new conversation"];

const MAX_HISTORY = 10;

// Per-conversation message history: key = "channelId_userId"
const conversations = new Map();

function conversationKey(userId, channelId) {
  return `${channelId}_${userId}`;
}

function shouldReset(message) {
  const lower = message.toLowerCase().trim();
  return RESET_TRIGGERS.some((t) => lower === t || lower.startsWith(t));
}

async function chat(userId, channelId, message, context) {
  const key = conversationKey(userId, channelId);

  if (shouldReset(message)) {
    conversations.delete(key);
    return "Conversation cleared! Ask me anything about the competitive landscape.";
  }

  if (!conversations.has(key)) {
    conversations.set(key, []);
  }
  const history = conversations.get(key);

  // Build system message with optional context
  let systemContent = SYSTEM_PROMPT;
  if (context) {
    systemContent +=
      "\n\n--- INTELLIGENCE DATABASE CONTEXT ---\n" +
      "Use the following data to answer the user's question. " +
      "This is from Yulu's latest competitive analysis.\n\n" +
      context;
  }

  history.push({ role: "user", content: message });

  // Trim to last N messages
  while (history.length > MAX_HISTORY) {
    history.shift();
  }

  const messages = [{ role: "system", content: systemContent }, ...history];

  const response = await openai().chat.completions.create({
    model: "gpt-4o",
    messages,
    max_tokens: 500,
    temperature: 0.4,
  });

  const reply = response.choices[0].message.content;

  history.push({ role: "assistant", content: reply });

  // Trim again after adding assistant reply
  while (history.length > MAX_HISTORY) {
    history.shift();
  }

  return reply;
}

module.exports = { chat };
