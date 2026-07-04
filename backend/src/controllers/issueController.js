/**
 * Issue Controller - Fast response: saves issue first, runs AI/notifications async
 * Target: <500ms response time for issue creation
 */
const Issue = require('../models/Issue');
const { Vote, Comment, GovernmentBody, Feedback } = require('../models/index');
const { AppError } = require('../middleware/errorHandler');
const { classifyIssue, translateToEnglish, detectSpam } = require('../services/aiService');
const { sendNotification, notifyNearbyUsers, notifyIssueStakeholders, notifyNewIssueNearby, notifyGovernmentBodies } = require('../services/notificationService');
const { emitIssueUpdate } = require('../services/socketService');
const User = require('../models/User');
const logger = require('../utils/logger');

const routeToGovBody = async (coordinates) => {
  try {
    return await GovernmentBody.findOne({
      location: { $near: { $geometry: { type: 'Point', coordinates }, $maxDistance: 50000 } },
      isActive: true,
    });
  } catch { return null; }
};

// ─── Create Issue (Fast path) ─────────────────────────────────────────────────
exports.createIssue = async (req, res, next) => {
  try {
    const { title, description, category, language, lat, lng, address,
      city, state, pincode, ward, isAnonymous, tags, inputMethod, formattedAddress } = req.body;

    if (!lat || !lng) return next(new AppError('Location (lat/lng) is required.', 400));
    const coordinates = [parseFloat(lng), parseFloat(lat)];

    // Quick keyword classification (sync, <1ms)
    const { classifyByKeywordsSync } = require('../services/aiService');
    const quickResult = classifyByKeywordsSync(`${title} ${description}`);
    const finalCategory = category || quickResult.suggestedCategory || 'Others';
    const department = getDeptFromCategory(finalCategory);

    // Geo routing (fast MongoDB query, ~50ms)
    const govBody = await routeToGovBody(coordinates);
    const expectedResolutionDate = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const normalizedMethod = inputMethod === 'photo' ? 'image' : (inputMethod || 'text');

    // Save issue immediately (fast path)
    const issue = await Issue.create({
      title: title?.trim(),
      description,
      category: finalCategory,
      department,
      reportLang: language || 'en',
      media: req.uploadedMedia || [],
      location: {
        type: 'Point', coordinates,
        address: formattedAddress || address,
        city, state, pincode, ward,
        formattedAddress: formattedAddress || address,
      },
      reportedBy: req.user._id,
      isAnonymous: isAnonymous === 'true' || isAnonymous === true,
      routedTo: govBody?._id,
      routedToType: govBody?.type,
      aiClassification: quickResult,
      priority: 'medium',
      tags: tags || quickResult.keywords || [],
      inputMethod: normalizedMethod,
      expectedResolutionDate,
      statusHistory: [{ status: 'reported', changedBy: req.user._id, changedByRole: req.user.role, note: 'Issue reported' }],
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { issuesReported: 1 } });
    const populated = await issue.populate('reportedBy', 'name avatar role email phone');
    const io = req.app.get('io');

    // Respond immediately - don't wait for AI/notifications
    res.status(201).json({
      success: true,
      data: populated,
      message: `Issue reported and routed to ${govBody?.name || department}.`,
    });

    // Run AI classification, translation, and notifications in background (non-blocking)
    setImmediate(async () => {
      try {
        const [aiResult] = await Promise.all([
          classifyIssue(title, description, 'en').catch(() => quickResult),
        ]);

        // Update with AI results
        const updates = { aiClassification: aiResult };
        if (aiResult.suggestedCategory && aiResult.suggestedCategory !== finalCategory) {
          updates.category = aiResult.suggestedCategory;
          updates.department = getDeptFromCategory(aiResult.suggestedCategory);
        }
        if (aiResult.urgencyScore >= 8) updates.priority = 'critical';
        else if (aiResult.urgencyScore >= 6) updates.priority = 'high';
        else if (aiResult.urgencyScore >= 4) updates.priority = 'medium';

        // Translate description if non-English
        if (language && language !== 'en') {
          const translated = await translateToEnglish(description, language).catch(() => null);
          if (translated) updates.descriptionTranslated = translated;
        }

        await Issue.findByIdAndUpdate(issue._id, updates);

        // Emit real-time update to all connected clients
        if (io) {
          io.emit('new:issue', { ...issue.toObject(), ...updates });
          // Notify government body rooms
          if (govBody) {
            io.to(`govbody:${govBody._id}`).emit('new:issue:gov', {
              issueId: issue._id,
              title: issue.title,
              category: updates.category || finalCategory,
              location: issue.location?.formattedAddress,
              priority: updates.priority || 'medium',
              reporter: populated.reportedBy?.name,
            });
          }
        }

        // Notifications (background)
        if (!isAnonymous) {
          await sendNotification({
            io, user: populated.reportedBy,
            type: 'issue_reported',
            title: `Issue Reported: ${issue.title}`,
            message: `Routed to ${updates.department || department}.`,
            data: { issueId: issue._id, issueTitle: issue.title, department: updates.department || department,
              location: formattedAddress || address, reporterName: populated.reportedBy?.name, priority: updates.priority || 'medium' },
          });
        }

        // Notify nearby citizens
        await notifyNewIssueNearby({ io, issue: { ...issue.toObject(), location: issue.location } });
        await notifyGovernmentBodies({ io, issue: { ...issue.toObject(), location: issue.location } });
      } catch (bgErr) {
        logger.warn('Background processing error:', bgErr.message);
      }
    });

  } catch (err) { next(err); }
};

