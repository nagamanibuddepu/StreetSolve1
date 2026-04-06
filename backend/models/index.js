/**
 * Vote Model
 */
const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['up', 'down'], default: 'up' },
}, { timestamps: true });

voteSchema.index({ issue: 1, user: 1 }, { unique: true });
const Vote = mongoose.model('Vote', voteSchema);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Comment Model
 */
const commentSchema = new mongoose.Schema({
  issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 1000 },
  textTranslated: String,
  language: { type: String, default: 'en' },
  media: [{
    url: String,
    publicId: String,
    type: { type: String, enum: ['image', 'audio'], default: 'image' },
  }],
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isModerated: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
}, { timestamps: true, toJSON: { virtuals: true } });

commentSchema.index({ issue: 1, createdAt: -1 });
const Comment = mongoose.model('Comment', commentSchema);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notification Model
 */
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    required: true,
    enum: [
      'issue_accepted', 'issue_inprogress', 'issue_completed', 'issue_reopened',
      'issue_verified', 'issue_rejected', 'new_comment', 'new_vote',
      'volunteer_taken', 'feedback_request', 'system', 'nearby_issue',
      'issue_overdue', 'otp',
    ],
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: {
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actionUrl: String,
    extra: mongoose.Schema.Types.Mixed,
  },
  channels: {
    inApp: { sent: Boolean, sentAt: Date },
    email: { sent: Boolean, sentAt: Date },
    sms: { sent: Boolean, sentAt: Date },
    push: { sent: Boolean, sentAt: Date },
  },
  read: { type: Boolean, default: false },
  readAt: Date,
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
const Notification = mongoose.model('Notification', notificationSchema);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GovernmentBody Model
 */
const govBodySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    required: true,
    enum: ['municipal', 'grampanchayat', 'state', 'central'],
  },
  code: { type: String, unique: true }, // official gov code
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number],
    address: String,
    city: String,
    state: String,
    pincode: String,
    coverageRadius: { type: Number, default: 10000 }, // meters
  },
  jurisdiction: {
    wards: [String],
    districts: [String],
    pincodes: [String],
  },
  departments: [{
    name: String,
    head: String,
    email: String,
    phone: String,
    isActive: { type: Boolean, default: true },
  }],
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  contact: {
    email: String,
    phone: String,
    website: String,
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  stats: {
    totalIssues: { type: Number, default: 0 },
    resolvedIssues: { type: Number, default: 0 },
    avgResolutionDays: { type: Number, default: 0 },
    satisfactionAvg: { type: Number, default: 0 },
  },
}, { timestamps: true });

govBodySchema.index({ 'location': '2dsphere' });
govBodySchema.index({ type: 1, isActive: 1 });
const GovernmentBody = mongoose.model('GovernmentBody', govBodySchema);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Feedback Model (for nearby user resolution satisfaction)
 */
const feedbackSchema = new mongoose.Schema({
  issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  satisfied: { type: Boolean, required: true },
  comment: { type: String, maxlength: 500 },
  distance: Number, // meters from issue
}, { timestamps: true });

feedbackSchema.index({ issue: 1, user: 1 }, { unique: true });
const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = { Vote, Comment, Notification, GovernmentBody, Feedback };
