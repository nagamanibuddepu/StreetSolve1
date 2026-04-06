/**
 * Notification Service – Email (Gmail) + SMS (Twilio) + In-App
 * Sends REAL lifecycle notifications - NOT OTP spam
 * OTP is separate - only called from authController
 */
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { Notification } = require('../models/index');

let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
      tls: { rejectUnauthorized: false },
    });
  }
  return transporter;
};

// ─── Rich HTML email templates per life stage ────────────────────────────────
const getLifecycleTemplate = (type, data) => {
  const header = `
    <div style="background:linear-gradient(135deg,#0D1B3E,#1a3a6e);padding:28px 32px;text-align:center">
      <h1 style="color:white;margin:0;font-size:22px;font-family:sans-serif">🏛️ StreetSolve</h1>
      <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:12px;font-family:sans-serif">AI-Powered Community Governance</p>
    </div>`;
  const footer = `
    <div style="padding:16px;text-align:center;font-family:sans-serif;font-size:11px;color:#9A9590">
      StreetSolve – Building Better Communities Together<br>
      <a href="${process.env.CLIENT_URL}/notifications" style="color:#FF6B2B">View all notifications</a>
    </div>`;
  const wrap = (body) => `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8f7f5">${header}<div style="padding:28px 32px;background:white;margin:0 16px;border-radius:0 0 12px 12px">${body}</div>${footer}</div>`;

  const issueBox = (color, icon) => `
    <div style="background:${color}10;border-left:4px solid ${color};padding:14px 16px;border-radius:8px;margin:16px 0">
      <div style="font-weight:700;font-size:15px;color:#0D1B3E">${icon} ${data.issueTitle}</div>
      ${data.issueDescription ? `<div style="font-size:13px;color:#5C5751;margin-top:4px">${data.issueDescription?.substring(0,120)}...</div>` : ''}
      ${data.location ? `<div style="font-size:12px;color:#9A9590;margin-top:4px">📍 ${data.location}</div>` : ''}
    </div>`;

  const btn = (url, text, color='#FF6B2B') => `<a href="${url}" style="display:inline-block;background:${color};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px">${text}</a>`;

  const templates = {
    issue_reported: wrap(`
      <h2 style="color:#0D1B3E;margin:0 0 8px">📢 Issue Reported Successfully!</h2>
      <p style="color:#5C5751;font-size:14px">Your civic complaint has been submitted and routed to the relevant department.</p>
      ${issueBox('#FF6B2B', '📋')}
      <table style="width:100%;font-size:13px;color:#5C5751;margin-top:12px">
        <tr><td style="padding:4px 0;font-weight:700">Reported by:</td><td>${data.reporterName}</td></tr>
        <tr><td style="padding:4px 0;font-weight:700">Department:</td><td>${data.department}</td></tr>
        <tr><td style="padding:4px 0;font-weight:700">Priority:</td><td style="text-transform:capitalize">${data.priority || 'medium'}</td></tr>
      </table>
      <p style="font-size:13px;color:#5C5751;margin-top:12px">Your issue has been transferred to <strong>${data.department}</strong>. You'll receive updates as it progresses.</p>
      ${btn(`${process.env.CLIENT_URL}/issues/${data.issueId}`, 'Track Your Issue →')}
    `),

    issue_accepted: wrap(`
      <h2 style="color:#0D1B3E;margin:0 0 8px">✅ Issue Accepted!</h2>
      <p style="color:#5C5751;font-size:14px">Good news! Your issue has been accepted by the authorities.</p>
      ${issueBox('#1A4FBE', '✅')}
      <p style="font-size:13px;color:#5C5751">The <strong>${data.department}</strong> has accepted your complaint and will begin work soon.</p>
      ${btn(`${process.env.CLIENT_URL}/issues/${data.issueId}`, 'Track Progress →', '#1A4FBE')}
    `),

    issue_inprogress: wrap(`
      <h2 style="color:#0D1B3E;margin:0 0 8px">🔧 Work Has Started!</h2>
      <p style="color:#5C5751;font-size:14px">A volunteer/team is actively working on your reported issue.</p>
      ${issueBox('#7C3AED', '🔧')}
      ${data.assignedTo ? `<p style="font-size:13px;color:#5C5751">Assigned to: <strong>${data.assignedTo}</strong></p>` : ''}
      ${btn(`${process.env.CLIENT_URL}/issues/${data.issueId}`, 'View Progress →', '#7C3AED')}
    `),

    issue_completed: wrap(`
      <h2 style="color:#0D1B3E;margin:0 0 8px">🎉 Issue Resolved!</h2>
      <p style="color:#5C5751;font-size:14px">Your civic complaint has been resolved. Please share your feedback!</p>
      ${issueBox('#0A7B3E', '🎉')}
      <p style="font-size:13px;color:#5C5751">Issue marked complete by <strong>${data.resolvedBy || 'Municipal Corporation'}</strong>.</p>
      <p style="font-size:13px;color:#5C5751;margin-top:12px">Were you satisfied with the resolution? Your feedback helps us improve.</p>
      <div style="display:flex;gap:12px;margin-top:16px">
        ${btn(`${process.env.CLIENT_URL}/issues/${data.issueId}?feedback=yes`, '✅ Satisfied', '#0A7B3E')}
        <a href="${process.env.CLIENT_URL}/issues/${data.issueId}?feedback=no" style="display:inline-block;background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-left:8px">❌ Not Satisfied</a>
      </div>
    `),

    issue_verified: wrap(`
      <h2 style="color:#0D1B3E;margin:0 0 8px">⭐ Issue Fully Resolved!</h2>
      <p style="color:#5C5751;font-size:14px">Your issue has been verified and marked as fully resolved.</p>
      ${issueBox('#0A7B3E', '⭐')}
      ${data.satisfactionScore ? `<p style="font-size:13px;color:#0A7B3E;font-weight:700">Community satisfaction: ${data.satisfactionScore}%</p>` : ''}
      ${btn(`${process.env.CLIENT_URL}/issues/${data.issueId}`, 'View Resolution ⭐', '#0A7B3E')}
    `),

    issue_reopened: wrap(`
      <h2 style="color:#DC2626;margin:0 0 8px">🔄 Issue Reopened</h2>
      <p style="color:#5C5751;font-size:14px">The issue has been reopened due to low satisfaction score (below 70%).</p>
      ${issueBox('#DC2626', '🔄')}
      <p style="font-size:13px;color:#5C5751">We apologize for the inconvenience. The team will re-address this complaint.</p>
      ${btn(`${process.env.CLIENT_URL}/issues/${data.issueId}`, 'View Issue →', '#DC2626')}
    `),

    nearby_issue: wrap(`
      <h2 style="color:#0D1B3E;margin:0 0 8px">📍 New Issue Near You</h2>
      <p style="color:#5C5751;font-size:14px">A new civic issue has been reported in your locality.</p>
      ${issueBox('#FF6B2B', '📍')}
      <p style="font-size:13px;color:#5C5751">You can vote on this issue to increase its priority or volunteer to help resolve it.</p>
      ${btn(`${process.env.CLIENT_URL}/issues/${data.issueId}`, 'View & Vote →')}
    `),

    feedback_request: wrap(`
      <h2 style="color:#0D1B3E;margin:0 0 8px">⭐ Your Feedback Needed</h2>
      <p style="color:#5C5751;font-size:14px">A civic issue near you has been resolved. Are you satisfied?</p>
      ${issueBox('#0A7B3E', '✅')}
      <p style="font-size:13px;color:#5C5751">Your feedback determines if this issue is truly resolved. If less than 70% of nearby users are satisfied, the issue is automatically reopened.</p>
      <div style="margin-top:16px">
        ${btn(`${process.env.CLIENT_URL}/issues/${data.issueId}?feedback=yes`, '👍 Satisfied', '#0A7B3E')}
        <a href="${process.env.CLIENT_URL}/issues/${data.issueId}?feedback=no" style="display:inline-block;background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-left:8px">👎 Not Satisfied</a>
      </div>
    `),

    otp: wrap(`
      <h2 style="color:#0D1B3E;margin:0 0 8px">🔐 Your OTP Code</h2>
      <p style="color:#5C5751;font-size:14px">Use this one-time password to verify your account:</p>
      <div style="text-align:center;margin:24px 0">
        <div style="font-size:42px;font-weight:800;letter-spacing:14px;color:#FF6B2B;background:#fff5f0;padding:20px;border-radius:12px;display:inline-block">${data.otp}</div>
      </div>
      <p style="color:#9A9590;font-size:13px">⏱️ Expires in 10 minutes. Do not share with anyone.</p>
    `),
  };

  return templates[type] || wrap(`<p style="color:#5C5751">${data.message || 'You have a new notification from StreetSolve.'}</p>`);
};