const getDeptFromCategory = (cat) => ({
  Roads: 'Roads Department', Sanitation: 'Sanitation Department',
  Water: 'Water Department', Electricity: 'Electricity Department',
  Parks: 'Parks Department', Drainage: 'Drainage Department',
  Noise: 'Noise & Environment Department', Others: 'General',
}[cat] || 'General');

// ─── Get Issues ───────────────────────────────────────────────────────────────
exports.getIssues = async (req, res, next) => {
  try {
    const { page=1, limit=20, status, category, department, search, lat, lng, radius, sortBy='createdAt', trending, priority } = req.query;
    const query = {};
    if (status) query.status = { $in: status.split(',') };
    if (category) query.category = { $in: category.split(',') };
    if (department) query.department = department;
    if (priority) query.priority = priority;
    if (trending === 'true') query.trending = true;
    if (search) query.$text = { $search: search };
    if (lat && lng) {
      query.location = { $near: { $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }, $maxDistance: parseInt(radius) || 10000 } };
    }
    const sortMap = { createdAt: { createdAt: -1 }, votes: { voteCount: -1 }, trending: { trendingScore: -1 } };
    const skip = (parseInt(page)-1)*parseInt(limit);
    const [issues, total] = await Promise.all([
      Issue.find(query).sort(sortMap[sortBy] || { createdAt: -1 }).skip(skip).limit(parseInt(limit))
        .populate('reportedBy', 'name avatar role').lean(),
      Issue.countDocuments(query),
    ]);
    let votedIds = new Set();
    if (req.user) {
      const votes = await Vote.find({ user: req.user._id, issue: { $in: issues.map(i=>i._id) } });
      votes.forEach(v => votedIds.add(v.issue.toString()));
    }
    res.json({ success:true, data: issues.map(i=>({...i, hasVoted: votedIds.has(i._id.toString())})),
      pagination: { page:parseInt(page), limit:parseInt(limit), total, pages:Math.ceil(total/parseInt(limit)), hasNext: skip+issues.length<total } });
  } catch(err){ next(err); }
};

// ─── Get Single Issue ─────────────────────────────────────────────────────────
exports.getIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reportedBy','name avatar role')
      .populate('assignedVolunteer','name avatar organization')
      .populate('routedTo','name type contact')
      .populate('resolvedBy','name avatar')
      .populate('statusHistory.changedBy','name role');
    if (!issue) return next(new AppError('Issue not found.', 404));
    Issue.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).exec();
    const comments = await Comment.find({ issue: issue._id, parentComment: null })
      .sort({ createdAt: -1 }).limit(20).populate('author','name avatar role');
    let hasVoted=false, userFeedback=null;
    if (req.user) {
      const vote = await Vote.findOne({ issue: issue._id, user: req.user._id });
      hasVoted = !!vote;
      userFeedback = await Feedback.findOne({ issue: issue._id, user: req.user._id });
    }
    res.json({ success:true, data: { ...issue.toObject(), comments, hasVoted, userFeedback } });
  } catch(err){ next(err); }
};

