/**
 * Cron Jobs – Auto feedback deadline, overdue detection, trending refresh
 */
const cron = require('node-cron');
const Issue = require('../models/Issue');
const { Notification } = require('../models/index');
const logger = require('../utils/logger');

let ioInstance;

const startCronJobs = (io) => {
  ioInstance = io;

  // ── Every hour: Check feedback deadlines ──────────────────────────────────
  cron.schedule('0 * * * *', async () => {
    logger.info('⏰ Running feedback deadline check...');
    try {
      const now = new Date();

      // Issues where deadline passed and satisfaction not yet calculated
      const issues = await Issue.find({
        status: 'completed',
        'feedback.notified': true,
        'feedback.deadlineAt': { $lt: now },
        satisfactionScore: { $exists: false },
      });

      for (const issue of issues) {
        const total = issue.feedback.yes + issue.feedback.no;
        if (total === 0) {
          // No feedback received – auto-resolve successfully
          issue.satisfactionScore = 100;
          issue.status = 'verified';
          issue.feedback.autoResolvedAt = now;
          await issue.save();
          logger.info(`Auto-resolved issue ${issue._id} (no feedback received)`);
        }
      }
    } catch (err) {
      logger.error('Feedback deadline cron failed:', err.message);
    }
  });

  // ── Every 6 hours: Detect overdue issues ──────────────────────────────────
  cron.schedule('0 */6 * * *', async () => {
    logger.info('⏰ Checking for overdue issues...');
    try {
      const overdueIssues = await Issue.find({
        status: { $in: ['reported', 'accepted', 'inprogress'] },
        expectedResolutionDate: { $lt: new Date() },
        overdue: false,
      });

      for (const issue of overdueIssues) {
        issue.overdue = true;
        await issue.save();
      }

      if (overdueIssues.length > 0) {
        logger.info(`Marked ${overdueIssues.length} issues as overdue`);
      }
    } catch (err) {
      logger.error('Overdue check cron failed:', err.message);
    }
  });

  // ── Every 30 min: Refresh trending scores ─────────────────────────────────
  cron.schedule('*/30 * * * *', async () => {
    try {
      const activeIssues = await Issue.find({
        status: { $in: ['reported', 'accepted', 'inprogress'] },
      }).select('_id voteCount commentCount createdAt');

      for (const issue of activeIssues) {
        const ageHours = (Date.now() - issue.createdAt) / 3600000;
        issue.trendingScore = (issue.voteCount + issue.commentCount * 2) / Math.pow(ageHours + 2, 1.5);
        issue.trending = issue.trendingScore > 2;
        await issue.save();
      }
    } catch (err) {
      logger.error('Trending refresh failed:', err.message);
    }
  });

  // ── Daily: Stats rollup ───────────────────────────────────────────────────
  cron.schedule('0 0 * * *', async () => {
    logger.info('⏰ Running daily stats rollup...');
    try {
      const { GovernmentBody } = require('../models/index');
      const bodies = await GovernmentBody.find({ isActive: true });

      for (const body of bodies) {
        const total = await Issue.countDocuments({ routedTo: body._id });
        const resolved = await Issue.countDocuments({ routedTo: body._id, status: { $in: ['completed', 'verified'] } });
        const satisfactionData = await Issue.aggregate([
          { $match: { routedTo: body._id, satisfactionScore: { $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$satisfactionScore' } } },
        ]);

        body.stats.totalIssues = total;
        body.stats.resolvedIssues = resolved;
        body.stats.satisfactionAvg = satisfactionData[0]?.avg || 0;
        await body.save();
      }
      logger.info('Daily stats rollup completed');
    } catch (err) {
      logger.error('Stats rollup failed:', err.message);
    }
  });

  logger.info('✅ Cron jobs started');
};

module.exports = { startCronJobs };