// ─── SMS message templates ────────────────────────────────────────────────────
const getSMSMessage = (type, data) => {
  const msgs = {
    issue_reported: `StreetSolve: Issue "${data.issueTitle?.substring(0,40)}" reported successfully! Routed to ${data.department}. Track: ${process.env.CLIENT_URL}/issues/${data.issueId}`,
    issue_accepted: `StreetSolve: Your issue "${data.issueTitle?.substring(0,40)}" has been ACCEPTED by ${data.department}. Work will begin soon.`,
    issue_inprogress: `StreetSolve: Work has STARTED on your issue "${data.issueTitle?.substring(0,40)}". ${data.assignedTo ? `Assigned to: ${data.assignedTo}` : ''}`,
    issue_completed: `StreetSolve: Your issue "${data.issueTitle?.substring(0,40)}" has been RESOLVED! Please give feedback: ${process.env.CLIENT_URL}/issues/${data.issueId}`,
    issue_verified: `StreetSolve: Issue "${data.issueTitle?.substring(0,40)}" fully verified! Satisfaction: ${data.satisfactionScore}%`,
    issue_reopened: `StreetSolve: Issue "${data.issueTitle?.substring(0,40)}" REOPENED due to low satisfaction. Team will re-address it.`,
    nearby_issue: `StreetSolve: New issue near you - "${data.issueTitle?.substring(0,40)}". View: ${process.env.CLIENT_URL}/issues/${data.issueId}`,
    feedback_request: `StreetSolve: Issue resolved near you. Satisfied? YES: ${process.env.CLIENT_URL}/issues/${data.issueId}?feedback=yes | NO: ${process.env.CLIENT_URL}/issues/${data.issueId}?feedback=no`,
    otp: `StreetSolve OTP: ${data.otp}. Valid 10 min. Do NOT share.`,
  };
  return msgs[type] || `StreetSolve: ${data.message}`;
};

