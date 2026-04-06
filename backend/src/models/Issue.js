/**
 * Issue Model – Full civic issue lifecycle
 */
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true },
  address: String,
  city: String,
  state: String,
  pincode: String,
  ward: String,
  formattedAddress: String, // full Google Maps style address
}, { _id: false });

const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: String,
  type: { type: String, enum: ['image', 'video', 'audio'], default: 'image' },
  caption: String,
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedByRole: String,
  note: String,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const issueSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: [200, 'Title cannot exceed 200 chars'] },
  description: { type: String, required: [true, 'Description is required'], maxlength: [2000, 'Description cannot exceed 2000 chars'] },
  descriptionTranslated: String,

  category: {
    type: String,
    required: true,
    enum: ['Roads', 'Sanitation', 'Water', 'Electricity', 'Parks', 'Drainage', 'Noise', 'Others'],
  },
  department: {
    type: String,
    enum: ['Roads Department','Sanitation Department','Water Department','Electricity Department','Parks Department','Drainage Department','Noise & Environment Department','General'],
    default: 'General',
  },
  aiClassification: {
    suggestedCategory: String,
    suggestedDepartment: String,
    confidence: Number,
    keywords: [String],
    sentiment: String,
    urgencyScore: Number,
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  reportLang: { type: String, default: 'en' }, // renamed from 'language' to avoid MongoDB text index conflict

  media: [mediaSchema],
  location: { type: locationSchema, required: true },

  status: {
    type: String,
    enum: ['reported', 'accepted', 'inprogress', 'completed', 'verified', 'reopened', 'rejected', 'duplicate'],
    default: 'reported',
  },
  statusHistory: [statusHistorySchema],
  rejectionReason: String,
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },

  routedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'GovernmentBody' },
  routedToType: { type: String, enum: ['municipal', 'grampanchayat', 'department'] },
  assignedDepartment: String,

  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isAnonymous: { type: Boolean, default: false },

  assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  volunteerAadhaar: String,
  assignedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,

  voteCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },

  feedback: {
    yes: { type: Number, default: 0 },
    no: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    notified: { type: Boolean, default: false },
    notifiedAt: Date,
    deadlineAt: Date,
    autoResolvedAt: Date,
  },
  satisfactionScore: { type: Number, min: 0, max: 100 },

  tags: [{ type: String, lowercase: true }],
  progressMedia: [mediaSchema],
  afterMedia: [mediaSchema],
  expectedResolutionDate: Date,
  overdue: { type: Boolean, default: false },

  // FIX: added 'photo' to enum
  inputMethod: {
    type: String,
    enum: ['text', 'voice', 'image', 'photo', 'mixed'],
    default: 'text',
  },

  trending: { type: Boolean, default: false },
  trendingScore: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes - no duplicates
issueSchema.index({ location: '2dsphere' });
issueSchema.index({ status: 1, category: 1 });
issueSchema.index({ reportedBy: 1 });
issueSchema.index({ createdAt: -1 });
issueSchema.index({ voteCount: -1 });
issueSchema.index({ trendingScore: -1 });
issueSchema.index({ title: 'text', description: 'text', tags: 'text' }, { language_override: 'searchLang', default_language: 'english' });

issueSchema.virtual('isExpired').get(function() {
  if (!this.expectedResolutionDate) return false;
  return new Date() > this.expectedResolutionDate && !['completed','verified'].includes(this.status);
});

issueSchema.pre('save', function(next) {
  if (this.feedback.total > 0) {
    this.satisfactionScore = Math.round((this.feedback.yes / this.feedback.total) * 100);
  }
  const ageHours = (Date.now() - this.createdAt) / 3600000;
  this.trendingScore = (this.voteCount + this.commentCount * 2) / Math.pow(ageHours + 2, 1.5);
  next();
});

issueSchema.statics.getDepartmentFromCategory = function(category) {
  const map = {
    Roads: 'Roads Department',
    Sanitation: 'Sanitation Department',
    Water: 'Water Department',
    Electricity: 'Electricity Department',
    Parks: 'Parks Department',
    Drainage: 'Drainage Department',
    Noise: 'Noise & Environment Department',
    Others: 'General',
  };
  return map[category] || 'General';
};

const Issue = mongoose.model('Issue', issueSchema);
module.exports = Issue;
