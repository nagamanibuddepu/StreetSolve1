const { Comment } = require('../models/index');
const Issue = require('../models/Issue');
const { AppError } = require('../middleware/errorHandler');
const { translateToEnglish } = require('../services/aiService');
const { emitIssueUpdate } = require('../services/socketService');
const User = require('../models/User');

exports.addComment = async (req, res, next) => {
  try {
    const { text, language, parentComment } = req.body;
    const issue = await Issue.findById(req.params.issueId);
    if (!issue) return next(new AppError('Issue not found.', 404));
    let textTranslated;
    if (language && language !== 'en') textTranslated = await translateToEnglish(text, language);
    const comment = await Comment.create({ issue: issue._id, author: req.user._id, text: text.trim(), textTranslated, language: language || 'en', media: req.uploadedMedia || [], parentComment: parentComment || null });
    await comment.populate('author', 'name avatar role');
    await Issue.findByIdAndUpdate(issue._id, { $inc: { commentCount: 1 } });
    await User.findByIdAndUpdate(req.user._id, { $inc: { commentsPosted: 1 } });
    const io = req.app.get('io');
    if (io) emitIssueUpdate(io, issue._id, 'new:comment', comment);
    res.status(201).json({ success: true, data: comment });
  } catch (err) { next(err); }
};

exports.getComments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const comments = await Comment.find({ issue: req.params.issueId, parentComment: null }).sort({ isPinned: -1, createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)).populate('author', 'name avatar role');
    const total = await Comment.countDocuments({ issue: req.params.issueId });
    res.json({ success: true, data: comments, total });
  } catch (err) { next(err); }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return next(new AppError('Comment not found.', 404));
    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') return next(new AppError('Not authorized.', 403));
    await comment.deleteOne();
    await Issue.findByIdAndUpdate(comment.issue, { $inc: { commentCount: -1 } });
    res.json({ success: true, message: 'Comment deleted.' });
  } catch (err) { next(err); }
};

exports.likeComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return next(new AppError('Comment not found.', 404));
    const hasLiked = comment.likedBy.includes(req.user._id);
    if (hasLiked) { comment.likedBy.pull(req.user._id); comment.likes = Math.max(0, comment.likes - 1); }
    else { comment.likedBy.push(req.user._id); comment.likes += 1; }
    await comment.save();
    res.json({ success: true, data: { likes: comment.likes, hasLiked: !hasLiked } });
  } catch (err) { next(err); }
};
