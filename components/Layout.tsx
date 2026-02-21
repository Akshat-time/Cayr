
import React from 'react';
import { User, UserRole, Appointment, AppointmentStatus, Notification } from '../types';
import NotificationBell from './NotificationBell';
import AIAssistant from './AIAssistant';

interface LayoutProps {
  user: User | null;
  children: React.ReactNode;
  onLogout: () => void;
  currentModule: string;
  onModuleChange: (module: string) => void;
  appointments?: Appointment[];
  notifications?: Notification[];
}

const SidebarIcon = ({ name }: { name: string }) => {
  const icons: Record<string, React.ReactElement> = {
    'Overview': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    'Appointment': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    'Patients': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    'Payments': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
    'Analytics': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    'Dashboard': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    'Profile': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    'Notifications': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  };
  return icons[name] || icons['Dashboard'];
};

const Layout: React.FC<LayoutProps> = ({
  user, children, onLogout, currentModule, onModuleChange, appointments = [], notifications = []
}) => {
  const doctorNav = ['Overview', 'Appointment', 'Patients', 'Analytics', 'Payments', 'Notifications'];
  const patientNav = ['Dashboard', 'Analytics', 'Payments', 'Notifications', 'Profile'];

  const normalizedRole = (user?.role ?? '').toUpperCase();
  const navItems = normalizedRole === UserRole.PATIENT ? patientNav : doctorNav;
  const isDoctor = normalizedRole === UserRole.DOCTOR;
  const isAdmin = normalizedRole === UserRole.ADMIN;

  const pendingCount = React.useMemo(() =>
    isDoctor
      ? appointments.filter(a => a.doctorId === user?.id && a.status === AppointmentStatus.PENDING).length
      : 0,
    [appointments, isDoctor, user?.id]);

  const unreadNotifCount = React.useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7fe]">
      {/* Sidebar - Landmark: navigation */}
      <aside
        className="w-20 lg:w-64 bg-white border-r border-[#eff2f6] flex flex-col items-center lg:items-start p-4 lg:p-6 transition-all z-20"
        role="complementary"
        aria-label="Main Sidebar"
      >
        <div
          className="mb-14 flex items-center space-x-3 group cursor-pointer pl-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
          onClick={() => onModuleChange(isDoctor ? 'Overview' : 'Dashboard')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onModuleChange(isDoctor ? 'Overview' : 'Dashboard')}
          aria-label="Go to Home Dashboard"
        >
          <img
            src="/cayr-logo.png"
            alt="Cayr Logo"
            className="scale-90 w-auto object-contain group-hover:scale-105 transition-transform"
          />
        </div>

        <nav className="flex-1 w-full space-y-2" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = currentModule === item || (currentModule === 'Dashboard' && item === 'Overview');
            return (
              <button
                key={item}
                onClick={() => onModuleChange(item)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full sidebar-item p-3.5 lg:px-4 lg:py-3.5 rounded-2xl flex items-center justify-center lg:justify-start space-x-4 transition-all relative outline-none focus:ring-2 focus:ring-blue-500/40 ${isActive
                  ? 'active bg-[#3b5bfd] text-white shadow-xl shadow-blue-500/20'
                  : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#3b5bfd]'
                  }`}
              >
                <SidebarIcon name={item} />
                <span className="hidden lg:block font-black text-xs uppercase tracking-widest">{item}</span>
                {item === 'Appointment' && pendingCount > 0 && (
                  <span
                    className="absolute top-2 right-2 lg:relative lg:top-0 lg:right-0 lg:ml-auto w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce shadow-md"
                    aria-label={`${pendingCount} pending appointments`}
                  >
                    {pendingCount}
                  </span>
                )}
                {item === 'Notifications' && unreadNotifCount > 0 && (
                  <span
                    className="absolute top-2 right-2 lg:relative lg:top-0 lg:right-0 lg:ml-auto w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md"
                    aria-label={`${unreadNotifCount} unread notifications`}
                  >
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <button
          onClick={onLogout}
          className="mt-auto w-full p-4 lg:px-4 lg:py-4 rounded-2xl flex items-center justify-center lg:justify-start space-x-4 text-[#94a3b8] hover:text-rose-500 hover:bg-rose-50 transition-all font-black uppercase tracking-widest text-[10px] outline-none focus:ring-2 focus:ring-rose-500/20"
          aria-label="Logout Session"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3 3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          <span className="hidden lg:block">Logout Session</span>
        </button>
      </aside>

      {/* Main Container - Landmark: banner and main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[#eff2f6]/50 flex items-center justify-between px-10 z-10" role="banner">
          <div className="flex items-center">
            <div className="flex items-center space-x-4 text-[#94a3b8] bg-[#f8fafc] px-6 py-2.5 rounded-full border border-[#eff2f6] shadow-inner focus-within:border-[#3b5bfd]/30 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Search clinical files, patients..."
                className="bg-transparent text-xs font-black outline-none w-72 placeholder-[#94a3b8] uppercase tracking-widest"
                aria-label="Global Search"
              />
            </div>
          </div>

          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-6">
              <NotificationBell
                notifications={notifications}
                onClick={() => onModuleChange('Notifications')}
              />
            </div>

            <div
              className="flex items-center space-x-4 pl-8 border-l border-[#eff2f6] cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
              onClick={() => onModuleChange('Profile')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onModuleChange('Profile')}
              aria-label="View User Profile Settings"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#f8fafc] shadow-sm group-hover:scale-105 transition-transform">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="User Profile Avatar" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-black text-[#1a1d1f] leading-none uppercase tracking-widest">{user?.name}</p>
                <p className="text-[9px] font-black text-[#3b5bfd] mt-1.5 uppercase tracking-widest opacity-80">
                  {isDoctor ? `Verified Doctor${user?.specialty ? ' • ' + user.specialty : ''}` : isAdmin ? 'Administrator' : 'Verified Patient'}
                </p>
              </div>
              <svg className="w-4 h-4 text-[#94a3b8] hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 relative bg-[#f4f7fe]" id="main-content" role="main">
          {children}
          {/* Global AI Assistant */}
          <AIAssistant />
        </main>
      </div>
    </div>
  );
};

export default Layout;
