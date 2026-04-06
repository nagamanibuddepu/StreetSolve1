import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { notificationAPI } from '../../services/api';
import { timeAgo } from '../../utils/helpers';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data } = useQuery('notifications', () => notificationAPI.get({ limit: 10 }), {
    refetchInterval: 30000,
    select: d => d.data,
  });

  const markRead = useMutation(() => notificationAPI.markRead('all'), {
    onSuccess: () => qc.invalidateQueries('notifications'),
  });

  const unread = data?.unreadCount || 0;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
        🔔
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px] px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-card-hover border border-gray-100 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-bold text-sm">Notifications</span>
              {unread > 0 && (
                <button onClick={() => markRead.mutate()} className="text-xs text-saffron font-semibold hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {data?.data?.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No notifications yet</div>
              ) : (
                data?.data?.map(n => (
                  <div key={n._id} className={`px-4 py-3 border-b border-gray-50 ${!n.read ? 'bg-saffron/5' : ''}`}>
                    <div className="font-semibold text-xs text-gray-800">{n.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
