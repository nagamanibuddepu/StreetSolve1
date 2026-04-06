import { useState } from 'react';
import { motion } from 'framer-motion';
import Avatar from '../common/Avatar';
import { timeAgo } from '../../utils/helpers';
import { commentsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function CommentSection({ issueId, comments: initial = [], onAdd }) {
  const { isAuthenticated, user } = useAuthStore();
  const [comments, setComments] = useState(initial);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await commentsAPI.add(issueId, { text });
      setComments(c => [res.data.data, ...c]);
      setText('');
      onAdd?.();
      toast.success('Comment added!');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleLike = async (id) => {
    try {
      await commentsAPI.like(id);
      setComments(c => c.map(cm => cm._id === id ? { ...cm, likes: cm.likes + 1 } : cm));
    } catch {}
  };

  return (
    <div>
      <div className="section-title text-base">💬 Discussion ({comments.length})</div>

      {isAuthenticated ? (
        <form onSubmit={submit} className="flex gap-2 mb-4">
          <Avatar name={user?.name} size="sm" />
          <div className="flex-1 flex gap-2">
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..."
              className="input flex-1 text-sm py-2" />
            <button type="submit" disabled={loading || !text.trim()} className="btn btn-primary btn-sm px-4">
              {loading ? '...' : 'Post'}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-xs text-gray-400 mb-4 text-center py-3 bg-gray-50 rounded-xl">
          <a href="/login" className="text-saffron font-600">Login</a> to comment
        </div>
      )}

      <div className="space-y-3">
        {comments.length === 0 && <div className="text-center text-gray-400 text-sm py-6">No comments yet. Be the first! 💬</div>}
        {comments.map((c, i) => (
          <motion.div key={c._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
            className="flex gap-2.5 p-3 bg-gray-50 rounded-xl">
            <Avatar name={c.author?.name} url={c.author?.avatar?.url} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-700 text-navy">{c.author?.name}</span>
                <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                {c.author?.role !== 'citizen' && (
                  <span className="text-[10px] bg-saffron/10 text-saffron px-1.5 py-0.5 rounded-full font-600">{c.author?.role}</span>
                )}
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{c.text}</p>
              <button onClick={() => handleLike(c._id)} className="mt-1 text-[10px] text-gray-400 hover:text-saffron transition-colors">
                ❤️ {c.likes || 0}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
