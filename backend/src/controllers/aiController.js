const { classifyIssue, translateToEnglish, detectSpam, generateIssueSummary } = require('../services/aiService');
const Issue = require('../models/Issue');
const { AppError } = require('../middleware/errorHandler');

exports.classify = async (req, res, next) => {
  try {
    const { title, description, language } = req.body;
    if (!title || !description) return next(new AppError('title and description required', 400));
    const result = await classifyIssue(title, description, language);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.translate = async (req, res, next) => {
  try {
    const { text, from } = req.body;
    if (!text || !from) return next(new AppError('text and from language required', 400));
    const translated = await translateToEnglish(text, from);
    res.json({ success: true, data: { original: text, translated, from } });
  } catch (err) { next(err); }
};

exports.aiSummary = async (req, res, next) => {
  try {
    const { govBodyId } = req.query;
    const query = govBodyId ? { routedTo: govBodyId } : {};
    const issues = await Issue.find(query).sort({ createdAt: -1 }).limit(20).lean();
    const summary = await generateIssueSummary(issues);
    res.json({ success: true, data: { summary, issueCount: issues.length } });
  } catch (err) { next(err); }
};
