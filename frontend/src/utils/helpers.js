import { formatDistanceToNow, format } from 'date-fns';

export const STATUS_CONFIG = {
  reported:   { label: 'Reported',    color: 'badge-reported',   icon: '📋', step: 0 },
  accepted:   { label: 'Accepted',    color: 'badge-accepted',   icon: '✅', step: 1 },
  inprogress: { label: 'In Progress', color: 'badge-inprogress', icon: '🔧', step: 2 },
  completed:  { label: 'Completed',   color: 'badge-completed',  icon: '🎉', step: 3 },
  verified:   { label: 'Verified',    color: 'badge-verified',   icon: '⭐', step: 4 },
  reopened:   { label: 'Reopened',    color: 'badge-reopened',   icon: '🔄', step: 3 },
  rejected:   { label: 'Rejected',    color: 'badge-rejected',   icon: '❌', step: -1 },
};

export const CATEGORY_CONFIG = {
  Roads:       { icon: '🛣️',  color: 'badge-roads',       dept: 'Roads Department' },
  Sanitation:  { icon: '🗑️',  color: 'badge-sanitation',  dept: 'Sanitation Department' },
  Water:       { icon: '💧',  color: 'badge-water',        dept: 'Water Department' },
  Electricity: { icon: '⚡',  color: 'badge-electricity',  dept: 'Electricity Department' },
  Parks:       { icon: '🌳',  color: 'badge-parks',        dept: 'Parks Department' },
  Drainage:    { icon: '🏗️', color: 'badge-water',        dept: 'Drainage Department' },
  Noise:       { icon: '🔊',  color: 'badge-accepted',     dept: 'Noise & Environment Department' },
  Others:      { icon: '📋',  color: 'badge-reported',     dept: 'General' },
};

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', speechCode: 'en-IN' },
  { code: 'hi', label: 'Hindi',   native: 'हिंदी',    speechCode: 'hi-IN' },
  { code: 'te', label: 'Telugu',  native: 'తెలుగు',   speechCode: 'te-IN' },
  { code: 'ta', label: 'Tamil',   native: 'தமிழ்',    speechCode: 'ta-IN' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ',   speechCode: 'kn-IN' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', speechCode: 'ml-IN' },
];

export const PRIORITY_CONFIG = {
  low:      { color: 'bg-green-100 text-green-700',  label: 'Low' },
  medium:   { color: 'bg-yellow-100 text-yellow-700', label: 'Medium' },
  high:     { color: 'bg-orange-100 text-orange-700', label: 'High' },
  critical: { color: 'bg-red-100 text-red-700',       label: '🚨 Critical' },
};

export const timeAgo = (date) => formatDistanceToNow(new Date(date), { addSuffix: true });
export const formatDate = (date) => format(new Date(date), 'dd MMM yyyy');
export const formatDateTime = (date) => format(new Date(date), 'dd MMM yyyy, hh:mm a');

export const getAvatarInitials = (name = '') => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
export const getAvatarColor = (name = '') => {
  const colors = ['#FF6B2B', '#0A7B3E', '#1A4FBE', '#7C3AED', '#DC2626', '#D97706', '#0891B2'];
  return colors[name.charCodeAt(0) % colors.length];
};

export const getSatisfactionColor = (score) => {
  if (score >= 80) return '#0A7B3E';
  if (score >= 60) return '#D97706';
  return '#DC2626';
};

export const classifyKeywords = (text) => {
  if (!text) return '';
  const t = text.toLowerCase();
  const checks = {
    Roads: [
      'pothole', 'road', 'path', 'pavement', 'highway', 'bridge', 'crack', 'footpath',
      'speed breaker', 'divider', 'tar', 'asphalt', 'damaged road', 'broken road',
      // Telugu
      'రోడ్', 'గుంత', 'రహదారి',
      // Hindi
      'सड़क', 'गड्ढा', 'रास्ता',
      // Tamil
      'சாலை', 'குழி',
    ],
    Sanitation: [
      'garbage', 'waste', 'trash', 'rubbish', 'sewage', 'smell', 'dirty', 'litter',
      'dustbin', 'dump', 'stink', 'hygiene', 'sanitation', 'clean', 'sweeping',
      // Telugu
      'చెత్త', 'మురికి', 'కంపు',
      // Hindi
      'कचरा', 'गंदगी', 'सफाई',
      // Tamil
      'குப்பை', 'அழுக்கு',
    ],
    Water: [
      'water', 'pipe', 'leak', 'tap', 'supply', 'flood', 'overflow', 'waterlog',
      'drainage', 'sewer', 'borewell', 'tanker', 'shortage',
      // Telugu
      'నీళ్ళు', 'నీరు', 'పైపు', 'లీక్',
      // Hindi
      'पानी', 'नल', 'पाइप', 'बाढ़',
      // Tamil
      'தண்ணீர்', 'குழாய்',
    ],
    Electricity: [
      'light', 'electric', 'power', 'transformer', 'wire', 'blackout', 'current',
      'streetlight', 'street light', 'voltage', 'outage', 'pole', 'cable',
      // Telugu
      'కరెంట్', 'లైటు', 'విద్యుత్',
      // Hindi
      'बिजली', 'लाइट', 'करंट',
      // Tamil
      'மின்சாரம்', 'விளக்கு',
    ],
    Drainage: [
      'drain', 'blocked', 'clog', 'stagnant', 'overflow', 'waterlogging', 'gutter',
      'nala', 'canal',
      // Telugu
      'కాలువ', 'డ్రైన్',
    ],
    Parks: [
      'park', 'garden', 'tree', 'plant', 'grass', 'bench', 'playground', 'ground',
      // Telugu
      'పార్కు', 'చెట్టు',
    ],
  };
  for (const [cat, kws] of Object.entries(checks)) {
    if (kws.some(k => t.includes(k.toLowerCase()))) return cat;
  }
  return '';
};
