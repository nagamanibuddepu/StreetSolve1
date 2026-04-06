export const CATEGORIES = [
  { id: 'Roads', label: 'Roads', icon: '🛣️', dept: 'Roads Department', color: '#F59E0B' },
  { id: 'Sanitation', label: 'Sanitation', icon: '🗑️', dept: 'Sanitation Department', color: '#EC4899' },
  { id: 'Water', label: 'Water', icon: '💧', dept: 'Water Department', color: '#3B82F6' },
  { id: 'Electricity', label: 'Electricity', icon: '⚡', dept: 'Electricity Department', color: '#F97316' },
  { id: 'Parks', label: 'Parks', icon: '🌳', dept: 'Parks Department', color: '#22C55E' },
  { id: 'Drainage', label: 'Drainage', icon: '🌊', dept: 'Drainage Department', color: '#06B6D4' },
  { id: 'Noise', label: 'Noise', icon: '🔊', dept: 'General', color: '#8B5CF6' },
  { id: 'Others', label: 'Others', icon: '📋', dept: 'General', color: '#6B7280' },
];

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
];

export const STATUS_CONFIG = {
  reported:   { label: 'Reported',    icon: '📋', color: 'bg-yellow-100 text-yellow-800', dot: '#F59E0B' },
  accepted:   { label: 'Accepted',    icon: '✅', color: 'bg-blue-100 text-blue-800',    dot: '#3B82F6' },
  inprogress: { label: 'In Progress', icon: '🔧', color: 'bg-purple-100 text-purple-800', dot: '#8B5CF6' },
  completed:  { label: 'Completed',   icon: '🎉', color: 'bg-green-100 text-green-800',  dot: '#22C55E' },
  verified:   { label: 'Verified',    icon: '⭐', color: 'bg-emerald-100 text-emerald-800', dot: '#10B981' },
  reopened:   { label: 'Reopened',    icon: '🔄', color: 'bg-red-100 text-red-800',      dot: '#EF4444' },
  rejected:   { label: 'Rejected',    icon: '❌', color: 'bg-gray-100 text-gray-600',    dot: '#6B7280' },
};

export const PRIORITY_CONFIG = {
  low:      { label: 'Low',      color: 'text-gray-500', bg: 'bg-gray-100' },
  medium:   { label: 'Medium',   color: 'text-blue-600', bg: 'bg-blue-50' },
  high:     { label: 'High',     color: 'text-orange-600', bg: 'bg-orange-50' },
  critical: { label: 'Critical', color: 'text-red-600',  bg: 'bg-red-50' },
};

export const STATUS_STEPS = ['reported', 'accepted', 'inprogress', 'completed', 'verified'];
export const AVATAR_COLORS = ['#FF6B2B','#0A7B3E','#1A4FBE','#7C3AED','#DC2626','#D97706'];
