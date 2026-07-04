/**
 * Notification Service
 * - Email via Gmail SMTP (lifecycle HTML templates)
 * - SMS via Twilio (Indian +91 numbers)
 * - In-App via Socket.IO (real-time push)
 * - Skips fake/seed emails (example.com etc.)
 */
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { Notification } = require('../models/index');

let _transporter = null;
const getTransporter = () => {
  if (!_transporter && process.env.SMTP_EMAIL) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
      tls: { rejectUnauthorized: false },
    });
  }
  return _transporter;
};

// ─── Email Templates ──────────────────────────────────────────────────────────
const emailTemplate = (type, data) => {
  const base = (body) => `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>
body{margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8}
.wrap{max-width:600px;margin:0 auto}
.header{background:linear-gradient(135deg,#1e3a5f,#2d5282);padding:24px 32px;text-align:center}
.header h1{color:white;margin:0;font-size:22px}
.header p{color:rgba(255,255,255,0.65);margin:4px 0 0;font-size:12px}
.body{background:white;margin:0 16px;padding:28px 32px;border-radius:0 0 12px 12px}
.footer{text-align:center;padding:16px;font-size:11px;color:#94a3b8}
.btn{display:inline-block;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;margin:8px 4px}
.btn-primary{background:#f97316;color:white}
.btn-success{background:#16a34a;color:white}
.btn-danger{background:#dc2626;color:white}
.issue-box{background:#f8fafc;border-left:4px solid #f97316;padding:14px 16px;border-radius:8px;margin:16px 0}
.issue-title{font-weight:700;font-size:15px;color:#1e3a5f;margin-bottom:4px}
.issue-meta{font-size:12px;color:#64748b}
.stat{display:inline-block;background:#f1f5f9;border-radius:8px;padding:10px 16px;margin:4px;text-align:center;min-width:80px}
.stat-value{font-size:24px;font-weight:800;color:#1e3a5f}
.stat-label{font-size:11px;color:#94a3b8;margin-top:2px}
</style></head><body><div class="wrap">
<div class="header"><h1>🏛️ StreetSolve</h1><p>AI-Powered Community Governance</p></div>
<div class="body">${body}</div>
<div class="footer">StreetSolve — Building Better Communities Together<br>
<a href="${process.env.CLIENT_URL}/notifications" style="color:#f97316">View all notifications →</a></div>
</div></body></html>`;

  const issueBox = (d) => `<div class="issue-box">
    <div class="issue-title">${d.issueTitle || 'Issue'}</div>
    ${d.issueDescription?`<div class="issue-meta">${d.issueDescription?.substring(0,120)}...</div>`:''}
    ${d.location?`<div class="issue-meta">📍 ${d.location}</div>`:''}
    ${d.department?`<div class="issue-meta">🏢 ${d.department}</div>`:''}
  </div>`;

  const SUBJECTS = {
    issue_reported:   `✅ Issue Reported: ${data?.issueTitle?.substring(0,50)}`,
    issue_accepted:   `🔵 Issue Accepted: ${data?.issueTitle?.substring(0,50)}`,
    issue_inprogress: `🔧 Work Started: ${data?.issueTitle?.substring(0,50)}`,
    issue_completed:  `🎉 Issue Resolved: ${data?.issueTitle?.substring(0,50)}`,
    issue_verified:   `⭐ Issue Verified: ${data?.issueTitle?.substring(0,50)}`,
    issue_reopened:   `🔄 Issue Reopened: ${data?.issueTitle?.substring(0,50)}`,
    nearby_issue:     `📍 New Issue Near You`,
    feedback_request: `⭐ Rate the Resolution`,
    new_issue_gov:    `🏛️ New Civic Issue Reported in Your Area`,
    otp:             `🔐 Your StreetSolve OTP`,
    welcome:         `Welcome to StreetSolve! 🎉`,
  };

  const BODIES = {
    issue_reported: base(`
      <h2 style="color:#1e3a5f;margin-top:0">✅ Issue Reported Successfully!</h2>
      <p style="color:#475569">Your civic complaint has been submitted and routed to the relevant department.</p>
      ${issueBox(data)}
      <table style="width:100%;font-size:13px;color:#475569;margin:12px 0">
        <tr><td style="padding:4px 0;font-weight:600">Reported by</td><td>${data.reporterName||'—'}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600">Department</td><td>${data.department||'General'}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600">Priority</td><td style="text-transform:capitalize">${data.priority||'medium'}</td></tr>
      </table>
      <p style="font-size:13px;color:#475569">Your issue has been transferred to <strong>${data.department}</strong>. You'll receive updates as it progresses through each stage.</p>
      <a href="${process.env.CLIENT_URL}/issues/${data.issueId}" class="btn btn-primary">Track Your Issue →</a>
    `),

    issue_accepted: base(`
      <h2 style="color:#1e3a5f;margin-top:0">✅ Issue Accepted!</h2>
      ${issueBox(data)}
      <p style="font-size:13px;color:#475569"><strong>${data.department}</strong> has accepted your complaint and will begin work soon.</p>
      <a href="${process.env.CLIENT_URL}/issues/${data.issueId}" class="btn btn-primary">Track Progress →</a>
    `),

    issue_inprogress: base(`
      <h2 style="color:#1e3a5f;margin-top:0">🔧 Work Has Started!</h2>
      ${issueBox(data)}
      ${data.assignedTo?`<p style="font-size:13px;color:#475569">Assigned to: <strong>${data.assignedTo}</strong></p>`:''}
      <a href="${process.env.CLIENT_URL}/issues/${data.issueId}" class="btn btn-primary">View Progress →</a>
    `),

    issue_completed: base(`
      <h2 style="color:#1e3a5f;margin-top:0">🎉 Issue Resolved!</h2>
      ${issueBox(data)}
      <p style="font-size:13px;color:#475569">Resolved by <strong>${data.resolvedBy||'Municipal Corporation'}</strong>. Were you satisfied?</p>
      <a href="${process.env.CLIENT_URL}/issues/${data.issueId}?feedback=yes" class="btn btn-success">👍 Satisfied</a>
      <a href="${process.env.CLIENT_URL}/issues/${data.issueId}?feedback=no" class="btn btn-danger">👎 Not Satisfied</a>
    `),

    issue_verified: base(`
      <h2 style="color:#1e3a5f;margin-top:0">⭐ Issue Fully Verified!</h2>
      ${issueBox(data)}
      ${data.satisfactionScore?`<p style="font-size:14px;color:#16a34a;font-weight:700">Community satisfaction: ${data.satisfactionScore}%</p>`:''}
      <a href="${process.env.CLIENT_URL}/issues/${data.issueId}" class="btn btn-primary">View Resolution →</a>
    `),

    issue_reopened: base(`
      <h2 style="color:#dc2626;margin-top:0">🔄 Issue Reopened</h2>
      ${issueBox(data)}
      <p style="font-size:13px;color:#475569">Reopened due to low satisfaction score (below 70%). The team will re-address.</p>
      <a href="${process.env.CLIENT_URL}/issues/${data.issueId}" class="btn btn-primary">View Issue →</a>
    `),

    new_issue_gov: base(`
      <h2 style="color:#1e3a5f;margin-top:0">🏛️ New Issue Reported in Your Jurisdiction</h2>
      ${issueBox(data)}
      <div style="display:flex;gap:16px;margin:16px 0;flex-wrap:wrap">
        <div class="stat"><div class="stat-value">${data.priority==='critical'?'🚨':'⚠️'}</div><div class="stat-label">${data.priority||'medium'} priority</div></div>
        <div class="stat"><div class="stat-value">${data.voteCount||0}</div><div class="stat-label">votes</div></div>
      </div>
      <p style="font-size:13px;color:#475569">Please review and accept this issue to initiate resolution.</p>
      <a href="${process.env.CLIENT_URL}/issues/${data.issueId}" class="btn btn-primary">Review Issue →</a>
      <a href="${process.env.CLIENT_URL}/dashboard" class="btn" style="background:#1e3a5f;color:white">Go to Dashboard →</a>
    `),

    nearby_issue: base(`
      <h2 style="color:#1e3a5f;margin-top:0">📍 New Issue Near You</h2>
      ${issueBox(data)}
      <p style="font-size:13px;color:#475569">Vote to increase priority or volunteer to help resolve it.</p>
      <a href="${process.env.CLIENT_URL}/issues/${data.issueId}" class="btn btn-primary">View & Vote →</a>
    `),

    feedback_request: base(`
      <h2 style="color:#1e3a5f;margin-top:0">⭐ Feedback Needed</h2>
      ${issueBox(data)}
      <p style="font-size:13px;color:#475569">If less than 70% rate it satisfied, the issue is automatically reopened.</p>
      <a href="${process.env.CLIENT_URL}/issues/${data.issueId}?feedback=yes" class="btn btn-success">👍 Satisfied</a>
      <a href="${process.env.CLIENT_URL}/issues/${data.issueId}?feedback=no" class="btn btn-danger">👎 Not Satisfied</a>
    `),

    otp: base(`
      <h2 style="color:#1e3a5f;margin-top:0">🔐 Your OTP</h2>
      <div style="text-align:center;margin:24px 0">
        <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#f97316;background:#fff7ed;padding:20px;border-radius:12px;display:inline-block">${data.otp}</div>
      </div>
      <p style="color:#94a3b8;font-size:13px;text-align:center">⏱️ Expires in 10 minutes. Do not share with anyone.</p>
    `),

    welcome: base(`
      <h2 style="color:#1e3a5f;margin-top:0">Welcome to StreetSolve, ${data.name}! 🎉</h2>
      <p style="color:#475569">You're now part of India's AI-powered civic governance community.</p>
      <p style="color:#475569">You can now:</p>
      <ul style="color:#475569;font-size:13px">
        <li>Report civic issues by voice in your language</li>
        <li>Track complaints in real-time</li>
        <li>Vote to prioritize important issues</li>
        <li>Verify resolutions with community feedback</li>
      </ul>
      <a href="${process.env.CLIENT_URL}" class="btn btn-primary">Get Started →</a>
    `),
  };

  return { subject: SUBJECTS[type] || 'StreetSolve Notification', html: BODIES[type] || BODIES.nearby_issue };
};