// ─── Send Email ───────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, type, data, html }) => {
  if (!process.env.SMTP_EMAIL) { logger.debug('Email not configured'); return false; }
  // Skip fake/test emails - only send to real email addresses
  if (!to || to.includes('example.com') || to.includes('test.com') || to.includes('demo.com')) {
    logger.debug(`Skipping email to fake address: ${to}`);
    return false;
  }
  try {
    const tp = getTransporter();
    const subjects = {
      issue_reported: `📢 Issue Reported: ${data?.issueTitle?.substring(0,50)}`,
      issue_accepted: `✅ Issue Accepted: ${data?.issueTitle?.substring(0,50)}`,
      issue_inprogress: `🔧 Work Started: ${data?.issueTitle?.substring(0,50)}`,
      issue_completed: `🎉 Issue Resolved: ${data?.issueTitle?.substring(0,50)}`,
      issue_verified: `⭐ Issue Verified: ${data?.issueTitle?.substring(0,50)}`,
      issue_reopened: `🔄 Issue Reopened: ${data?.issueTitle?.substring(0,50)}`,
      nearby_issue: `📍 New Issue Near You`,
      feedback_request: `⭐ Rate the Resolution`,
      otp: `🔐 Your StreetSolve OTP`,
    };
    await tp.sendMail({
      from: `"${process.env.FROM_NAME || 'StreetSolve'}" <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
      to,
      subject: subject || subjects[type] || 'StreetSolve Notification',
      html: html || (type && data ? getLifecycleTemplate(type, data) : '<p>Notification</p>'),
    });
    logger.info(`Email sent [${type}] to ${to}`);
    return true;
  } catch (err) {
    logger.error('Email send failed:', err.message);
    return false;
  }
};

// ─── Send SMS ─────────────────────────────────────────────────────────────────
const sendSMS = async (to, type, data) => {
  if (!process.env.TWILIO_ACCOUNT_SID) { logger.debug('SMS not configured'); return false; }
  try {
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const message = typeof type === 'string' && data ? getSMSMessage(type, data) : type;
    const cleanPhone = to.replace(/\D/g, '').slice(-10);
    await twilio.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to: `+91${cleanPhone}` });
    logger.info(`SMS sent [${typeof type === 'string' ? type : 'direct'}] to +91${cleanPhone}`);
    return true;
  } catch (err) {
    logger.error('SMS failed:', err.message);
    return false;
  }
};

// ─── Create In-App Notification ───────────────────────────────────────────────
const createInAppNotification = async (data) => {
  try {
    return await Notification.create(data);
  } catch (err) {
    logger.error('In-app notification failed:', err.message);
    return null;
  }
};

// ─── Emit Socket ─────────────────────────────────────────────────────────────
const emitSocketNotification = (io, userId, notification) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification', notification);
};

// ─── Master Notification Sender ───────────────────────────────────────────────
const sendNotification = async ({ io, user, type, title, message, data = {} }) => {
  if (!user) return null;
  const prefs = user.notificationPrefs || { email: true, sms: true, inApp: true };

  // Create in-app
  const notif = await createInAppNotification({
    recipient: user._id,
    type,
    title,
    message,
    data,
  });

  // Push via socket
  if (notif && io) emitSocketNotification(io, user._id, notif);

  // Email
  if (prefs.email && user.email) {
    await sendEmail({ to: user.email, type, data: { ...data, issueTitle: data.issueTitle || title } });
  }

  // SMS (for lifecycle events only, not OTP - that has its own flow)
  if (prefs.sms && user.phone) {
    await sendSMS(user.phone, type, { ...data, issueTitle: data.issueTitle || title });
  }

  return notif;
};

// ─── Notify users who interacted with an issue ────────────────────────────────
const notifyIssueStakeholders = async ({ io, issue, type, title, message, data, excludeUserId }) => {
  const User = require('../models/User');
  const { Vote, Comment } = require('../models/index');

  const userIds = new Set();
  if (issue.reportedBy && issue.reportedBy._id?.toString() !== excludeUserId?.toString()) {
    userIds.add(issue.reportedBy._id?.toString() || issue.reportedBy.toString());
  }

  const [votes, comments] = await Promise.all([
    Vote.find({ issue: issue._id }).select('user'),
    Comment.find({ issue: issue._id }).select('author'),
  ]);
  votes.forEach(v => { if (v.user.toString() !== excludeUserId?.toString()) userIds.add(v.user.toString()); });
  comments.forEach(c => { if (c.author.toString() !== excludeUserId?.toString()) userIds.add(c.author.toString()); });

  const users = await User.find({ _id: { $in: [...userIds] }, isActive: true });
  for (const user of users) {
    await sendNotification({ io, user, type, title, message, data });
  }
  return users.length;
};

// ─── Notify nearby users ──────────────────────────────────────────────────────
const notifyNearbyUsers = async ({ io, issue, radius = 5000, excludeUserId }) => {
  const User = require('../models/User');
  try {
    const nearbyUsers = await User.find({
      _id: { $ne: excludeUserId },
      location: { $near: { $geometry: { type: 'Point', coordinates: issue.location.coordinates }, $maxDistance: radius } },
      'notificationPrefs.nearbyIssues': true,
      isActive: true,
    }).limit(50);

    for (const user of nearbyUsers) {
      await sendNotification({
        io, user,
        type: 'feedback_request',
        title: '⭐ Issue Resolved Near You',
        message: `A civic issue near you was resolved. Were you satisfied?`,
        data: { issueId: issue._id, issueTitle: issue.title, location: issue.location?.address, actionUrl: `/issues/${issue._id}?feedback=true` },
      });
    }
    return nearbyUsers.length;
  } catch (err) {
    logger.error('Notify nearby users failed:', err.message);
    return 0;
  }
};

// ─── Notify new issue to nearby users ────────────────────────────────────────
const notifyNewIssueNearby = async ({ io, issue }) => {
  const User = require('../models/User');
  try {
    const nearbyUsers = await User.find({
      _id: { $ne: issue.reportedBy },
      location: { $near: { $geometry: { type: 'Point', coordinates: issue.location.coordinates }, $maxDistance: 3000 } },
      'notificationPrefs.nearbyIssues': true,
      isActive: true,
    }).limit(30);

    for (const user of nearbyUsers) {
      await sendNotification({
        io, user,
        type: 'nearby_issue',
        title: '📍 New Issue Near You',
        message: `New civic issue reported near your location: ${issue.title}`,
        data: { issueId: issue._id, issueTitle: issue.title, location: issue.location?.address, department: issue.department },
      });
    }
    return nearbyUsers.length;
  } catch (err) {
    logger.error('Notify new issue nearby failed:', err.message);
    return 0;
  }
};

module.exports = {
  sendEmail, sendSMS, sendNotification, createInAppNotification,
  emitSocketNotification, notifyNearbyUsers, notifyIssueStakeholders,
  notifyNewIssueNearby, getLifecycleTemplate,
};
