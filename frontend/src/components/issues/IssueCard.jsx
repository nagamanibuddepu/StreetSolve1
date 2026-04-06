import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../common/StatusBadge';
import Avatar from '../common/Avatar';
import { timeAgo } from '../../utils/helpers';
import { issuesAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useIssueStore } from '../../store/issueStore';
import toast from 'react-hot-toast';

export default function IssueCard({ issue, compact = false, idx = 0 }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const updateIssue = useIssueStore(s => s.updateIssue);

  const handleVote = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      const res = await issuesAPI.vote(issue._id);
      updateIssue(issue._id, { voteCount: res.data.data.voteCount, hasVoted: res.data.data.hasVoted });
    } catch (err) { toast.error(err.message || 'Vote failed'); }
  };

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: idx*0.04 }}
      className="card-hover mb-2.5" onClick={() => navigate(`/issues/${issue._id}`)}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-display font-semibold text-slate-800 text-sm leading-snug line-clamp-2 flex-1">{issue.title}</h3>
        <StatusBadge status={issue.status} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        <CategoryBadge category={issue.category} />
        {issue.priority && issue.priority !== 'medium' && <PriorityBadge priority={issue.priority} />}
        {issue.trending && <span className="badge bg-orange-100 text-orange-700">🔥 Trending</span>}
      </div>
      {!compact && <p className="text-slate-500 text-xs leading-relaxed mb-2.5 line-clamp-2">{issue.description}</p>}
      <div className="text-xs text-slate-400 mb-3">
        📍 {issue.location?.formattedAddress || issue.location?.address || issue.location?.city || 'Unknown location'}
        {' · '}{timeAgo(issue.createdAt)}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Avatar name={issue.reportedBy?.name} url={issue.reportedBy?.avatar?.url} size="sm" />
          <span className="text-xs text-slate-500">{issue.isAnonymous ? 'Anonymous' : issue.reportedBy?.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleVote}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all
              ${issue.hasVoted ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-orange-300'}`}>
            👍 {issue.voteCount || 0}
          </button>
          <span className="text-xs text-slate-400">💬 {issue.commentCount || 0}</span>
          {issue.satisfactionScore != null && (
            <span className="text-xs font-semibold text-green-600">⭐ {issue.satisfactionScore}%</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
