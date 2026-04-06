import { CATEGORY_CONFIG, PRIORITY_CONFIG, STATUS_CONFIG } from '../../utils/helpers';

export const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.reported;
  return <span className={`badge ${cfg.color}`}>{cfg.icon} {cfg.label}</span>;
};

export const CategoryBadge = ({ category }) => {
  const cfg = CATEGORY_CONFIG[category] || { icon:'📋', color:'badge-reported' };
  return <span className={`badge ${cfg.color}`}>{cfg.icon} {category}</span>;
};

export const PriorityBadge = ({ priority }) => {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return <span className={`badge ${cfg.color}`}>{cfg.label}</span>;
};
