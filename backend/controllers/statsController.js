const Issue = require('../models/Issue');
const User = require('../models/User');
const { Vote, Comment, GovernmentBody } = require('../models/index');
const { generateIssueSummary } = require('../services/aiService');

exports.getGlobalStats = async (req, res, next) => {
  try {
    const [totalIssues, resolvedIssues, totalUsers, totalVotes, recentIssues, categoryBreakdown, statusBreakdown] = await Promise.all([
      Issue.countDocuments(),
      Issue.countDocuments({ status: { $in: ['completed', 'verified'] } }),
      User.countDocuments({ isActive: true }),
      Vote.countDocuments(),
      Issue.find().sort({ createdAt: -1 }).limit(5).select('title status category createdAt').lean(),
      Issue.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Issue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const satisfactionData = await Issue.aggregate([
      { $match: { satisfactionScore: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$satisfactionScore' }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalIssues, resolvedIssues, totalUsers, totalVotes,
        resolutionRate: totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0,
        avgSatisfaction: Math.round(satisfactionData[0]?.avg || 0),
        recentIssues, categoryBreakdown, statusBreakdown,
      },
    });
  } catch (err) { next(err); }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    if (role === 'government') {
      const govBody = await GovernmentBody.findOne({ $or: [{ admin: userId }, { staff: userId }] });
      const query = govBody ? { routedTo: govBody._id } : {};
      const [total, pending, resolved, inprogress, departmentBreakdown] = await Promise.all([
        Issue.countDocuments(query),
        Issue.countDocuments({ ...query, status: { $in: ['reported', 'accepted'] } }),
        Issue.countDocuments({ ...query, status: { $in: ['completed', 'verified'] } }),
        Issue.countDocuments({ ...query, status: 'inprogress' }),
        Issue.aggregate([{ $match: query }, { $group: { _id: '$department', count: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ['$status', ['completed', 'verified']] }, 1, 0] } } } }]),
      ]);

      const issues = await Issue.find(query).sort({ createdAt: -1 }).limit(10).populate('reportedBy', 'name').lean();
      const aiSummary = await generateIssueSummary(issues);
      return res.json({ success: true, data: { total, pending, resolved, inprogress, departmentBreakdown, recentIssues: issues, aiSummary, govBody } });
    }

    if (role === 'volunteer' || role === 'ngo') {
      const [taken, resolved, available] = await Promise.all([
        Issue.countDocuments({ assignedVolunteer: userId }),
        Issue.countDocuments({ assignedVolunteer: userId, status: { $in: ['completed', 'verified'] } }),
        Issue.countDocuments({ status: { $in: ['reported', 'accepted'] }, assignedVolunteer: null }),
      ]);
      const myIssues = await Issue.find({ assignedVolunteer: userId }).sort({ createdAt: -1 }).limit(10).lean();
      return res.json({ success: true, data: { taken, resolved, available, myIssues } });
    }

    // Citizen
    const [reported, resolved, voted] = await Promise.all([
      Issue.countDocuments({ reportedBy: userId }),
      Issue.countDocuments({ reportedBy: userId, status: { $in: ['completed', 'verified'] } }),
      Vote.countDocuments({ user: userId }),
    ]);
    const myIssues = await Issue.find({ reportedBy: userId }).sort({ createdAt: -1 }).limit(10).lean();
    res.json({ success: true, data: { reported, resolved, voted, myIssues } });
  } catch (err) { next(err); }
};
