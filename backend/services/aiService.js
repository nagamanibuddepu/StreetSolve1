/**
 * AI Service – OpenAI-powered classification, translation, urgency scoring
 * Falls back gracefully if API is unavailable
 */
const OpenAI = require('openai');
const logger = require('../utils/logger');

let openai;
try {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch (e) {
  logger.warn('OpenAI not configured – AI features will use fallback');
}

// ─── Keyword-based fallback classifier ───────────────────────────────────────
const KEYWORD_MAP = {
  Roads: ['pothole', 'road', 'path', 'footpath', 'pavement', 'street', 'speed breaker', 'divider', 'highway', 'bridge', 'crack', 'damaged road', 'सड़क', 'రోడ్', 'ரோடு'],
  Sanitation: ['garbage', 'waste', 'trash', 'rubbish', 'sewage', 'drain', 'stink', 'smell', 'dirty', 'litter', 'dustbin', 'कचरा', 'చెత్త', 'குப்பை'],
  Water: ['water', 'pipe', 'leak', 'tap', 'supply', 'shortage', 'flood', 'overflow', 'sewage', 'बाढ़', 'నీళ్ళు', 'தண்ணீர்'],
  Electricity: ['light', 'electric', 'power', 'transformer', 'wire', 'blackout', 'voltage', 'current', 'बिजली', 'కరెంట్', 'மின்சாரம்'],
  Parks: ['park', 'garden', 'tree', 'plant', 'grass', 'bench', 'playground'],
  Drainage: ['drain', 'blocked', 'overflow', 'stagnant', 'waterlogging', 'clog'],
  Noise: ['noise', 'sound', 'loud', 'disturb', 'horn', 'music', 'शोर'],
};

const classifyByKeywords = (text) => {
  const lower = text.toLowerCase();
  let bestCategory = 'Others';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    const score = keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  const deptMap = {
    Roads: 'Roads Department',
    Sanitation: 'Sanitation Department',
    Water: 'Water Department',
    Electricity: 'Electricity Department',
    Parks: 'Parks Department',
    Drainage: 'Drainage Department',
    Noise: 'General',
    Others: 'General',
  };

  return {
    suggestedCategory: bestCategory,
    suggestedDepartment: deptMap[bestCategory],
    confidence: bestScore > 0 ? Math.min(0.5 + bestScore * 0.1, 0.9) : 0.3,
    keywords: KEYWORD_MAP[bestCategory] || [],
    urgencyScore: 5,
    sentiment: 'neutral',
    method: 'keyword',
  };
};

// ─── AI Classification ───────────────────────────────────────────────────────
const classifyIssue = async (title, description, language = 'en') => {
  if (!openai || !process.env.OPENAI_API_KEY) {
    logger.debug('Using keyword fallback for classification');
    return classifyByKeywords(`${title} ${description}`);
  }

  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_')) {
      return classifyByKeywords(`${title} ${description}`);
    }
    const prompt = `Classify this civic complaint from India. Respond ONLY with valid JSON.
Title: ${title}
Description: ${description}

JSON response:
{"suggestedCategory":"Roads","suggestedDepartment":"Roads Department","confidence":0.95,"keywords":["pothole"],"urgencyScore":7,"sentiment":"frustrated","priority":"high","isSpam":false}

Categories: Roads, Sanitation, Water, Electricity, Parks, Drainage, Noise, Others
priority: low/medium/high/critical. urgencyScore: 1-10.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    result.method = 'ai';
    return result;
  } catch (err) {
    // Silent fallback - keyword classification is good enough
    return classifyByKeywords(`${title} ${description}`);
  }
};

// ─── Translation ─────────────────────────────────────────────────────────────
const translateToEnglish = async (text, fromLanguage) => {
  if (fromLanguage === 'en' || !text) return text;
  if (!openai) return text;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Translate the following ${fromLanguage} text to English. Return only the translated text, nothing else.\n\nText: ${text}`,
      }],
      temperature: 0.1,
      max_tokens: 500,
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    logger.error('Translation failed:', err.message);
    return text;
  }
};

// ─── Spam Detection ──────────────────────────────────────────────────────────
const detectSpam = async (title, description) => {
  if (!openai) return { isSpam: false, confidence: 0 };

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Is this civic complaint spam, offensive, or clearly fake? Answer with JSON {"isSpam": true/false, "reason": "brief reason"}\n\nTitle: ${title}\nDescription: ${description}`,
      }],
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return { isSpam: false, reason: 'Check failed' };
  }
};

// ─── Urgency Escalation Check ─────────────────────────────────────────────────
const checkUrgency = async (issue) => {
  const text = `${issue.title} ${issue.description}`.toLowerCase();
  const urgentKeywords = ['accident', 'fire', 'flood', 'danger', 'emergency', 'collapse', 'explosion', 'injured', 'death', 'खतरा', 'आग', 'बाढ़'];
  const hasUrgent = urgentKeywords.some(k => text.includes(k));
  return { isUrgent: hasUrgent, urgencyScore: hasUrgent ? 9 : 5 };
};

// ─── AI Summary for Government ────────────────────────────────────────────────
const generateIssueSummary = async (issues) => {
  if (!openai || !issues.length) return null;

  try {
    const issueList = issues.slice(0, 20).map(i =>
      `- ${i.category}: ${i.title} (${i.status}, votes: ${i.voteCount})`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Summarize these civic issues for a government dashboard report. Be concise and actionable.\n\n${issueList}`,
      }],
      temperature: 0.3,
      max_tokens: 300,
    });
    return response.choices[0].message.content.trim();
  } catch {
    return null;
  }
};

module.exports = {
  classifyIssue,
  translateToEnglish,
  detectSpam,
  checkUrgency,
  generateIssueSummary,
  classifyByKeywords,
};
// Synchronous alias for use in fast path
exports.classifyByKeywordsSync = classifyByKeywords;
