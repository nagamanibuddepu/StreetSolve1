/**
 * Issues Controller – Full lifecycle with proper lifecycle notifications
 */
const Issue = require('../models/Issue');
const { Vote, Comment, GovernmentBody, Feedback } = require('../models/index');
const { AppError } = require('../middleware/errorHandler');
const { classifyIssue, translateToEnglish, detectSpam } = require('../services/aiService');
const { sendNotification, notifyNearbyUsers, notifyIssueStakeholders, notifyNewIssueNearby } = require('../services/notificationService');
const { emitIssueUpdate } = require('../services/socketService');
const User = require('../models/User');
const logger = require('../utils/logger');

// Route to nearest gov body
const routeToGovBody = async (coordinates) => {
  try {
    return await GovernmentBody.findOne({
      location: { $near: { $geometry: { type: 'Point', coordinates }, $maxDistance: 50000 } },
      isActive: true,
    });
  } catch { return null; }
};

// ─── Create Issue ─────────────────────────────────────────────────────────────
exports.createIssue = async (req, res, next) => {
  try {
    const { title, description, category, language, lat, lng, address, city, state, pincode, ward,
      isAnonymous, tags, inputMethod, formattedAddress } = req.body;

    if (!lat || !lng) return next(new AppError('Location (lat/lng) is required.', 400));
    const coordinates = [parseFloat(lng), parseFloat(lat)];
    // Normalize language to English for AI processing (avoids MongoDB ICU issues)
    const safeLanguage = 'en'; // AI services use English internally

    // AI Processing
    const [aiResult, spamCheck] = await Promise.all([
      classifyIssue(title, description, safeLanguage),
      detectSpam(title, description),
    ]);

    if (spamCheck.isSpam) return next(new AppError('Issue flagged as inappropriate content.', 400));

    let descTranslated = description;
    if (language && language !== 'en') {
      descTranslated = await translateToEnglish(description, language || 'en').catch(()=>description);
    }

    const finalCategory = category || aiResult.suggestedCategory || 'Others';
    const department = Issue.schema.statics
      ? (Issue.getDepartmentFromCategory ? Issue.getDepartmentFromCategory(finalCategory) : aiResult.suggestedDepartment || 'General')
      : (aiResult.suggestedDepartment || 'General');

    const govBody = await routeToGovBody(coordinates);
    const urgency = aiResult.urgencyScore || 5;
    const days = urgency >= 8 ? 3 : urgency >= 6 ? 5 : 7;
    const expectedResolutionDate = new Date(Date.now() + days * 24 * 3600 * 1000);

    // Map 'photo' → 'image' for inputMethod
    const normalizedMethod = inputMethod === 'photo' ? 'image' : (inputMethod || 'text');

    const issue = await Issue.create({
      title: title.trim(),
      description,
      descriptionTranslated: descTranslated !== description ? descTranslated : undefined,
      category: finalCategory,
      department,
      reportLang: language || 'en',
      media: req.uploadedMedia || [],
      location: {
        type: 'Point',
        coordinates,
        address: formattedAddress || address,
        city, state, pincode, ward,
        formattedAddress: formattedAddress || address,
      },
      reportedBy: req.user._id,
      isAnonymous: isAnonymous === true,
      routedTo: govBody?._id,
      routedToType: govBody?.type,
      aiClassification: aiResult,
      priority: urgency >= 8 ? 'critical' : urgency >= 6 ? 'high' : urgency >= 4 ? 'medium' : 'low',
      tags: tags || aiResult.keywords || [],
      inputMethod: normalizedMethod,
      expectedResolutionDate,
      statusHistory: [{ status: 'reported', changedBy: req.user._id, changedByRole: req.user.role, note: 'Issue reported' }],
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { issuesReported: 1 } });
    await issue.populate('reportedBy', 'name avatar role email phone');

    const io = req.app.get('io');
    if (io) io.emit('new:issue', issue);

    // ── Lifecycle notification: Issue Reported ────────────────────────────────
    if (!isAnonymous) {
      await sendNotification({
        io,
        user: issue.reportedBy,
        type: 'issue_reported',
        title: `📢 Issue Reported: ${issue.title}`,
        message: `Your issue has been successfully reported and routed to ${department}.`,
        data: {
          issueId: issue._id,
          issueTitle: issue.title,
          issueDescription: issue.description,
          location: formattedAddress || address || `${lat}, ${lng}`,
          department,
          reporterName: issue.reportedBy.name,
          priority: issue.priority,
        },
      });
    }

    // Notify nearby users of new issue
    await notifyNewIssueNearby({ io, issue });

    logger.info(`New issue: ${issue._id} by ${req.user._id}`);
    res.status(201).json({
      success: true,
      data: issue,
      message: `Issue reported and routed to ${govBody?.name || department}.`,
    });
  } catch (err) { next(err); }
};