// ─── Update Status ────────────────────────────────────────────────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, note, department } = req.body;
    const issue = await Issue.findById(req.params.id)
      .populate('reportedBy','name email phone notificationPrefs')
      .populate('assignedVolunteer','name email phone notificationPrefs');
    if (!issue) return next(new AppError('Issue not found.', 404));

    const validTransitions = {
      reported:['accepted','rejected','duplicate'], accepted:['inprogress','rejected'],
      inprogress:['completed','accepted'], completed:['verified','reopened'],
      verified:[], reopened:['accepted','inprogress'], rejected:[], duplicate:[],
    };
    if (!validTransitions[issue.status]?.includes(status))
      return next(new AppError(`Cannot transition from '${issue.status}' to '${status}'.`, 400));

    issue.status = status;
    issue.statusHistory.push({ status, changedBy: req.user._id, changedByRole: req.user.role, note: note||'' });
    if (department) issue.department = department;
    if (status==='inprogress' && req.user.role==='volunteer') { issue.assignedVolunteer=req.user._id; issue.assignedAt=new Date(); }
    if (status==='completed') { issue.resolvedBy=req.user._id; issue.resolvedAt=new Date(); issue.feedback.notifiedAt=new Date(); issue.feedback.deadlineAt=new Date(Date.now()+4*24*3600000); issue.feedback.notified=true; }
    if (status==='verified') { issue.verifiedBy=req.user._id; issue.verifiedAt=new Date(); }
    await issue.save();

    const io = req.app.get('io');
    if (io) emitIssueUpdate(io, issue._id, 'issue:updated', { _id: issue._id, status, note });

    res.json({ success:true, data:issue, message:`Status updated to ${status}.` });

    // Background notifications
    setImmediate(async () => {
      try {
        const notifConfig = {
          accepted: { type:'issue_accepted', title:`Issue Accepted`, message:`Your issue "${issue.title}" accepted by ${issue.department}.`, data:{ issueId:issue._id, issueTitle:issue.title, department:issue.department } },
          inprogress: { type:'issue_inprogress', title:`Work Started`, message:`Work started on "${issue.title}".`, data:{ issueId:issue._id, issueTitle:issue.title, assignedTo:req.user.name } },
          completed: { type:'issue_completed', title:`Issue Resolved!`, message:`Your issue "${issue.title}" resolved! Please give feedback.`, data:{ issueId:issue._id, issueTitle:issue.title, resolvedBy:req.user.name } },
          verified: { type:'issue_verified', title:`Issue Verified`, message:`Issue "${issue.title}" fully verified.`, data:{ issueId:issue._id, issueTitle:issue.title, satisfactionScore:issue.satisfactionScore } },
          reopened: { type:'issue_reopened', title:`Issue Reopened`, message:`Issue "${issue.title}" reopened.`, data:{ issueId:issue._id, issueTitle:issue.title } },
        };
        if (notifConfig[status]) {
          await notifyIssueStakeholders({ io, issue, ...notifConfig[status], excludeUserId: req.user._id });
          if (status==='completed') await notifyNearbyUsers({ io, issue, radius:5000, excludeUserId: req.user._id });
        }
      } catch(e) { logger.warn('Status notification error:', e.message); }
    });
  } catch(err){ next(err); }
};

// ─── Submit Feedback ──────────────────────────────────────────────────────────
exports.submitFeedback = async (req, res, next) => {
  try {
    const { satisfied, comment } = req.body;
    const issue = await Issue.findById(req.params.id);
    if (!issue) return next(new AppError('Issue not found.', 404));
    if (!['completed','verified','reopened'].includes(issue.status)) return next(new AppError('Can only give feedback on completed issues.', 400));
    if (await Feedback.findOne({ issue: issue._id, user: req.user._id })) return next(new AppError('Already submitted feedback.', 409));
    await Feedback.create({ issue: issue._id, user: req.user._id, satisfied, comment });
    issue.feedback[satisfied ? 'yes' : 'no'] += 1;
    issue.feedback.total += 1;
    const score = Math.round((issue.feedback.yes / issue.feedback.total) * 100);
    issue.satisfactionScore = score;
    if (score < 70 && issue.status === 'completed') {
      issue.status = 'reopened';
      issue.statusHistory.push({ status:'reopened', note:`Auto-reopened: satisfaction ${score}% < 70% threshold.` });
    }
    await issue.save();
    res.json({ success:true, data:{ satisfactionScore:score, status:issue.status } });
  } catch(err){ next(err); }
};

