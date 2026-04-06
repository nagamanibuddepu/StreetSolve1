import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { issuesAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function FeedbackModal({ issue, onClose, onSubmit }) {
  const [choice, setChoice] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (choice === null) return;
    setLoading(true);
    try {
      const res = await issuesAPI.submitFeedback(issue._id, { satisfied: choice, comment });
      toast.success(choice ? '🎉 Thanks for positive feedback!' : 'Feedback recorded. Issue will be reviewed.');
      onSubmit?.(res.data.data);
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-8"
          initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: 'spring', damping: 30 }}
          onClick={e => e.stopPropagation()}>
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
          <div className="text-center mb-5">
            <div className="text-4xl mb-2">⭐</div>
            <h3 className="font-display font-800 text-navy text-xl mb-1">Rate the Resolution</h3>
            <p className="text-gray-500 text-sm">Is the issue resolved to your satisfaction?</p>
            <div className="mt-2 bg-gray-50 rounded-xl px-3 py-2 text-sm font-600 text-navy">{issue?.title}</div>
          </div>

          <div className="space-y-3 mb-4">
            {[
              { val: true, icon: '👍', label: 'Yes, it\'s resolved!', color: 'border-civic-green bg-civic-green-pale text-civic-green' },
              { val: false, icon: '👎', label: 'No, still a problem', color: 'border-red-400 bg-red-50 text-red-600' },
            ].map(opt => (
              <button key={String(opt.val)} onClick={() => setChoice(opt.val)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 font-700 text-base transition-all
                  ${choice === opt.val ? opt.color + ' border-2' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                <span className="text-2xl">{opt.icon}</span> {opt.label}
              </button>
            ))}
          </div>

          {choice === false && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              ⚠️ If satisfaction drops below 70%, the issue will be <strong>automatically reopened</strong>.
            </div>
          )}

          <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional comment..."
            className="input mb-4 text-sm" />

          <button onClick={submit} disabled={choice === null || loading}
            className={`btn btn-full btn-lg ${choice !== null ? 'btn-primary' : 'btn-ghost'}`}>
            {loading ? '⏳ Submitting...' : 'Submit Feedback'}
          </button>
          <button onClick={onClose} className="btn btn-full btn-ghost mt-2 text-sm">Maybe Later</button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
