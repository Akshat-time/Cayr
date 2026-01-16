
import React, { useState } from 'react';
import { Notification, NotificationType } from '../types';

interface NotificationBellProps {
  notifications: Notification[];
  onClick: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ notifications, onClick }) => {
  const unreadCount = React.useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);
  const recent = React.useMemo(() => notifications.slice(0, 3), [notifications]);
  const [showTooltip, setShowTooltip] = useState(false);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.APPOINTMENT: return '📅';
      case NotificationType.PRESCRIPTION: return '💊';
      case NotificationType.SYSTEM: return '⚙️';
      case NotificationType.MESSAGE: return '💬';
      default: return '🔔';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onClick();
    }
  };

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <button 
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#3b5bfd] hover:bg-[#eff2fe] transition-all relative outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`View notifications, ${unreadCount} unread`}
        aria-haspopup="true"
        aria-expanded={showTooltip}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showTooltip && (
        <div 
          className="absolute right-0 top-full mt-3 w-80 bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 z-[1000] animate-in fade-in zoom-in duration-200"
          role="tooltip"
          aria-label="Recent Notifications Preview"
        >
           <div className="flex items-center justify-between mb-6">
              <h5 className="text-xs font-black uppercase tracking-widest text-slate-800">Recent Alerts</h5>
              <button className="text-[9px] font-black text-[#3b5bfd] uppercase tracking-widest cursor-pointer hover:underline outline-none focus:underline" onClick={onClick}>View All</button>
           </div>
           
           <div className="space-y-4" role="list">
              {recent.length === 0 ? (
                <p className="text-[10px] text-slate-400 uppercase tracking-widest text-center py-4">No new alerts</p>
              ) : (
                recent.map((n) => (
                  <div 
                    key={n.id} 
                    className="flex space-x-3 items-start group/item cursor-pointer focus:outline-none focus:bg-slate-50 p-1 rounded-lg" 
                    onClick={onClick}
                    role="listitem"
                    tabIndex={0}
                  >
                     <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-sm border border-slate-100 group-hover/item:border-[#3b5bfd]/30 transition-all" aria-hidden="true">
                       {getIcon(n.type)}
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-black truncate leading-none mb-1 ${!n.isRead ? 'text-slate-800' : 'text-slate-400'}`}>{n.title}</p>
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                           {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                     </div>
                  </div>
                ))
              )}
           </div>
           
           {unreadCount > 3 && (
             <div className="mt-4 pt-4 border-t border-slate-50 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">+{unreadCount - 3} more unread</p>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
