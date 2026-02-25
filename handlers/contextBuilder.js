const { createClient } = require("@supabase/supabase-js");

let _supabase;
function supabase() {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  }
  return _supabase;
}

const INDUSTRY_KEYWORDS = [
  "gig worker",
  "gig economy",
  "delivery",
  "micromobility",
  "electric scooter",
  "battery swap",
  "last mile",
  "bike rental",
  "ev",
  "scooter",
  "swiggy",
  "zomato",
  "blinkit",
  "dunzo",
  "porter",
  "yulu",
  "bounce",
  "vogo",
  "pricing",
  "subscription",
  "rental",
  "threat",
  "opportunity",
  "swot",
  "strategy",
  "market",
  "competitor",
  "insight",
];

async function getCompetitorNames() {
  const { data, error } = await supabase()
    .from("competitors")
    .select("name, normalized_name");
  if (error) throw error;
  return data || [];
}

async function getLatestAnalysis() {
  const { data, error } = await supabase()
    .from("analysis_runs")
    .select("analysis_json, run_date")
    .order("run_date", { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return typeof data.analysis_json === "string"
    ? JSON.parse(data.analysis_json)
    : data.analysis_json;
}

function findMentionedCompetitors(message, competitorNames) {
  const lower = message.toLowerCase();
  return competitorNames.filter((c) => lower.includes(c.normalized_name));
}

function hasIndustryKeyword(message) {
  const lower = message.toLowerCase();
  return INDUSTRY_KEYWORDS.some((kw) => lower.includes(kw));
}

function formatCompetitorProfile(comp) {
  let text = `## ${comp.name}\n`;
  text += `${comp.description}\n`;
  text += `- Market position: ${comp.market_position}\n`;
  text += `- Pricing: ${comp.pricing_model}\n`;
  text += `- Key differentiator: ${comp.key_differentiator}\n`;
  text += `- Strengths: ${comp.strengths.join(", ")}\n`;
  text += `- Weaknesses: ${comp.weaknesses.join(", ")}\n`;

  if (comp.insights) {
    text += `- Top features: ${comp.insights.top_features.join(", ")}\n`;
    text += `- Growth signals: ${comp.insights.growth_signals.join(", ")}\n`;
    text += `- Winning segments: ${comp.insights.winning_segments.join(", ")}\n`;
    text += `- Marketing angles: ${comp.insights.marketing_angles.join(", ")}\n`;
  }

  if (comp.sentiment) {
    text += `- User love: ${comp.sentiment.what_users_love.join(", ")}\n`;
    text += `- Complaints: ${comp.sentiment.common_complaints.join(", ")}\n`;
    text += `- Net sentiment: ${comp.sentiment.net_sentiment}\n`;
  }

  if (comp.recent_developments?.length) {
    text += `- Recent developments:\n`;
    for (const dev of comp.recent_developments) {
      text += `  - [${dev.type}] ${dev.headline}: ${dev.summary} (${dev.recency})\n`;
    }
  }

  return text;
}

function formatIndustryContext(analysis) {
  let text = `# Competitive Intelligence Report — ${analysis.product_name}\n\n`;
  text += `## Market Overview\n${analysis.market_overview}\n\n`;

  text += `## Competitors\n`;
  for (const comp of analysis.competitors) {
    text += `- **${comp.name}**: ${comp.description} | Pricing: ${comp.pricing_model}\n`;
  }

  text += `\n## SWOT (for ${analysis.product_name})\n`;
  text += `- Strengths: ${analysis.swot.strengths.join("; ")}\n`;
  text += `- Weaknesses: ${analysis.swot.weaknesses.join("; ")}\n`;
  text += `- Opportunities: ${analysis.swot.opportunities.join("; ")}\n`;
  text += `- Threats: ${analysis.swot.threats.join("; ")}\n`;

  if (analysis.key_insights?.length) {
    text += `\n## Key Insights\n`;
    for (const insight of analysis.key_insights) {
      text += `- ${insight}\n`;
    }
  }

  if (analysis.biggest_threats?.length) {
    text += `\n## Biggest Threats\n`;
    for (const t of analysis.biggest_threats) {
      text += `- ${t}\n`;
    }
  }

  if (analysis.market_gaps?.length) {
    text += `\n## Market Gaps\n`;
    for (const g of analysis.market_gaps) {
      text += `- ${g}\n`;
    }
  }

  if (analysis.urgent_opportunities?.length) {
    text += `\n## Urgent Opportunities\n`;
    for (const o of analysis.urgent_opportunities) {
      text += `- ${o}\n`;
    }
  }

  if (analysis.strategies?.length) {
    text += `\n## Strategy Recommendations\n`;
    for (const s of analysis.strategies) {
      text += `- [${s.priority}] **${s.title}** (${s.category}): ${s.description}\n`;
    }
  }

  if (analysis.gig_worker_pulse?.length) {
    text += `\n## Gig Worker Pulse\n`;
    for (const g of analysis.gig_worker_pulse) {
      text += `- "${g.quote}" — ${g.source_platform}\n`;
    }
  }

  if (analysis.news_digest?.length) {
    text += `\n## News Digest\n`;
    for (const n of analysis.news_digest) {
      text += `- [${n.type}] ${n.headline} (${n.competitor_name}, ${n.date}): ${n.summary}\n`;
    }
  }

  return text;
}

async function buildContext(message) {
  try {
    const competitorNames = await getCompetitorNames();
    const mentioned = findMentionedCompetitors(message, competitorNames);

    if (mentioned.length > 0) {
      const analysis = await getLatestAnalysis();
      const profiles = [];

      for (const m of mentioned) {
        const comp = analysis.competitors.find(
          (c) => c.name.toLowerCase() === m.normalized_name
        );
        if (comp) profiles.push(formatCompetitorProfile(comp));
      }

      if (profiles.length > 0) {
        return profiles.join("\n\n");
      }
    }

    if (hasIndustryKeyword(message)) {
      const analysis = await getLatestAnalysis();
      return formatIndustryContext(analysis);
    }

    return null;
  } catch (err) {
    console.error("Context builder error:", err.message);
    return null;
  }
}

module.exports = { buildContext };