// ─── Get Issues ───────────────────────────────────────────────────────────────
exports.getIssues = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, category, department, search, lat, lng, radius,
      sortBy = 'createdAt', trending, priority, govBody } = req.query;

    const query = {};
    if (status) query.status = { $in: status.split(',') };
    if (category) query.category = { $in: category.split(',') };
    if (department) query.department = department;
    if (priority) query.priority = priority;
    if (trending === 'true') query.trending = true;
    if (govBody) query.routedTo = govBody;
    if (search) query.$text = { $search: search };
    if (lat && lng) {
      query.location = { $near: { $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }, $maxDistance: parseInt(radius) || 10000 } };
    }

    const sortMap = {
      createdAt: { createdAt: -1 }, votes: { voteCount: -1 },
      trending: { trendingScore: -1 }, comments: { commentCount: -1 },
    };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [issues, total] = await Promise.all([
      Issue.find(query).sort(sortMap[sortBy] || { createdAt: -1 }).skip(skip).limit(parseInt(limit))
        .populate('reportedBy', 'name avatar role').populate('assignedVolunteer', 'name avatar')
        .populate('routedTo', 'name type').lean(),
      Issue.countDocuments(query),
    ]);

    let votedIssueIds = new Set();
    if (req.user) {
      const votes = await Vote.find({ user: req.user._id, issue: { $in: issues.map(i => i._id) } });
      votes.forEach(v => votedIssueIds.add(v.issue.toString()));
    }

    res.json({
      success: true,
      data: issues.map(i => ({ ...i, hasVoted: votedIssueIds.has(i._id.toString()) })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)), hasNext: skip + issues.length < total },
    });
  } catch (err) { next(err); }
};

// ─── Get Single Issue ─────────────────────────────────────────────────────────
exports.getIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reportedBy', 'name avatar role')
      .populate('assignedVolunteer', 'name avatar organization')
      .populate('routedTo', 'name type contact')
      .populate('resolvedBy', 'name avatar')
      .populate('statusHistory.changedBy', 'name role');
    if (!issue) return next(new AppError('Issue not found.', 404));
    Issue.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).exec();

    const comments = await Comment.find({ issue: issue._id, parentComment: null })
      .sort({ isPinned: -1, createdAt: -1 }).limit(20).populate('author', 'name avatar role');

    let hasVoted = false, userFeedback = null;
    if (req.user) {
      const vote = await Vote.findOne({ issue: issue._id, user: req.user._id });
      hasVoted = !!vote;
      userFeedback = await Feedback.findOne({ issue: issue._id, user: req.user._id });
    }
    res.json({ success: true, data: { ...issue.toObject(), comments, hasVoted, userFeedback } });
  } catch (err) { next(err); }
};

