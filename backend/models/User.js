const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const locationSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], default: [0, 0] },
  address: String,
  city: String,
  state: String,
  pincode: String,
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: [100, 'Name cannot exceed 100 characters'] },
  email: { type: String, sparse: true, lowercase: true, trim: true, match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'] },
  phone: { type: String, sparse: true },
  password: { type: String, minlength: [8, 'Password must be at least 8 characters'], select: false },
  role: { type: String, enum: ['citizen', 'volunteer', 'ngo', 'government', 'admin'], default: 'citizen' },
  avatar: { url: String, publicId: String },
  bio: { type: String, maxlength: 500 },
  language: { type: String, enum: ['en', 'hi', 'te', 'ta', 'kn', 'ml'], default: 'en' },

  // Volunteer verification fields
  aadhaarNumber: { type: String, select: false },
  aadhaarVerified: { type: Boolean, default: false },
  proofDocument: { url: String, publicId: String },
  currentAddress: String,
  volunteerVerified: { type: Boolean, default: false },

  governmentId: {
    type: { type: String, enum: ['aadhaar', 'voter', 'pan'] },
    number: { type: String, select: false },
    verified: { type: Boolean, default: false },
  },
  location: locationSchema,
  nearbyMunicipalCorp: { type: mongoose.Schema.Types.ObjectId, ref: 'GovernmentBody' },
  nearbyGramPanchayat: { type: mongoose.Schema.Types.ObjectId, ref: 'GovernmentBody' },
  organization: { name: String, regNumber: String, verified: { type: Boolean, default: false } },
  skills: [String],
  issuesTaken: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  issuesResolved: { type: Number, default: 0 },
  volunteerRating: { type: Number, default: 0, min: 0, max: 5 },
  googleId: { type: String, sparse: true },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: String,
  otp: { code: { type: String, select: false }, expiresAt: Date, attempts: { type: Number, default: 0 } },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: Date,
  issuesReported: { type: Number, default: 0 },
  votesGiven: { type: Number, default: 0 },
  commentsPosted: { type: Number, default: 0 },
  reputationScore: { type: Number, default: 0 },
  notificationPrefs: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    nearbyIssues: { type: Boolean, default: true },
  },
  lastSeen: Date,
  fcmToken: String,
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Single index declarations - no duplicates
userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

userSchema.virtual('displayName').get(function() {
  return this.name || this.email?.split('@')[0] || 'User';
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = { code: otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 };
  return otp;
};

userSchema.methods.verifyOTP = function(code) {
  if (!this.otp?.code) return { valid: false, message: 'No OTP generated' };
  if (this.otp.attempts >= 5) return { valid: false, message: 'Too many attempts' };
  if (new Date() > this.otp.expiresAt) return { valid: false, message: 'OTP expired' };
  if (this.otp.code !== code) { this.otp.attempts += 1; return { valid: false, message: 'Invalid OTP' }; }
  this.otp = undefined;
  return { valid: true };
};

userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  return token;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