// ─── SMS Templates ────────────────────────────────────────────────────────────
const smsText = (type, data) => {
  const title = data?.issueTitle?.substring(0,40) || 'Issue';
  const url   = `${process.env.CLIENT_URL}/issues/${data?.issueId}`;
  const msgs = {
    issue_reported:   `StreetSolve: Issue "${title}" reported! Routed to ${data.department}. Track: ${url}`,
    issue_accepted:   `StreetSolve: Your issue "${title}" ACCEPTED by ${data.department}. Work begins soon.`,
    issue_inprogress: `StreetSolve: Work STARTED on "${title}". ${data.assignedTo?`By: ${data.assignedTo}.`:''}`,
    issue_completed:  `StreetSolve: Issue "${title}" RESOLVED! Rate here: ${url}`,
    issue_verified:   `StreetSolve: Issue "${title}" fully verified. Satisfaction: ${data.satisfactionScore}%`,
    issue_reopened:   `StreetSolve: Issue "${title}" REOPENED - satisfaction < 70%. Team will re-address.`,
    nearby_issue:     `StreetSolve: New issue near you - "${title}". View: ${url}`,
    new_issue_gov:    `StreetSolve ALERT: New ${data.priority||'medium'} priority issue in your area: "${title}". Review: ${url}`,
    feedback_request: `StreetSolve: Issue resolved near you. Satisfied? ${url}?feedback=yes or ${url}?feedback=no`,
    otp:             `StreetSolve OTP: ${data.otp}. Valid 10 min. DO NOT SHARE.`,
  };
  return msgs[type] || `StreetSolve: ${data?.message || 'You have a new notification.'}`;
};