// ─── Update Status with full lifecycle notifications ──────────────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, note, department } = req.body;
    const issue = await Issue.findById(req.params.id)
      .populate('reportedBy', 'name email phone notificationPrefs')
      .populate('assignedVolunteer', 'name email phone notificationPrefs');
    if (!issue) return next(new AppError('Issue not found.', 404));

    const validTransitions = {
      reported: ['accepted', 'rejected', 'duplicate'],
      accepted: ['inprogress', 'rejected'],
      inprogress: ['completed', 'accepted'],
      completed: ['verified', 'reopened'],
      verified: [],
      reopened: ['accepted', 'inprogress'],
      rejected: [], duplicate: [],
    };
    if (!validTransitions[issue.status]?.includes(status)) {
      return next(new AppError(`Cannot transition from '${issue.status}' to '${status}'.`, 400));
    }

    issue.status = status;
    issue.statusHistory.push({ status, changedBy: req.user._id, changedByRole: req.user.role, note: note || '' });
    if (department) issue.department = department;

    if (status === 'inprogress' && req.user.role === 'volunteer') {
      issue.assignedVolunteer = req.user._id;
      issue.assignedAt = new Date();
    }
    if (status === 'completed') {
      issue.resolvedBy = req.user._id;
      issue.resolvedAt = new Date();
      issue.feedback.notifiedAt = new Date();
      issue.feedback.deadlineAt = new Date(Date.now() + 4 * 24 * 3600 * 1000);
      issue.feedback.notified = true;
    }
    if (status === 'verified') { issue.verifiedBy = req.user._id; issue.verifiedAt = new Date(); }

    await issue.save();
    const io = req.app.get('io');
    if (io) emitIssueUpdate(io, issue._id, 'issue:updated', { _id: issue._id, status, note });

    // ── Lifecycle notifications per status ────────────────────────────────────
    const notifConfig = {
      accepted: {
        type: 'issue_accepted', title: `✅ Issue Accepted`,
        message: `Your issue "${issue.title}" has been accepted by ${issue.department}.`,
        data: { issueId: issue._id, issueTitle: issue.title, department: issue.department, location: issue.location?.formattedAddress || issue.location?.address },
      },
      inprogress: {
        type: 'issue_inprogress', title: `🔧 Work Started on Your Issue`,
        message: `Work has started on your issue "${issue.title}".`,
        data: { issueId: issue._id, issueTitle: issue.title, assignedTo: req.user.name, department: issue.department },
      },
      completed: {
        type: 'issue_completed', title: `🎉 Issue Resolved!`,
        message: `Your issue "${issue.title}" has been marked as resolved. Please give feedback!`,
        data: { issueId: issue._id, issueTitle: issue.title, resolvedBy: req.user.name, location: issue.location?.formattedAddress || issue.location?.address },
      },
      verified: {
        type: 'issue_verified', title: `⭐ Issue Fully Verified`,
        message: `Issue "${issue.title}" has been verified and fully resolved.`,
        data: { issueId: issue._id, issueTitle: issue.title, satisfactionScore: issue.satisfactionScore },
      },
      reopened: {
        type: 'issue_reopened', title: `🔄 Issue Reopened`,
        message: `Issue "${issue.title}" has been reopened due to low satisfaction.`,
        data: { issueId: issue._id, issueTitle: issue.title },
      },
    };

    if (notifConfig[status]) {
      const cfg = notifConfig[status];
      // Notify reporter + all stakeholders
      await notifyIssueStakeholders({ io, issue, ...cfg, excludeUserId: req.user._id });

      // On completion: notify nearby users for feedback
      if (status === 'completed') {
        const count = await notifyNearbyUsers({ io, issue, radius: 5000, excludeUserId: req.user._id });
        logger.info(`Notified ${count} nearby users for feedback on issue ${issue._id}`);
      }
    }

    res.json({ success: true, data: issue, message: `Status updated to ${status}.` });
  } catch (err) { next(err); }
};

// ─── Submit Feedback ──────────────────────────────────────────────────────────
exports.submitFeedback = async (req, res, next) => {
  try {
    const { satisfied, comment } = req.body;
    const issue = await Issue.findById(req.params.id);
    if (!issue) return next(new AppError('Issue not found.', 404));
    if (!['completed', 'verified', 'reopened'].includes(issue.status)) {
      return next(new AppError('Can only give feedback on completed issues.', 400));
    }
    const existing = await Feedback.findOne({ issue: issue._id, user: req.user._id });
    if (existing) return next(new AppError('You have already given feedback for this issue.', 409));

    const geolib = require('geolib');
    let distance = null;
    if (req.user.location?.coordinates) {
      distance = geolib.getDistance(
        { latitude: req.user.location.coordinates[1], longitude: req.user.location.coordinates[0] },
        { latitude: issue.location.coordinates[1], longitude: issue.location.coordinates[0] }
      );
    }

    await Feedback.create({ issue: issue._id, user: req.user._id, satisfied, comment, distance });
    issue.feedback[satisfied ? 'yes' : 'no'] += 1;
    issue.feedback.total += 1;
    const score = Math.round((issue.feedback.yes / issue.feedback.total) * 100);
    issue.satisfactionScore = score;

    if (score < 70 && issue.status === 'completed') {
      issue.status = 'reopened';
      issue.statusHistory.push({ status: 'reopened', note: `Auto-reopened: satisfaction ${score}% < 70% threshold.` });
      const io = req.app.get('io');
      if (io) emitIssueUpdate(io, issue._id, 'issue:updated', { _id: issue._id, status: 'reopened' });

      // Notify reporter issue was reopened
      const reporter = await User.findById(issue.reportedBy);
      if (reporter) {
        await sendNotification({
          io, user: reporter,
          type: 'issue_reopened',
          title: '🔄 Issue Reopened',
          message: `Issue "${issue.title}" was reopened — satisfaction score ${score}% is below 70%.`,
          data: { issueId: issue._id, issueTitle: issue.title },
        });
      }
    }

    await issue.save();
    res.json({
      success: true,
      data: { satisfactionScore: score, status: issue.status },
      message: satisfied ? 'Thank you for your positive feedback!' : 'Feedback recorded. Issue will be reviewed.',
    });
  } catch (err) { next(err); }
};

