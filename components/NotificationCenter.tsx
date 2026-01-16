
import React, { useState, useMemo } from 'react';
import { Notification, NotificationType } from '../types';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onMarkAllAsRead: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  notifications, onMarkAsRead, onDelete, onClearAll, onMarkAllAsRead 
}) => {
  const [filter, setFilter] = useState<NotificationType | 'ALL' | 'UNREAD'>('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'UNREAD_FIRST'>('NEWEST');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    if (filter === 'UNREAD') {
      result = result.filter(n => !n.isRead);
    } else if (filter !== 'ALL') {
      result = result.filter(n => n.type === filter);
    }

    if (search) {
      result = result.filter(n => 
        n.title.toLowerCase().includes(search.toLowerCase()) || 
        n.message.toLowerCase().includes(search.toLowerCase())
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'UNREAD_FIRST') {
        if (a.isRead === b.isRead) return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        return a.isRead ? 1 : -1;
      }
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortBy === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [notifications, filter, search, sortBy]);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.APPOINTMENT:
        return { icon: '📅', color: 'bg-blue-50 text-blue-500 border-blue-100' };
      case NotificationType.PRESCRIPTION:
        return { icon: '💊', color: 'bg-green-50 text-green-500 border-green-100' };
      case NotificationType.SYSTEM:
        return { icon: '⚙️', color: 'bg-amber-50 text-amber-500 border-amber-100' };
      case NotificationType.MESSAGE:
        return { icon: '💬', color: 'bg-purple-50 text-purple-500 border-purple-100' };
      default:
        return { icon: '🔔', color: 'bg-slate-50 text-slate-500 border-slate-100' };
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Notifications</h1>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-3">Stay updated with your clinical activity</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={onMarkAllAsRead} className="px-5 py-2.5 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">Mark all as read</button>
          <button onClick={onClearAll} className="px-5 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-100 transition-all">Clear archive</button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        {/* Filters Header */}
        <div className="p-8 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex flex-wrap gap-2">
            {['ALL', 'UNREAD', ...Object.values(NotificationType)].map((t) => (
              <button
                key={t}
                onClick={() => { setFilter(t as any); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  filter === t 
                  ? 'bg-[#3b5bfd] text-white border-[#3b5bfd] shadow-lg shadow-blue-100' 
                  : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row gap-4 lg:ml-auto">
            <div className="relative flex-1 group">
               <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#3b5bfd]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
               <input 
                 value={search}
                 onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                 placeholder="Search notifications..." 
                 className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-[#3b5bfd] transition-all" 
               />
            </div>
            <select 
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as any); setCurrentPage(1); }}
              className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none focus:border-[#3b5bfd] transition-all"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="UNREAD_FIRST">Unread First</option>
            </select>
          </div>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-slate-50">
          {paginatedNotifications.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-3xl mx-auto mb-6 grayscale opacity-50">📭</div>
              <h3 className="text-lg font-black text-slate-800">No notifications found</h3>
              <p className="text-sm text-slate-400 mt-2 font-medium">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            paginatedNotifications.map((n) => {
              const style = getIcon(n.type);
              return (
                <div key={n.id} className={`p-8 flex items-start space-x-6 hover:bg-slate-50/50 transition-colors relative group ${!n.isRead ? 'bg-blue-50/20' : ''}`}>
                  {!n.isRead && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-[#3b5bfd] rounded-r-full"></div>}
                  
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl border-2 flex-shrink-0 ${style.color}`}>
                    {style.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                       <h4 className={`text-base font-black tracking-tight truncate pr-4 ${!n.isRead ? 'text-slate-900' : 'text-slate-500'}`}>{n.title}</h4>
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">
                         {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.timestamp).toLocaleDateString()}
                       </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${!n.isRead ? 'text-slate-600 font-bold' : 'text-slate-400 font-medium'}`}>{n.message}</p>
                    
                    <div className="flex items-center space-x-4 mt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                       {!n.isRead && (
                         <button onClick={() => onMarkAsRead(n.id)} className="text-[9px] font-black text-[#3b5bfd] uppercase tracking-widest hover:underline">Mark as read</button>
                       )}
                       <button onClick={() => onDelete(n.id)} className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
             <div className="flex space-x-2">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#3b5bfd] disabled:opacity-30 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#3b5bfd] disabled:opacity-30 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
