import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { notifAPI } from '../services/api';
import { useNotifStore } from '../store/notifStore';
import { timeAgo } from '../utils/helpers';
import toast from 'react-hot-toast';

const NOTIF_ICONS = {
  issue_accepted: '✅', issue_inprogress: '🔧', issue_completed: '🎉', issue_reopened: '🔄',
  issue_verified: '⭐', new_comment: '💬', new_vote: '👍', volunteer_taken: '🤝',
  feedback_request: '⭐', nearby_issue: '📍', system: '🔔', default: '🔔',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { markRead } = useNotifStore();

  const { data, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifAPI.getAll({ limit: 50 }).then(r => r.data),
    staleTime: 10000,
  });

  const handleMarkAll = async () => {
    try { await notifAPI.markRead(); refetch(); markRead(); toast.success('All marked as read'); }
    catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try { await notifAPI.delete(id); refetch(); }
    catch {}
  };

  const handleClick = (notif) => {
    if (!notif.read) { notifAPI.markRead([notif._id]).then(refetch); }
    if (notif.data?.actionUrl) navigate(notif.data.actionUrl);
    else if (notif.data?.issueId) navigate(`/issues/${notif.data.issueId}`);
  };

  const notifications = data?.data || [];

  return (
    <main className="page pt-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display font-800 text-navy text-xl">🔔 Notifications</h1>
        {notifications.some(n => !n.read) && (
          <button onClick={handleMarkAll} className="btn btn-ghost btn-sm text-xs">Mark all read</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🔔</div>
          <h3 className="font-700 text-gray-600 mb-1">No notifications</h3>
          <p className="text-sm">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => (
            <motion.div key={notif._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className={`card p-3.5 cursor-pointer border transition-all hover:shadow-md ${!notif.read ? 'border-saffron/30 bg-saffron/3' : 'border-gray-100'}`}
              onClick={() => handleClick(notif)}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${!notif.read ? 'bg-saffron/15' : 'bg-gray-100'}`}>
                  {NOTIF_ICONS[notif.type] || NOTIF_ICONS.default}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`text-sm font-700 ${!notif.read ? 'text-navy' : 'text-gray-700'} line-clamp-1`}>{notif.title}</div>
                    <button onClick={(e) => handleDelete(notif._id, e)} className="text-gray-300 hover:text-red-400 transition-colors text-xs flex-shrink-0">✕</button>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-gray-400">{timeAgo(notif.createdAt)}</span>
                    {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-saffron" />}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}