// ─── Vote ─────────────────────────────────────────────────────────────────────
exports.voteIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return next(new AppError('Issue not found.', 404));
    const existing = await Vote.findOne({ issue: issue._id, user: req.user._id });
    if (existing) {
      await Vote.findByIdAndDelete(existing._id);
      issue.voteCount = Math.max(0, issue.voteCount - 1);
      await issue.save();
      return res.json({ success: true, data: { voteCount: issue.voteCount, hasVoted: false } });
    }
    await Vote.create({ issue: issue._id, user: req.user._id });
    issue.voteCount += 1;
    await issue.save();
    await User.findByIdAndUpdate(req.user._id, { $inc: { votesGiven: 1 } });
    res.json({ success: true, data: { voteCount: issue.voteCount, hasVoted: true } });
  } catch (err) { next(err); }
};

// ─── Get Nearby Issues ────────────────────────────────────────────────────────
exports.getNearbyIssues = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000, limit = 20 } = req.query;
    if (!lat || !lng) return next(new AppError('lat and lng are required.', 400));
    const issues = await Issue.find({
      location: { $near: { $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }, $maxDistance: parseInt(radius) } },
      status: { $nin: ['verified', 'rejected'] },
    }).limit(parseInt(limit)).populate('reportedBy', 'name avatar').lean();
    res.json({ success: true, data: issues, count: issues.length });
  } catch (err) { next(err); }
};

// ─── Volunteer Takes Issue ─────────────────────────────────────────────────────
exports.takeIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id).populate('reportedBy', 'name email phone notificationPrefs');
    if (!issue) return next(new AppError('Issue not found.', 404));
    if (issue.assignedVolunteer) return next(new AppError('Issue already taken by another volunteer.', 409));
    if (!['reported', 'accepted'].includes(issue.status)) {
      return next(new AppError('Issue not available for volunteers.', 400));
    }

    // Check volunteer is verified
    const volunteer = await User.findById(req.user._id);
    if (!volunteer.volunteerVerified && !volunteer.aadhaarVerified) {
      return next(new AppError('Please complete volunteer verification (Aadhaar + address) before taking issues.', 403));
    }

    issue.assignedVolunteer = req.user._id;
    issue.assignedAt = new Date();
    issue.status = 'inprogress';
    issue.statusHistory.push({ status: 'inprogress', changedBy: req.user._id, changedByRole: 'volunteer', note: `Volunteer ${req.user.name} has taken this issue.` });
    await issue.save();
    await User.findByIdAndUpdate(req.user._id, { $push: { issuesTaken: issue._id } });

    const io = req.app.get('io');
    await sendNotification({
      io, user: issue.reportedBy,
      type: 'issue_inprogress',
      title: '🤝 Volunteer Assigned!',
      message: `${req.user.name} has taken your issue and is working on it.`,
      data: { issueId: issue._id, issueTitle: issue.title, assignedTo: req.user.name },
    });

    await issue.populate('assignedVolunteer', 'name avatar organization');
    res.json({ success: true, data: issue, message: 'You have successfully taken this issue!' });
  } catch (err) { next(err); }
};

// ─── Delete Issue ─────────────────────────────────────────────────────────────
exports.deleteIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return next(new AppError('Issue not found.', 404));
    if (issue.reportedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new AppError('Not authorized.', 403));
    }
    await Issue.findByIdAndDelete(req.params.id);
    await Vote.deleteMany({ issue: req.params.id });
    await Comment.deleteMany({ issue: req.params.id });
    res.json({ success: true, message: 'Issue deleted.' });
  } catch (err) { next(err); }
};

exports.getIssuesByGovBody = async (req, res, next) => {
  try {
    const { govBodyId } = req.params;
    const { status, department, page = 1, limit = 20 } = req.query;
    const query = { routedTo: govBodyId };
    if (status) query.status = { $in: status.split(',') };
    if (department) query.department = department;
    const [issues, total] = await Promise.all([
      Issue.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit))
        .populate('reportedBy', 'name').populate('assignedVolunteer', 'name'),
      Issue.countDocuments(query),
    ]);
    res.json({ success: true, data: issues, total, page: parseInt(page) });
  } catch (err) { next(err); }
};
