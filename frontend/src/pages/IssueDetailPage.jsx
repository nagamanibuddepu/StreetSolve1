import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { issuesAPI, volunteerAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../components/common/StatusBadge';
import StatusStepper from '../components/common/StatusStepper';
import CommentSection from '../components/issues/CommentSection';
import FeedbackModal from '../components/issues/FeedbackModal';
import Avatar from '../components/common/Avatar';
import { timeAgo, formatDateTime, getSatisfactionColor, STATUS_CONFIG } from '../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_TRANSITIONS = {
  government: { reported: 'accepted', accepted: 'inprogress', inprogress: 'completed', completed: 'verified', reopened: 'inprogress' },
  volunteer: { inprogress: 'completed' },
  ngo: { accepted: 'inprogress', inprogress: 'completed' },
  admin: { reported: 'accepted', accepted: 'inprogress', inprogress: 'completed', completed: 'verified', reopened: 'accepted' },
};

export default function IssueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [showFeedback, setShowFeedback] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['issue', id],
    queryFn: () => issuesAPI.getById(id).then(r => r.data.data),
  });

  if (isLoading) return (
    <main className="page pt-4">
      <div className="card h-48 animate-pulse bg-gray-100 mb-3" />
      <div className="card h-20 animate-pulse bg-gray-100 mb-3" />
    </main>
  );
  if (!data) return (
    <main className="page pt-4 text-center py-16">
      <div className="text-5xl mb-3">❌</div>
      <h3 className="font-700">Issue not found</h3>
      <button onClick={() => navigate('/issues')} className="btn btn-primary mt-4">← Back to Issues</button>
    </main>
  );

  const issue = data;
  const nextStatus = STATUS_TRANSITIONS[user?.role]?.[issue.status];
  const canTake = isAuthenticated && ['volunteer','ngo'].includes(user?.role) && !issue.assignedVolunteer && ['reported','accepted'].includes(issue.status);
  const canFeedback = isAuthenticated && ['completed','verified'].includes(issue.status) && !issue.userFeedback;

  const handleVote = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    try { await issuesAPI.vote(id); refetch(); toast.success(issue.hasVoted ? 'Vote removed' : 'Voted! 👍'); }
    catch (err) { toast.error(err.message); }
  };

  const handleTake = async () => {
    try { await issuesAPI.take(id); refetch(); toast.success('You\'ve taken this issue! 🎉'); }
    catch (err) { toast.error(err.message); }
  };

  const handleStatusUpdate = async (status) => {
    try {
      await issuesAPI.updateStatus(id, { status });
      refetch();
      toast.success(`Status updated to: ${STATUS_CONFIG[status]?.label}`);
    } catch (err) { toast.error(err.message); }
  };

  return (
    <main className="page pt-2">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-navy mb-4 font-600">← Back</button>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card mb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="font-display font-800 text-navy text-lg leading-snug flex-1">{issue.title}</h1>
          <StatusBadge status={issue.status} />
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <CategoryBadge category={issue.category} />
          <PriorityBadge priority={issue.priority} />
          {issue.trending && <span className="badge bg-saffron/10 text-saffron">🔥 Trending</span>}
          {issue.overdue && <span className="badge bg-red-100 text-red-700">⚠️ Overdue</span>}
        </div>
        <p className="text-gray-600 text-sm leading-relaxed mb-3">{issue.description}</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">📍 {issue.location?.address || issue.location?.city}</span>
          <span className="flex items-center gap-1">🏢 {issue.department}</span>
          <span className="flex items-center gap-1">🗓️ {timeAgo(issue.createdAt)}</span>
          <span className="flex items-center gap-1">👤 {issue.isAnonymous ? 'Anonymous' : issue.reportedBy?.name}</span>
        </div>
        {issue.routedTo && (
          <div className="mt-3 bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700 font-600">
            🏛️ Routed to: {issue.routedTo?.name}
          </div>
        )}
      </motion.div>

      {/* Progress */}
      <div className="card mb-3">
        <div className="section-title text-sm mb-3">📊 Progress</div>
        <StatusStepper status={issue.status} />
        {issue.assignedVolunteer && (
          <div className="flex items-center gap-2 mt-3 bg-civic-green-pale rounded-xl px-3 py-2">
            <Avatar name={issue.assignedVolunteer?.name} url={issue.assignedVolunteer?.avatar?.url} size="sm" />
            <div className="text-xs">
              <div className="font-600 text-civic-green">🤝 Working on it</div>
              <div className="text-gray-600">{issue.assignedVolunteer?.name} · {issue.assignedVolunteer?.organization?.name}</div>
            </div>
          </div>
        )}
      </div>

      {/* Satisfaction */}
      {issue.satisfactionScore != null && (
        <div className="card mb-3">
          <div className="section-title text-sm mb-2">⭐ Satisfaction</div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Community Rating</span>
            <span className="font-800 font-display text-xl" style={{ color: getSatisfactionColor(issue.satisfactionScore) }}>
              {issue.satisfactionScore}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${issue.satisfactionScore}%` }} transition={{ duration: 1, delay: 0.3 }}
              className="h-full rounded-full" style={{ background: getSatisfactionColor(issue.satisfactionScore) }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>👍 {issue.feedback?.yes || 0} satisfied</span>
            <span>Based on {issue.feedback?.total || 0} responses</span>
            <span>👎 {issue.feedback?.no || 0} not satisfied</span>
          </div>
          {issue.satisfactionScore < 70 && <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">⚠️ Below 70% – issue may be reopened</div>}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button onClick={handleVote}
          className={`btn btn-sm flex-1 ${issue.hasVoted ? 'btn-primary' : 'btn-outline'}`}>
          👍 {issue.voteCount || 0} {issue.hasVoted ? '(Voted)' : 'Vote'}
        </button>
        {canTake && <button onClick={handleTake} className="btn btn-sm btn-green flex-1">🙋 Take Issue</button>}
        {nextStatus && <button onClick={() => handleStatusUpdate(nextStatus)} className="btn btn-sm btn-navy flex-1">➡️ Mark {STATUS_CONFIG[nextStatus]?.label}</button>}
        {canFeedback && <button onClick={() => setShowFeedback(true)} className="btn btn-sm btn-primary flex-1">⭐ Give Feedback</button>}
      </div>

      {/* Media */}
      {issue.media?.length > 0 && (
        <div className="card mb-3">
          <div className="section-title text-sm mb-2">📸 Photos</div>
          <div className="grid grid-cols-3 gap-2">
            {issue.media.map((m, i) => (
              <img key={i} src={m.url} alt="" className="w-full h-24 object-cover rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Status History */}
      {issue.statusHistory?.length > 1 && (
        <div className="card mb-3">
          <div className="section-title text-sm mb-3">📝 Activity Log</div>
          <div className="space-y-2">
            {[...issue.statusHistory].reverse().map((h, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-saffron mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-600 text-navy">{STATUS_CONFIG[h.status]?.label}</span>
                  {h.note && <span className="text-gray-500"> – {h.note}</span>}
                  <div className="text-gray-400">{formatDateTime(h.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="card mb-4">
        <CommentSection issueId={id} comments={issue.comments || []} onAdd={refetch} />
      </div>

      {showFeedback && <FeedbackModal issue={issue} onClose={() => setShowFeedback(false)} onSubmit={refetch} />}
    </main>
  );
}