// ─── Vote ─────────────────────────────────────────────────────────────────────
exports.voteIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return next(new AppError('Issue not found.', 404));
    const existing = await Vote.findOne({ issue: issue._id, user: req.user._id });
    if (existing) {
      await Vote.findByIdAndDelete(existing._id);
      issue.voteCount = Math.max(0, issue.voteCount-1);
      await issue.save();
      return res.json({ success:true, data:{ voteCount:issue.voteCount, hasVoted:false } });
    }
    await Vote.create({ issue: issue._id, user: req.user._id });
    issue.voteCount += 1;
    await issue.save();
    await User.findByIdAndUpdate(req.user._id, { $inc: { votesGiven: 1 } });
    res.json({ success:true, data:{ voteCount:issue.voteCount, hasVoted:true } });
  } catch(err){ next(err); }
};

// ─── Nearby Issues ────────────────────────────────────────────────────────────
exports.getNearbyIssues = async (req, res, next) => {
  try {
    const { lat, lng, radius=5000, limit=20 } = req.query;
    if (!lat || !lng) return next(new AppError('lat and lng required.', 400));
    const issues = await Issue.find({
      location: { $near: { $geometry: { type:'Point', coordinates:[parseFloat(lng),parseFloat(lat)] }, $maxDistance:parseInt(radius) } },
      status: { $nin: ['verified','rejected'] },
    }).limit(parseInt(limit)).populate('reportedBy','name avatar').lean();
    res.json({ success:true, data:issues, count:issues.length });
  } catch(err){ next(err); }
};

// ─── Take Issue (Volunteer) ───────────────────────────────────────────────────
exports.takeIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id).populate('reportedBy','name email phone notificationPrefs');
    if (!issue) return next(new AppError('Issue not found.', 404));
    if (issue.assignedVolunteer) return next(new AppError('Already taken by another volunteer.', 409));
    if (!['reported','accepted'].includes(issue.status)) return next(new AppError('Not available.', 400));
    const volunteer = await User.findById(req.user._id);
    if (!volunteer.volunteerVerified && !volunteer.aadhaarVerified) return next(new AppError('Please verify your Aadhaar first.', 403));
    issue.assignedVolunteer = req.user._id;
    issue.assignedAt = new Date();
    issue.status = 'inprogress';
    issue.statusHistory.push({ status:'inprogress', changedBy:req.user._id, changedByRole:'volunteer', note:`Volunteer ${req.user.name} has taken this issue.` });
    await issue.save();
    await User.findByIdAndUpdate(req.user._id, { $push: { issuesTaken: issue._id } });
    await issue.populate('assignedVolunteer','name avatar organization');
    res.json({ success:true, data:issue });
    setImmediate(() => sendNotification({ io:req.app.get('io'), user:issue.reportedBy, type:'issue_inprogress', title:'Volunteer Assigned!', message:`${req.user.name} is working on your issue.`, data:{ issueId:issue._id, issueTitle:issue.title } }).catch(()=>{}));
  } catch(err){ next(err); }
};

// ─── Delete Issue ─────────────────────────────────────────────────────────────
exports.deleteIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return next(new AppError('Issue not found.', 404));
    if (issue.reportedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return next(new AppError('Not authorized.', 403));
    await Issue.findByIdAndDelete(req.params.id);
    await Promise.all([Vote.deleteMany({ issue:req.params.id }), Comment.deleteMany({ issue:req.params.id })]);
    res.json({ success:true, message:'Issue deleted.' });
  } catch(err){ next(err); }
};

exports.getIssuesByGovBody = async (req, res, next) => {
  try {
    const { govBodyId } = req.params;
    const { status, department, page=1, limit=20 } = req.query;
    const query = { routedTo: govBodyId };
    if (status) query.status = { $in: status.split(',') };
    if (department) query.department = department;
    const [issues, total] = await Promise.all([
      Issue.find(query).sort({ createdAt:-1 }).skip((page-1)*limit).limit(parseInt(limit)).populate('reportedBy','name').lean(),
      Issue.countDocuments(query),
    ]);
    res.json({ success:true, data:issues, total, page:parseInt(page) });
  } catch(err){ next(err); }
};
