
import React, { useState, useMemo, useEffect } from 'react';
import { User, Appointment, AppointmentStatus, PatientRecord, Payment } from '../types';
import {
   PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
   AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import MultilingualBridge from './MultilingualBridge';

interface DoctorDashboardProps {
   user: User;
   appointments: Appointment[];
   payments: Payment[];
   updateStatus: (id: string, status: AppointmentStatus) => void;
   patients: PatientRecord[];
   onUpdatePatient: (patient: PatientRecord) => void;
   onStartCall?: (patientName: string) => void;
   /** Controlled view driven by Layout sidebar */
   activeView?: string;
   onViewChange?: (view: string) => void;
}

const COLORS = ['#3b5bfd', '#ff5c6c', '#ffa927', '#10b981'];

const SIDEBAR_TO_VIEW: Record<string, string> = {
   'Overview': 'Overview',
   'Appointment': 'Appointment',
   'Patients': 'Patients',
   'Analytics': 'Analytics',
   'Payments': 'Payments',
   'Settings': 'Settings',
};

const TOP_TABS = [
   { id: 'Overview', label: 'Overview', icon: '📊' },
   { id: 'Appointment', label: 'Appointments', icon: '📅' },
   { id: 'Patients', label: 'Directory', icon: '👤' },
   { id: 'Analytics', label: 'Analytics', icon: '📈' },
   { id: 'Payments', label: 'Clearance', icon: '💰' },
   { id: 'Settings', label: 'Settings', icon: '⚙️' },
];

// ── Theme helpers ──────────────────────────────────────────────────────────────
type Theme = {
   bg: string;
   card: string;
   cardBorder: string;
   text: string;
   textMuted: string;
   textSubtle: string;
   inputBg: string;
   divider: string;
   rowHover: string;
   badgeMuted: string;
   tabActive: string;
   tabInactive: string;
   settingRow: string;
};

const lightTheme: Theme = {
   bg: 'bg-[#f4f7fe]',
   card: 'bg-white',
   cardBorder: 'border-slate-100',
   text: 'text-slate-800',
   textMuted: 'text-slate-400',
   textSubtle: 'text-slate-500',
   inputBg: 'bg-slate-50',
   divider: 'divide-slate-50',
   rowHover: 'hover:bg-slate-50',
   badgeMuted: 'bg-slate-100 text-slate-600',
   tabActive: 'bg-white text-[#3b5bfd] shadow-xl',
   tabInactive: 'text-slate-400 hover:text-slate-600',
   settingRow: 'bg-slate-50 hover:bg-slate-100',
};

const darkTheme: Theme = {
   bg: 'bg-[#0f1117]',
   card: 'bg-[#1a1d27]',
   cardBorder: 'border-[#2a2d3a]',
   text: 'text-slate-100',
   textMuted: 'text-slate-400',
   textSubtle: 'text-slate-500',
   inputBg: 'bg-[#252836]',
   divider: 'divide-[#2a2d3a]',
   rowHover: 'hover:bg-[#252836]',
   badgeMuted: 'bg-[#2a2d3a] text-slate-300',
   tabActive: 'bg-[#3b5bfd] text-white shadow-xl shadow-blue-900/40',
   tabInactive: 'text-slate-500 hover:text-slate-300',
   settingRow: 'bg-[#252836] hover:bg-[#2e3145]',
};

// ── Toggle switch component ────────────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: () => void; label?: string }> = ({ checked, onChange, label }) => (
   <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${checked ? 'bg-[#3b5bfd]' : 'bg-slate-300'}`}
   >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
   </button>
);

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
   user, appointments, payments, updateStatus, patients, onStartCall,
   activeView: controlledView, onViewChange,
}) => {
   const [localView, setLocalView] = useState(controlledView ?? 'Overview');
   const [isBridgeOpen, setIsBridgeOpen] = useState(false);
   const [selectedPatientId, setSelectedPatientId] = useState<string | null>(patients[0]?.id || null);

   // ── Theme state persisted in localStorage ──────────────────────────────────
   const [darkMode, setDarkMode] = useState<boolean>(() => {
      try { return localStorage.getItem('doctorDarkMode') === 'true'; } catch { return false; }
   });

   // ── Settings state ──────────────────────────────────────────────────────────
   const [twoFA, setTwoFA] = useState(false);
   const [emailNotifs, setEmailNotifs] = useState(true);
   const [smsNotifs, setSmsNotifs] = useState(false);
   const [sessionAlerts, setSessionAlerts] = useState(true);
   const [biometric, setBiometric] = useState(false);

   const T = darkMode ? darkTheme : lightTheme;

   const toggleDark = () => {
      setDarkMode(prev => {
         const next = !prev;
         try { localStorage.setItem('doctorDarkMode', String(next)); } catch { }
         return next;
      });
   };

   // Sync when parent (sidebar) changes the view
   useEffect(() => {
      if (controlledView) {
         const mapped = SIDEBAR_TO_VIEW[controlledView] ?? controlledView;
         setLocalView(mapped);
      }
   }, [controlledView]);

   const setView = (v: string) => {
      setLocalView(v);
      onViewChange?.(v);
   };

   const myAppointments = useMemo(() => appointments.filter(a => a.doctorId === user.id), [appointments, user.id]);
   const pendingRequests = myAppointments.filter(a => a.status === AppointmentStatus.PENDING);
   const confirmed = myAppointments.filter(a => a.status === AppointmentStatus.CONFIRMED);
   const activePatient = patients.find(p => p.id === selectedPatientId) || patients[0];

   const vitalsData = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
      day: `D${i + 1}`,
      bp: 120 + Math.random() * 20,
      hr: 70 + Math.random() * 15,
      glu: 90 + Math.random() * 40,
   })), []);

   const revenueData = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
      month: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'][i],
      revenue: 8000 + Math.random() * 6000,
      visits: 20 + Math.floor(Math.random() * 30),
   })), []);

   // ── Overview ──────────────────────────────────────────────────────────────
   const renderOverview = () => (
      <div className="space-y-10 animate-in fade-in duration-700">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
               <h1 className={`text-4xl font-black tracking-tighter ${T.text}`}>Physician Control</h1>
               <p className={`text-sm font-black uppercase tracking-widest mt-2 ${T.textMuted}`}>
                  Doctor Profile: {user.name} • {(user as any).specialty ?? 'General'}
               </p>
            </div>
            <button onClick={() => setIsBridgeOpen(true)}
               className="px-10 py-5 bg-indigo-600 text-white rounded-[28px] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all flex items-center space-x-4">
               <span className="text-2xl">🇮🇳</span>
               <span>Indian Language Interpreter</span>
            </button>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
               { label: 'Visits Confirmed', value: confirmed.length, icon: '📅', color: darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-500' },
               { label: 'Active Roster', value: patients.length, icon: '👤', color: darkMode ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-500' },
               { label: 'Risk Flags', value: patients.filter(p => p.status === 'RISK').length, icon: '⚠️', color: darkMode ? 'bg-rose-900/40 text-rose-300' : 'bg-rose-50 text-rose-500' },
               { label: 'Clearance Revenue', value: '$12.4k', icon: '💰', color: 'bg-slate-900 text-white' },
            ].map((stat, i) => (
               <div key={i} className={`p-10 rounded-[48px] ${stat.label === 'Clearance Revenue' ? 'bg-slate-900 text-white' : `${T.card} border ${T.cardBorder}`} shadow-sm relative overflow-hidden hover:shadow-xl transition-all`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 ${stat.label === 'Clearance Revenue' ? 'bg-white/10' : stat.color}`}>{stat.icon}</div>
                  <p className="text-4xl font-black tracking-tighter">{stat.value}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-2 opacity-50`}>{stat.label}</p>
               </div>
            ))}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className={`lg:col-span-2 ${T.card} rounded-[48px] p-10 border ${T.cardBorder} shadow-sm`}>
               <h3 className={`text-xl font-black tracking-tight mb-8 ${T.text}`}>Pending Intake Requests</h3>
               <div className="space-y-6">
                  {pendingRequests.length === 0 ? (
                     <div className={`py-24 text-center font-black uppercase text-[10px] tracking-[0.3em] ${T.textMuted}`}>Vault cleared • No pending intakes</div>
                  ) : pendingRequests.map(req => (
                     <div key={req.id} className={`p-6 ${T.inputBg} rounded-[32px] border border-transparent hover:border-blue-100 hover:${T.card} transition-all flex items-center justify-between`}>
                        <div className="flex items-center space-x-6">
                           <div className={`w-16 h-16 ${T.card} rounded-3xl overflow-hidden border ${T.cardBorder}`}>
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.patientName}`} alt="" />
                           </div>
                           <div>
                              <p className={`text-lg font-black ${T.text}`}>{req.patientName}</p>
                              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${T.textMuted}`}>{req.date} • {req.time}</p>
                           </div>
                        </div>
                        <div className="flex space-x-3">
                           <button onClick={() => updateStatus(req.id, AppointmentStatus.CANCELLED)} className={`px-6 py-4 ${T.card} border border-rose-100 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50`}>Reject</button>
                           <button onClick={() => updateStatus(req.id, AppointmentStatus.CONFIRMED)} className="px-6 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700">Approve</button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
            <div className={`${T.card} rounded-[48px] p-10 border ${T.cardBorder} shadow-sm`}>
               <h3 className={`text-xl font-black tracking-tight mb-8 ${T.text}`}>Patient Statistics</h3>
               <div className="h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie data={[{ n: 'High Risk', v: 15 }, { n: 'Active', v: 65 }, { n: 'Routine', v: 20 }]}
                           innerRadius={70} outerRadius={90} paddingAngle={10} dataKey="v" stroke="none">
                           {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', background: darkMode ? '#1a1d27' : '#fff', color: darkMode ? '#f1f5f9' : '#1a1d1f' }} />
                     </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <p className={`text-3xl font-black tracking-tighter ${T.text}`}>100%</p>
                     <p className={`text-[9px] font-black uppercase tracking-widest ${T.textMuted}`}>Visibility</p>
                  </div>
               </div>
               <div className="mt-8 space-y-4">
                  {['High Risk', 'Active Management', 'Routine Review'].map((label, i) => (
                     <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${T.rowHover}`}>
                        <div className="flex items-center space-x-3">
                           <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                           <span className={`text-[10px] font-black uppercase tracking-widest ${T.textMuted}`}>{label}</span>
                        </div>
                        <span className={`text-xs font-black ${T.text}`}>{[15, 65, 20][i]}%</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
         {isBridgeOpen && <MultilingualBridge partnerName="Medical Staff" onClose={() => setIsBridgeOpen(false)} />}
      </div>
   );

   // ── Appointments ──────────────────────────────────────────────────────────
   const renderAppointments = () => (
      <div className="space-y-8 animate-in fade-in duration-700">
         <div>
            <h1 className={`text-4xl font-black tracking-tighter ${T.text}`}>Appointments</h1>
            <p className={`text-sm font-black uppercase tracking-widest mt-2 ${T.textMuted}`}>All scheduled visits</p>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
               { label: 'Pending', value: pendingRequests.length, color: darkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-600', icon: '⏳' },
               { label: 'Confirmed', value: confirmed.length, color: darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-600', icon: '✅' },
               { label: 'Cancelled', value: myAppointments.filter(a => a.status === AppointmentStatus.CANCELLED).length, color: darkMode ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-50 text-rose-600', icon: '❌' },
            ].map((s, i) => (
               <div key={i} className={`${s.color} rounded-[32px] p-8 flex items-center gap-6`}>
                  <span className="text-3xl">{s.icon}</span>
                  <div>
                     <p className="text-3xl font-black">{s.value}</p>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{s.label}</p>
                  </div>
               </div>
            ))}
         </div>

         <div className={`${T.card} rounded-[40px] border ${T.cardBorder} shadow-sm overflow-hidden`}>
            <div className={`p-8 border-b ${T.cardBorder}`}>
               <h2 className={`text-lg font-black ${T.text}`}>All Appointments</h2>
            </div>
            {myAppointments.length === 0 ? (
               <div className={`p-20 text-center font-black uppercase text-[10px] tracking-widest ${T.textMuted}`}>No appointments found</div>
            ) : (
               <div className={`divide-y ${T.divider}`}>
                  {myAppointments.map(appt => {
                     const statusColors: Record<string, string> = {
                        [AppointmentStatus.PENDING]: 'bg-amber-100 text-amber-700',
                        [AppointmentStatus.CONFIRMED]: 'bg-green-100 text-green-700',
                        [AppointmentStatus.CANCELLED]: 'bg-rose-100 text-rose-700',
                        [AppointmentStatus.COMPLETED]: darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600',
                     };
                     return (
                        <div key={appt.id} className={`flex items-center justify-between px-8 py-6 ${T.rowHover} transition-colors`}>
                           <div className="flex items-center gap-5">
                              <div className={`w-12 h-12 rounded-2xl overflow-hidden border ${T.cardBorder} ${T.card}`}>
                                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${appt.patientName}`} alt="" />
                              </div>
                              <div>
                                 <p className={`font-black ${T.text}`}>{appt.patientName}</p>
                                 <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${T.textMuted}`}>{appt.date} • {appt.time}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${statusColors[appt.status] ?? (darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500')}`}>
                                 {appt.status}
                              </span>
                              {appt.status === AppointmentStatus.PENDING && (
                                 <div className="flex gap-2">
                                    <button onClick={() => updateStatus(appt.id, AppointmentStatus.CANCELLED)}
                                       className={`px-4 py-2 ${T.card} border border-rose-100 text-rose-500 rounded-xl text-[9px] font-black uppercase hover:bg-rose-50`}>Reject</button>
                                    <button onClick={() => updateStatus(appt.id, AppointmentStatus.CONFIRMED)}
                                       className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-blue-500/20 hover:bg-blue-700">Approve</button>
                                 </div>
                              )}
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}
         </div>
      </div>
   );

   // ── Patients Directory ─────────────────────────────────────────────────────
   const renderDirectory = () => (
      <div className="space-y-8 animate-in fade-in duration-700">
         <div>
            <h1 className={`text-4xl font-black tracking-tighter ${T.text}`}>Patient Directory</h1>
            <p className={`text-sm font-black uppercase tracking-widest mt-2 ${T.textMuted}`}>{patients.length} active records</p>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map(p => (
               <div key={p.id} className={`${T.card} border ${T.cardBorder} rounded-[36px] p-8 hover:shadow-xl hover:border-blue-100 transition-all group`}>
                  <div className="flex items-center gap-5 mb-6">
                     <div className={`w-16 h-16 rounded-[20px] overflow-hidden border ${T.cardBorder} ${T.inputBg}`}>
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" />
                     </div>
                     <div>
                        <p className={`font-black text-lg leading-tight ${T.text}`}>{p.name}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${T.textMuted}`}>{p.age}y • {p.bloodType}</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     {[
                        { label: 'Diagnoses', value: p.history?.length ?? 0 },
                        { label: 'Medications', value: p.currentMedications?.length ?? 0 },
                        { label: 'Allergies', value: p.allergies?.length ?? 0 },
                        { label: 'Status', value: p.status ?? 'OK' },
                     ].map((item, i) => (
                        <div key={i} className={`${T.inputBg} rounded-2xl px-4 py-3`}>
                           <p className={`text-[9px] font-black uppercase tracking-widest ${T.textMuted}`}>{item.label}</p>
                           <p className={`font-black mt-0.5 ${T.text}`}>{item.value}</p>
                        </div>
                     ))}
                  </div>
                  <button onClick={() => { setSelectedPatientId(p.id); setView('My Patients'); }}
                     className="mt-6 w-full py-4 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                     View Clinical Chart →
                  </button>
               </div>
            ))}
         </div>
      </div>
   );

   // ── Analytics ─────────────────────────────────────────────────────────────
   const renderAnalytics = () => (
      <div className="space-y-10 animate-in fade-in duration-700">
         <div>
            <h1 className={`text-4xl font-black tracking-tighter ${T.text}`}>Analytics</h1>
            <p className={`text-sm font-black uppercase tracking-widest mt-2 ${T.textMuted}`}>Performance &amp; clinical insights</p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className={`${T.card} rounded-[40px] p-10 border ${T.cardBorder} shadow-sm`}>
               <h3 className={`text-lg font-black mb-1 ${T.text}`}>Revenue Trend</h3>
               <p className={`text-[10px] font-black uppercase tracking-widest mb-8 ${T.textMuted}`}>Last 6 months</p>
               <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={revenueData}>
                        <defs>
                           <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b5bfd" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#3b5bfd" stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#2a2d3a' : '#f1f5f9'} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700, fill: darkMode ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: darkMode ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', background: darkMode ? '#1a1d27' : '#fff', color: darkMode ? '#f1f5f9' : '#1a1d1f' }} />
                        <Area type="monotone" dataKey="revenue" stroke="#3b5bfd" strokeWidth={2.5} fill="url(#rev)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className={`${T.card} rounded-[40px] p-10 border ${T.cardBorder} shadow-sm`}>
               <h3 className={`text-lg font-black mb-1 ${T.text}`}>Visit Volume</h3>
               <p className={`text-[10px] font-black uppercase tracking-widest mb-8 ${T.textMuted}`}>Confirmed visits per month</p>
               <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={revenueData}>
                        <defs>
                           <linearGradient id="vis" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#2a2d3a' : '#f1f5f9'} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700, fill: darkMode ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: darkMode ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', background: darkMode ? '#1a1d27' : '#fff', color: darkMode ? '#f1f5f9' : '#1a1d1f' }} />
                        <Area type="monotone" dataKey="visits" stroke="#10b981" strokeWidth={2.5} fill="url(#vis)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         <div className={`${T.card} rounded-[40px] p-10 border ${T.cardBorder} shadow-sm`}>
            <h3 className={`text-lg font-black mb-8 ${T.text}`}>Patient Risk Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {[
                  { label: 'High Risk', value: patients.filter(p => p.status === 'RISK').length, color: '#ff5c6c', bg: darkMode ? 'bg-rose-900/20' : 'bg-rose-50' },
                  { label: 'Active Management', value: Math.floor(patients.length * 0.6), color: '#3b5bfd', bg: darkMode ? 'bg-blue-900/20' : 'bg-blue-50' },
                  { label: 'Routine Review', value: Math.ceil(patients.length * 0.4), color: '#10b981', bg: darkMode ? 'bg-green-900/20' : 'bg-green-50' },
               ].map((row, i) => (
                  <div key={i} className={`${row.bg} rounded-[28px] p-8`}>
                     <div className="w-3 h-3 rounded-full mb-4" style={{ backgroundColor: row.color }} />
                     <p className="text-3xl font-black" style={{ color: row.color }}>{row.value}</p>
                     <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${T.textSubtle}`}>{row.label}</p>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );

   // ── Payments ──────────────────────────────────────────────────────────────
   const renderPayments = () => {
      const total = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
      return (
         <div className="space-y-8 animate-in fade-in duration-700">
            <div>
               <h1 className={`text-4xl font-black tracking-tighter ${T.text}`}>Clearance Ledger</h1>
               <p className={`text-sm font-black uppercase tracking-widest mt-2 ${T.textMuted}`}>Billing &amp; revenue records</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
               {[
                  { label: 'Total Revenue', value: `$${total.toLocaleString()}`, icon: '💵', bg: 'bg-slate-900 text-white' },
                  { label: 'Transactions', value: payments.length, icon: '🧾', bg: darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700' },
                  { label: 'Pending', value: payments.filter(p => (p as any).status === 'PENDING').length, icon: '⏳', bg: darkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700' },
               ].map((s, i) => (
                  <div key={i} className={`${s.bg} rounded-[32px] p-8 flex items-center gap-6`}>
                     <span className="text-3xl">{s.icon}</span>
                     <div>
                        <p className="text-3xl font-black">{s.value}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">{s.label}</p>
                     </div>
                  </div>
               ))}
            </div>

            <div className={`${T.card} rounded-[40px] border ${T.cardBorder} shadow-sm overflow-hidden`}>
               <div className={`p-8 border-b ${T.cardBorder} flex items-center justify-between`}>
                  <h2 className={`text-lg font-black ${T.text}`}>Transaction History</h2>
               </div>
               {payments.length === 0 ? (
                  <div className={`p-20 text-center font-black uppercase text-[10px] tracking-widest ${T.textMuted}`}>No transactions yet</div>
               ) : (
                  <div className={`divide-y ${T.divider}`}>
                     {payments.map((p, i) => (
                        <div key={p.id ?? i} className={`flex items-center justify-between px-8 py-5 ${T.rowHover} transition-colors`}>
                           <div>
                              <p className={`font-black ${T.text}`}>{(p as any).patientName ?? `Transaction #${p.id}`}</p>
                              <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${T.textMuted}`}>{(p as any).date ?? 'Recent'}</p>
                           </div>
                           <div className="flex items-center gap-4">
                              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${(p as any).status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                 {(p as any).status ?? 'Completed'}
                              </span>
                              <span className={`font-black ${T.text}`}>${p.amount?.toLocaleString()}</span>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      );
   };

   // ── Clinical Records ──────────────────────────────────────────────────────
   const renderRecords = () => (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 animate-in slide-in-from-right-8 duration-500">
         <div className={`lg:col-span-1 p-8 ${T.card} border ${T.cardBorder} rounded-[48px] shadow-sm`}>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-8 px-4 ${T.textMuted}`}>Patient Roster</h3>
            <div className="space-y-4">
               {patients.map(p => (
                  <button key={p.id} onClick={() => setSelectedPatientId(p.id)}
                     className={`w-full p-5 rounded-[32px] border transition-all text-left flex items-center space-x-4 ${selectedPatientId === p.id
                        ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-lg shadow-blue-500/5'
                        : `${T.inputBg} border-transparent hover:border-slate-200 hover:${T.card}`}`}>
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${T.card} border ${T.cardBorder}`}>{p.name.charAt(0)}</div>
                     <div className="flex-1 min-w-0">
                        <p className={`font-black text-sm truncate leading-none ${T.text}`}>{p.name}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest opacity-50 mt-2 ${T.textMuted}`}>{p.age}y • {p.bloodType}</p>
                     </div>
                  </button>
               ))}
            </div>
         </div>

         <div className="lg:col-span-3 space-y-8">
            <div className={`${T.card} rounded-[48px] p-12 border ${T.cardBorder} shadow-sm relative overflow-hidden`}>
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                  <div>
                     <h2 className={`text-4xl font-black tracking-tighter leading-none ${T.text}`}>{activePatient?.name}</h2>
                     <p className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-500 mt-5 flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3 animate-pulse" />
                        Verified Clinical Chart • #{activePatient?.id?.toUpperCase()}
                     </p>
                  </div>
                  <div className="flex space-x-4">
                     <button onClick={() => setIsBridgeOpen(true)} className="px-8 py-5 bg-indigo-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-500/20 hover:scale-105 transition-all">🇮🇳 Bridge Interpreter</button>
                     <button onClick={() => onStartCall?.(activePatient?.name)} className="px-8 py-5 bg-slate-900 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Start Consult</button>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className={`p-10 ${T.inputBg} rounded-[40px] border ${T.cardBorder} space-y-8`}>
                     <h4 className={`text-[10px] font-black uppercase tracking-widest ${T.textMuted}`}>Clinical Timeline</h4>
                     <div className="space-y-8">
                        {activePatient?.history?.map((h, i) => (
                           <div key={i} className="flex space-x-6">
                              <div className="flex flex-col items-center">
                                 <div className="w-3 h-3 bg-blue-600 rounded-full ring-8 ring-blue-100" />
                                 {i < (activePatient.history?.length ?? 0) - 1 && <div className="w-0.5 flex-1 bg-blue-100 my-2" />}
                              </div>
                              <div>
                                 <p className={`text-base font-black leading-tight ${T.text}`}>{h.condition}</p>
                                 <p className={`text-[10px] font-black uppercase mt-2 ${T.textMuted}`}>{h.date} • {h.doctorName}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="space-y-8">
                     <div className={`p-10 ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50/30'} rounded-[40px] border ${darkMode ? 'border-blue-800/30' : 'border-blue-100/30'}`}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-6">Current Pharma Protocol</h4>
                        <div className="space-y-3">
                           {activePatient?.currentMedications?.map((m, i) => (
                              <div key={i} className={`${T.card} p-4 rounded-2xl border ${darkMode ? 'border-blue-800/30' : 'border-blue-100/50'} flex items-center justify-between shadow-sm`}>
                                 <span className={`text-xs font-black ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>{m}</span>
                                 <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className={`p-10 ${darkMode ? 'bg-rose-900/20' : 'bg-rose-50/30'} rounded-[40px] border ${darkMode ? 'border-rose-800/30' : 'border-rose-100/30'}`}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-6">Critical Allergies</h4>
                        <div className="flex flex-wrap gap-2">
                           {activePatient?.allergies?.map((a, i) => (
                              <span key={i} className={`px-4 py-2 ${T.card} text-rose-600 rounded-xl border border-rose-100 text-[9px] font-black uppercase tracking-widest`}>{a}</span>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
         {isBridgeOpen && <MultilingualBridge partnerName="Patient" onClose={() => setIsBridgeOpen(false)} />}
      </div>
   );

   // ── Settings ──────────────────────────────────────────────────────────────
   const renderSettings = () => {
      const Section: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
         <div className={`${T.card} rounded-[40px] border ${T.cardBorder} shadow-sm overflow-hidden`}>
            <div className={`px-10 py-7 border-b ${T.cardBorder} flex items-center gap-4`}>
               <span className="text-2xl">{icon}</span>
               <h3 className={`text-base font-black uppercase tracking-widest ${T.text}`}>{title}</h3>
            </div>
            <div className="p-6 space-y-3">{children}</div>
         </div>
      );

      const SettingRow: React.FC<{ label: string; description?: string; action: React.ReactNode }> = ({ label, description, action }) => (
         <div className={`flex items-center justify-between px-6 py-5 ${T.settingRow} rounded-2xl transition-colors`}>
            <div>
               <p className={`text-sm font-black ${T.text}`}>{label}</p>
               {description && <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${T.textMuted}`}>{description}</p>}
            </div>
            <div className="ml-6 flex-shrink-0">{action}</div>
         </div>
      );

      return (
         <div className="space-y-8 animate-in fade-in duration-700 max-w-3xl">
            <div>
               <h1 className={`text-4xl font-black tracking-tighter ${T.text}`}>Settings</h1>
               <p className={`text-sm font-black uppercase tracking-widest mt-2 ${T.textMuted}`}>Preferences, security &amp; app info</p>
            </div>

            {/* Appearance */}
            <Section title="Appearance" icon="🎨">
               <SettingRow
                  label="Dark Mode"
                  description={darkMode ? 'Currently using dark theme' : 'Currently using light theme'}
                  action={
                     <div className="flex items-center gap-4">
                        <span className={`text-lg ${!darkMode ? 'opacity-100' : 'opacity-30'}`}>☀️</span>
                        <Toggle checked={darkMode} onChange={toggleDark} label="Toggle dark mode" />
                        <span className={`text-lg ${darkMode ? 'opacity-100' : 'opacity-30'}`}>🌙</span>
                     </div>
                  }
               />
            </Section>

            {/* Account */}
            <Section title="Account Settings" icon="👤">
               <SettingRow
                  label="Display Name"
                  description={user.name}
                  action={
                     <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors">
                        Edit
                     </button>
                  }
               />
               <SettingRow
                  label="Email Address"
                  description={(user as any).email ?? 'doctor@cayr.health'}
                  action={
                     <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors">
                        Change
                     </button>
                  }
               />
               <SettingRow
                  label="Specialty"
                  description={(user as any).specialty ?? 'General Practice'}
                  action={
                     <button className={`px-5 py-2.5 ${T.inputBg} border ${T.cardBorder} rounded-xl text-[9px] font-black uppercase tracking-widest ${T.text} hover:border-blue-300 transition-colors`}>
                        Update
                     </button>
                  }
               />
               <SettingRow
                  label="Change Password"
                  description="Last changed 30 days ago"
                  action={
                     <button className={`px-5 py-2.5 ${T.inputBg} border ${T.cardBorder} rounded-xl text-[9px] font-black uppercase tracking-widest ${T.text} hover:border-blue-300 transition-colors`}>
                        Update
                     </button>
                  }
               />
            </Section>

            {/* Security / 2FA */}
            <Section title="Security & 2FA" icon="🔐">
               <SettingRow
                  label="Two-Factor Authentication"
                  description={twoFA ? 'Authenticator app enabled' : 'Adds an extra layer of login security'}
                  action={<Toggle checked={twoFA} onChange={() => setTwoFA(v => !v)} label="Enable 2FA" />}
               />
               {twoFA && (
                  <div className={`mx-4 p-6 rounded-2xl ${darkMode ? 'bg-green-900/20 border border-green-800/30' : 'bg-green-50 border border-green-100'}`}>
                     <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-3">✅ 2FA is active</p>
                     <p className={`text-xs font-bold ${T.textMuted}`}>Your account is protected with a time-based one-time password (TOTP).</p>
                     <button className="mt-4 px-5 py-2 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-green-700 transition-colors">
                        View Recovery Codes
                     </button>
                  </div>
               )}
               <SettingRow
                  label="Biometric Login"
                  description="Use fingerprint or face ID to sign in"
                  action={<Toggle checked={biometric} onChange={() => setBiometric(v => !v)} label="Enable biometric login" />}
               />
               <SettingRow
                  label="Active Sessions"
                  description="1 active device — this browser"
                  action={
                     <button className="px-5 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors">
                        Manage
                     </button>
                  }
               />
            </Section>

            {/* Notifications */}
            <Section title="Notifications" icon="🔔">
               <SettingRow
                  label="Email Notifications"
                  description="Appointment reminders &amp; updates"
                  action={<Toggle checked={emailNotifs} onChange={() => setEmailNotifs(v => !v)} label="Email notifications" />}
               />
               <SettingRow
                  label="SMS Alerts"
                  description="Critical patient alerts via SMS"
                  action={<Toggle checked={smsNotifs} onChange={() => setSmsNotifs(v => !v)} label="SMS alerts" />}
               />
               <SettingRow
                  label="Session Alerts"
                  description="Notify when a new session starts"
                  action={<Toggle checked={sessionAlerts} onChange={() => setSessionAlerts(v => !v)} label="Session alerts" />}
               />
            </Section>

            {/* App Info */}
            <Section title="App Info & Version" icon="ℹ️">
               {[
                  { label: 'Application', description: 'Cayr Health — Doctor Portal' },
                  { label: 'Version', description: 'v2.4.1 (Build 20260222)' },
                  { label: 'Release Channel', description: 'Stable • Latest' },
                  { label: 'Platform', description: 'Web App • React + TypeScript' },
                  { label: 'API Endpoint', description: 'https://api.cayr.health/v2' },
                  { label: 'Support', description: 'support@cayr.health' },
                  { label: 'Legal', description: 'Privacy Policy · Terms of Service · HIPAA Compliance' },
               ].map((row, i) => (
                  <SettingRow
                     key={i}
                     label={row.label}
                     description={row.description}
                     action={<span className={`text-[10px] font-black uppercase tracking-widest ${T.textMuted}`}>—</span>}
                  />
               ))}
               <div className="px-6 pt-4 pb-2">
                  <button className={`w-full py-4 ${T.inputBg} border ${T.cardBorder} rounded-2xl text-[10px] font-black uppercase tracking-widest ${T.textMuted} hover:border-blue-300 transition-colors`}>
                     🔄 Check for Updates
                  </button>
               </div>
            </Section>

            {/* Danger Zone */}
            <Section title="Danger Zone" icon="⚠️">
               <SettingRow
                  label="Export My Data"
                  description="Download all your clinical data as JSON"
                  action={
                     <button className={`px-5 py-2.5 ${T.inputBg} border ${T.cardBorder} rounded-xl text-[9px] font-black uppercase tracking-widest ${T.text} hover:border-blue-300 transition-colors`}>
                        Export
                     </button>
                  }
               />
               <SettingRow
                  label="Delete Account"
                  description="Permanently remove account &amp; all data"
                  action={
                     <button className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors">
                        Delete
                     </button>
                  }
               />
            </Section>
         </div>
      );
   };

   // ── Root render ───────────────────────────────────────────────────────────
   return (
      <div className={`max-w-[1440px] mx-auto pb-20 transition-colors duration-300`}>
         {/* Top tab bar */}
         <nav className={`flex flex-wrap gap-2 ${darkMode ? 'bg-[#1a1d27]/80' : 'bg-white/50'} backdrop-blur-md p-1.5 rounded-[28px] border ${darkMode ? 'border-[#2a2d3a]/50' : 'border-white/50'} mb-10 w-fit`}>
            {TOP_TABS.map(t => (
               <button key={t.id} onClick={() => setView(t.id)}
                  className={`px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center space-x-2.5 ${localView === t.id ? T.tabActive : T.tabInactive}`}>
                  <span>{t.icon}</span>
                  <span className="hidden sm:inline">{t.label}</span>
               </button>
            ))}
            {/* Inline dark mode toggle in tab bar */}
            <button
               onClick={toggleDark}
               title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
               className={`ml-2 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${darkMode ? 'border-[#2a2d3a] text-slate-300 hover:bg-[#252836]' : 'border-slate-200 text-slate-400 hover:bg-slate-100'}`}
               aria-label="Toggle dark/light mode"
            >
               {darkMode ? '☀️' : '🌙'}
            </button>
         </nav>

         {localView === 'Overview' && renderOverview()}
         {localView === 'Appointment' && renderAppointments()}
         {localView === 'Patients' && renderDirectory()}
         {localView === 'My Patients' && renderRecords()}
         {localView === 'Analytics' && renderAnalytics()}
         {localView === 'Payments' && renderPayments()}
         {localView === 'Settings' && renderSettings()}
      </div>
   );
};

export default DoctorDashboard;