// ─── Send Email ───────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, type, data, html }) => {
  if (!process.env.SMTP_EMAIL) return false;
  if (!to || /example\.(com|org)|test\.(com|org)|demo\.com|fake\./i.test(to)) return false;
  try {
    const tp = getTransporter();
    if (!tp) return false;
    const tpl = type && data ? emailTemplate(type, data) : null;
    await tp.sendMail({
      from: `"${process.env.FROM_NAME || 'StreetSolve'}" <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
      to, subject: subject || tpl?.subject || 'StreetSolve Notification',
      html: html || tpl?.html || '<p>You have a notification from StreetSolve.</p>',
    });
    logger.info(`📧 Email [${type}] → ${to}`);
    return true;
  } catch (err) {
    logger.error(`Email failed to ${to}:`, err.message);
    return false;
  }
};

// ─── Send SMS ─────────────────────────────────────────────────────────────────
const sendSMS = async (phone, typeOrMessage, data) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return false;
  if (!phone) return false;
  try {
    const twilio  = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const digits  = phone.toString().replace(/\D/g, '');
    const cleaned = digits.length === 10 ? `+91${digits}` : digits.length === 12 && digits.startsWith('91') ? `+${digits}` : `+${digits}`;
    const message = typeof typeOrMessage === 'string' && data ? smsText(typeOrMessage, data) : typeOrMessage;
    await twilio.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to: cleaned });
    logger.info(`📱 SMS [${typeof typeOrMessage === 'string' ? typeOrMessage : 'direct'}] → ${cleaned}`);
    return true;
  } catch (err) {
    logger.error(`SMS failed to ${phone}:`, err.message);
    return false;
  }
};

// ─── In-App Notification ──────────────────────────────────────────────────────
const createInApp = async (recipientId, { type, title, message, data }) => {
  try {
    return await Notification.create({ recipient: recipientId, type, title, message, data });
  } catch (err) {
    logger.error('In-app notification failed:', err.message);
    return null;
  }
};

// ─── Master Send ──────────────────────────────────────────────────────────────
const sendNotification = async ({ io, user, type, title, message, data = {} }) => {
  if (!user) return null;
  const prefs = user.notificationPrefs || { email:true, sms:true, inApp:true };

  // In-app
  const notif = await createInApp(user._id, { type, title, message, data });
  if (notif && io) io.to(`user:${user._id}`).emit('notification', notif);

  // Email (non-blocking)
  if (prefs.email !== false && user.email) {
    sendEmail({ to: user.email, type, data: { ...data, issueTitle: data.issueTitle || title } }).catch(()=>{});
  }

  // SMS (non-blocking)
  if (prefs.sms !== false && user.phone) {
    sendSMS(user.phone, type, { ...data, issueTitle: data.issueTitle || title }).catch(()=>{});
  }

  return notif;
};

// ─── Notify all stakeholders of an issue ─────────────────────────────────────
const notifyIssueStakeholders = async ({ io, issue, type, title, message, data, excludeUserId }) => {
  const User  = require('../models/User');
  const { Vote, Comment } = require('../models/index');
  const ids   = new Set();
  const rid   = issue.reportedBy?._id?.toString() || issue.reportedBy?.toString();
  if (rid && rid !== excludeUserId?.toString()) ids.add(rid);
  const [votes, comments] = await Promise.all([
    Vote.find({ issue: issue._id }).select('user'),
    Comment.find({ issue: issue._id }).select('author'),
  ]);
  votes.forEach(v => { const s=v.user.toString(); if(s!==excludeUserId?.toString()) ids.add(s); });
  comments.forEach(c => { const s=c.author.toString(); if(s!==excludeUserId?.toString()) ids.add(s); });
  if (!ids.size) return 0;
  const users = await User.find({ _id:{ $in:[...ids] }, isActive:true });
  await Promise.all(users.map(u => sendNotification({ io, user:u, type, title, message, data })));
  return users.length;
};

// ─── Notify government bodies about new issue ────────────────────────────────
const notifyGovernmentBodies = async ({ io, issue }) => {
  const User = require('../models/User');
  try {
    // Notify all government users in the relevant corp
    const govUsers = await User.find({
      role: 'government', isActive: true,
      ...(issue.routedTo ? { nearbyMunicipalCorp: issue.routedTo } : {}),
    });
    const notifData = {
      issueId: issue._id, issueTitle: issue.title,
      location: issue.location?.formattedAddress || issue.location?.city,
      department: issue.department, priority: issue.priority,
      voteCount: issue.voteCount,
    };
    await Promise.all(govUsers.map(u => sendNotification({
      io, user: u, type:'new_issue_gov',
      title:`🏛️ New Issue Reported Nearby: ${issue.title}`,
      message:`A new ${issue.priority||'medium'} priority ${issue.category} issue was reported.`,
      data: notifData,
    })));

    // Also emit socket event to gov dashboard rooms
    if (io && issue.routedTo) {
      io.to(`govbody:${issue.routedTo}`).emit('new:issue:gov', { ...notifData, category: issue.category });
    }

    // Also notify NGO/volunteer users nearby
    const volunteerUsers = await User.find({
      role: { $in: ['volunteer','ngo'] }, isActive: true, volunteerVerified: true,
      ...(issue.location?.coordinates ? {
        location: { $near: { $geometry: { type:'Point', coordinates: issue.location.coordinates }, $maxDistance: 10000 } }
      } : {}),
    }).limit(20);
    await Promise.all(volunteerUsers.map(u => sendNotification({
      io, user: u, type:'nearby_issue',
      title:`🤝 New Issue Available Near You`,
      message:`${issue.category} issue: ${issue.title}`,
      data: notifData,
    })));

    return govUsers.length;
  } catch (err) {
    logger.error('notifyGovernmentBodies error:', err.message);
    return 0;
  }
};

// ─── Notify nearby citizens (for new issues + feedback requests) ──────────────
const notifyNearbyUsers = async ({ io, issue, radius=5000, excludeUserId }) => {
  const User = require('../models/User');
  try {
    if (!issue.location?.coordinates) return 0;
    const users = await User.find({
      _id: { $ne: excludeUserId },
      role: 'citizen',
      'notificationPrefs.nearbyIssues': { $ne: false },
      isActive: true,
      location: { $near: { $geometry: { type:'Point', coordinates: issue.location.coordinates }, $maxDistance: radius } },
    }).limit(50);
    await Promise.all(users.map(u => sendNotification({
      io, user: u, type:'feedback_request',
      title:'⭐ Issue Resolved Near You',
      message:`Rate resolution of: ${issue.title}`,
      data:{ issueId:issue._id, issueTitle:issue.title, location:issue.location?.formattedAddress },
    })));
    return users.length;
  } catch (err) { logger.error('notifyNearbyUsers error:', err.message); return 0; }
};

const notifyNewIssueNearby = async ({ io, issue }) => {
  const User = require('../models/User');
  try {
    if (!issue.location?.coordinates) return 0;
    const users = await User.find({
      _id: { $ne: issue.reportedBy }, role: 'citizen', isActive: true,
      'notificationPrefs.nearbyIssues': { $ne: false },
      location: { $near: { $geometry: { type:'Point', coordinates: issue.location.coordinates }, $maxDistance: 3000 } },
    }).limit(30);
    await Promise.all(users.map(u => sendNotification({
      io, user: u, type:'nearby_issue',
      title:'📍 New Issue Near You',
      message:`${issue.title}`,
      data:{ issueId:issue._id, issueTitle:issue.title, location:issue.location?.formattedAddress },
    })));
    return users.length;
  } catch (err) { logger.error('notifyNewIssueNearby error:', err.message); return 0; }
};

module.exports = {
  sendEmail, sendSMS, sendNotification, createInApp,
  notifyNearbyUsers, notifyIssueStakeholders, notifyNewIssueNearby,
  notifyGovernmentBodies,
};
