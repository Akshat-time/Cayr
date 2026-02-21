
import React, { useState, useMemo, useEffect } from 'react';
import { User, Appointment, AppointmentStatus, PatientRecord, Payment } from '../types';
import {
   PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
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

// Mapping from Layout sidebar labels → internal view keys
const SIDEBAR_TO_VIEW: Record<string, string> = {
   'Overview': 'Overview',
   'Appointment': 'Appointment',
   'Patients': 'Patients',
   'Analytics': 'Analytics',
   'Payments': 'Payments',
};

const TOP_TABS = [
   { id: 'Overview', label: 'Overview', icon: '📊' },
   { id: 'Appointment', label: 'Appointments', icon: '📅' },
   { id: 'Patients', label: 'Directory', icon: '👤' },
   { id: 'Analytics', label: 'Analytics', icon: '📈' },
   { id: 'Payments', label: 'Clearance', icon: '💰' },
];

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
   user, appointments, payments, updateStatus, patients, onStartCall,
   activeView: controlledView, onViewChange,
}) => {
   const [localView, setLocalView] = useState(controlledView ?? 'Overview');
   const [isBridgeOpen, setIsBridgeOpen] = useState(false);
   const [selectedPatientId, setSelectedPatientId] = useState<string | null>(patients[0]?.id || null);

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
               <h1 className="text-4xl font-black tracking-tighter text-slate-800">Physician Control</h1>
               <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-2">
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
               { label: 'Visits Confirmed', value: confirmed.length, icon: '📅', color: 'bg-blue-50 text-blue-500' },
               { label: 'Active Roster', value: patients.length, icon: '👤', color: 'bg-indigo-50 text-indigo-500' },
               { label: 'Risk Flags', value: patients.filter(p => p.status === 'RISK').length, icon: '⚠️', color: 'bg-rose-50 text-rose-500' },
               { label: 'Clearance Revenue', value: '$12.4k', icon: '💰', color: 'bg-slate-900 text-white' },
            ].map((stat, i) => (
               <div key={i} className={`p-10 rounded-[48px] ${stat.label === 'Clearance Revenue' ? stat.color : 'bg-white border border-slate-100'} shadow-sm relative overflow-hidden hover:shadow-xl transition-all`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 ${stat.label === 'Clearance Revenue' ? 'bg-white/10' : stat.color}`}>{stat.icon}</div>
                  <p className="text-4xl font-black tracking-tighter">{stat.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-50">{stat.label}</p>
               </div>
            ))}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm">
               <h3 className="text-xl font-black tracking-tight mb-8">Pending Intake Requests</h3>
               <div className="space-y-6">
                  {pendingRequests.length === 0 ? (
                     <div className="py-24 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.3em]">Vault cleared • No pending intakes</div>
                  ) : pendingRequests.map(req => (
                     <div key={req.id} className="p-6 bg-slate-50 rounded-[32px] border border-transparent hover:border-blue-100 hover:bg-white transition-all flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                           <div className="w-16 h-16 bg-white rounded-3xl overflow-hidden border border-slate-100">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.patientName}`} alt="" />
                           </div>
                           <div>
                              <p className="text-lg font-black text-slate-800">{req.patientName}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{req.date} • {req.time}</p>
                           </div>
                        </div>
                        <div className="flex space-x-3">
                           <button onClick={() => updateStatus(req.id, AppointmentStatus.CANCELLED)} className="px-6 py-4 bg-white border border-rose-100 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50">Reject</button>
                           <button onClick={() => updateStatus(req.id, AppointmentStatus.CONFIRMED)} className="px-6 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700">Approve</button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
            <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm">
               <h3 className="text-xl font-black tracking-tight mb-8">Patient Statistics</h3>
               <div className="h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie data={[{ n: 'High Risk', v: 15 }, { n: 'Active', v: 65 }, { n: 'Routine', v: 20 }]}
                           innerRadius={70} outerRadius={90} paddingAngle={10} dataKey="v" stroke="none">
                           {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                     </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <p className="text-3xl font-black text-slate-800 tracking-tighter">100%</p>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Visibility</p>
                  </div>
               </div>
               <div className="mt-8 space-y-4">
                  {['High Risk', 'Active Management', 'Routine Review'].map((label, i) => (
                     <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50">
                        <div className="flex items-center space-x-3">
                           <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                        </div>
                        <span className="text-xs font-black text-slate-800">{[15, 65, 20][i]}%</span>
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
            <h1 className="text-4xl font-black tracking-tighter text-slate-800">Appointments</h1>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-2">All scheduled visits</p>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
               { label: 'Pending', value: pendingRequests.length, color: 'bg-amber-50 text-amber-600', icon: '⏳' },
               { label: 'Confirmed', value: confirmed.length, color: 'bg-green-50 text-green-600', icon: '✅' },
               { label: 'Cancelled', value: myAppointments.filter(a => a.status === AppointmentStatus.CANCELLED).length, color: 'bg-rose-50 text-rose-600', icon: '❌' },
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

         <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100">
               <h2 className="text-lg font-black text-slate-800">All Appointments</h2>
            </div>
            {myAppointments.length === 0 ? (
               <div className="p-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">No appointments found</div>
            ) : (
               <div className="divide-y divide-slate-50">
                  {myAppointments.map(appt => {
                     const statusColors: Record<string, string> = {
                        [AppointmentStatus.PENDING]: 'bg-amber-100 text-amber-700',
                        [AppointmentStatus.CONFIRMED]: 'bg-green-100 text-green-700',
                        [AppointmentStatus.CANCELLED]: 'bg-rose-100 text-rose-700',
                        [AppointmentStatus.COMPLETED]: 'bg-slate-100 text-slate-600',
                     };
                     return (
                        <div key={appt.id} className="flex items-center justify-between px-8 py-6 hover:bg-slate-50 transition-colors">
                           <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-100 bg-white">
                                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${appt.patientName}`} alt="" />
                              </div>
                              <div>
                                 <p className="font-black text-slate-800">{appt.patientName}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{appt.date} • {appt.time}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${statusColors[appt.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                 {appt.status}
                              </span>
                              {appt.status === AppointmentStatus.PENDING && (
                                 <div className="flex gap-2">
                                    <button onClick={() => updateStatus(appt.id, AppointmentStatus.CANCELLED)}
                                       className="px-4 py-2 bg-white border border-rose-100 text-rose-500 rounded-xl text-[9px] font-black uppercase hover:bg-rose-50">Reject</button>
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
            <h1 className="text-4xl font-black tracking-tighter text-slate-800">Patient Directory</h1>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-2">{patients.length} active records</p>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map(p => (
               <div key={p.id} className="bg-white border border-slate-100 rounded-[36px] p-8 hover:shadow-xl hover:border-blue-100 transition-all group">
                  <div className="flex items-center gap-5 mb-6">
                     <div className="w-16 h-16 rounded-[20px] overflow-hidden border border-slate-100 bg-slate-50">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" />
                     </div>
                     <div>
                        <p className="font-black text-slate-800 text-lg leading-tight">{p.name}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{p.age}y • {p.bloodType}</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     {[
                        { label: 'Diagnoses', value: p.history?.length ?? 0 },
                        { label: 'Medications', value: p.currentMedications?.length ?? 0 },
                        { label: 'Allergies', value: p.allergies?.length ?? 0 },
                        { label: 'Status', value: p.status ?? 'OK' },
                     ].map((item, i) => (
                        <div key={i} className="bg-slate-50 rounded-2xl px-4 py-3">
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                           <p className="font-black text-slate-800 mt-0.5">{item.value}</p>
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
            <h1 className="text-4xl font-black tracking-tighter text-slate-800">Analytics</h1>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-2">Performance & clinical insights</p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue trend */}
            <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
               <h3 className="text-lg font-black text-slate-800 mb-1">Revenue Trend</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Last 6 months</p>
               <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={revenueData}>
                        <defs>
                           <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b5bfd" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#3b5bfd" stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="revenue" stroke="#3b5bfd" strokeWidth={2.5} fill="url(#rev)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Visit volume */}
            <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
               <h3 className="text-lg font-black text-slate-800 mb-1">Visit Volume</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Confirmed visits per month</p>
               <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={revenueData}>
                        <defs>
                           <linearGradient id="vis" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="visits" stroke="#10b981" strokeWidth={2.5} fill="url(#vis)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         {/* Patient breakdown */}
         <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-8">Patient Risk Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {[
                  { label: 'High Risk', value: patients.filter(p => p.status === 'RISK').length, color: '#ff5c6c', bg: 'bg-rose-50' },
                  { label: 'Active Management', value: Math.floor(patients.length * 0.6), color: '#3b5bfd', bg: 'bg-blue-50' },
                  { label: 'Routine Review', value: Math.ceil(patients.length * 0.4), color: '#10b981', bg: 'bg-green-50' },
               ].map((row, i) => (
                  <div key={i} className={`${row.bg} rounded-[28px] p-8`}>
                     <div className="w-3 h-3 rounded-full mb-4" style={{ backgroundColor: row.color }} />
                     <p className="text-3xl font-black" style={{ color: row.color }}>{row.value}</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{row.label}</p>
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
               <h1 className="text-4xl font-black tracking-tighter text-slate-800">Clearance Ledger</h1>
               <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-2">Billing & revenue records</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
               {[
                  { label: 'Total Revenue', value: `$${total.toLocaleString()}`, icon: '💵', bg: 'bg-slate-900 text-white' },
                  { label: 'Transactions', value: payments.length, icon: '🧾', bg: 'bg-blue-50 text-blue-700' },
                  { label: 'Pending', value: payments.filter(p => (p as any).status === 'PENDING').length, icon: '⏳', bg: 'bg-amber-50 text-amber-700' },
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

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-800">Transaction History</h2>
               </div>
               {payments.length === 0 ? (
                  <div className="p-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">No transactions yet</div>
               ) : (
                  <div className="divide-y divide-slate-50">
                     {payments.map((p, i) => (
                        <div key={p.id ?? i} className="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors">
                           <div>
                              <p className="font-black text-slate-800">{(p as any).patientName ?? `Transaction #${p.id}`}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{(p as any).date ?? 'Recent'}</p>
                           </div>
                           <div className="flex items-center gap-4">
                              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${(p as any).status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                 {(p as any).status ?? 'Completed'}
                              </span>
                              <span className="font-black text-slate-800">${p.amount?.toLocaleString()}</span>
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
         <div className="lg:col-span-1 p-8 bg-white border border-slate-100 rounded-[48px] shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 px-4">Patient Roster</h3>
            <div className="space-y-4">
               {patients.map(p => (
                  <button key={p.id} onClick={() => setSelectedPatientId(p.id)}
                     className={`w-full p-5 rounded-[32px] border transition-all text-left flex items-center space-x-4 ${selectedPatientId === p.id ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-lg shadow-blue-500/5' : 'bg-slate-50 border-transparent hover:border-slate-200 hover:bg-white'}`}>
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${selectedPatientId === p.id ? 'bg-white' : 'bg-white border border-slate-100'}`}>{p.name.charAt(0)}</div>
                     <div className="flex-1 min-w-0">
                        <p className="font-black text-sm truncate leading-none">{p.name}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mt-2">{p.age}y • {p.bloodType}</p>
                     </div>
                  </button>
               ))}
            </div>
         </div>

         <div className="lg:col-span-3 space-y-8">
            <div className="bg-white rounded-[48px] p-12 border border-slate-100 shadow-sm relative overflow-hidden">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                  <div>
                     <h2 className="text-4xl font-black tracking-tighter text-slate-800 leading-none">{activePatient?.name}</h2>
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
                  <div className="p-10 bg-slate-50 rounded-[40px] border border-slate-100 space-y-8">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical Timeline</h4>
                     <div className="space-y-8">
                        {activePatient?.history?.map((h, i) => (
                           <div key={i} className="flex space-x-6">
                              <div className="flex flex-col items-center">
                                 <div className="w-3 h-3 bg-blue-600 rounded-full ring-8 ring-blue-100" />
                                 {i < (activePatient.history?.length ?? 0) - 1 && <div className="w-0.5 flex-1 bg-blue-100 my-2" />}
                              </div>
                              <div>
                                 <p className="text-base font-black text-slate-800 leading-tight">{h.condition}</p>
                                 <p className="text-[10px] font-black uppercase text-slate-400 mt-2">{h.date} • {h.doctorName}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="space-y-8">
                     <div className="p-10 bg-blue-50/30 rounded-[40px] border border-blue-100/30">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-6">Current Pharma Protocol</h4>
                        <div className="space-y-3">
                           {activePatient?.currentMedications?.map((m, i) => (
                              <div key={i} className="bg-white p-4 rounded-2xl border border-blue-100/50 flex items-center justify-between shadow-sm">
                                 <span className="text-xs font-black text-blue-900">{m}</span>
                                 <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className="p-10 bg-rose-50/30 rounded-[40px] border border-rose-100/30">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-6">Critical Allergies</h4>
                        <div className="flex flex-wrap gap-2">
                           {activePatient?.allergies?.map((a, i) => (
                              <span key={i} className="px-4 py-2 bg-white text-rose-600 rounded-xl border border-rose-100 text-[9px] font-black uppercase tracking-widest">{a}</span>
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

   return (
      <div className="max-w-[1440px] mx-auto pb-20">
         {/* Top tab bar — stays in sync with sidebar */}
         <nav className="flex flex-wrap gap-2 bg-white/50 backdrop-blur-md p-1.5 rounded-[28px] border border-white/50 mb-10 w-fit">
            {TOP_TABS.map(t => (
               <button key={t.id} onClick={() => setView(t.id)}
                  className={`px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center space-x-2.5 ${localView === t.id ? 'bg-white text-[#3b5bfd] shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
                  <span>{t.icon}</span>
                  <span className="hidden sm:inline">{t.label}</span>
               </button>
            ))}
         </nav>

         {localView === 'Overview' && renderOverview()}
         {localView === 'Appointment' && renderAppointments()}
         {localView === 'Patients' && renderDirectory()}
         {localView === 'My Patients' && renderRecords()}
         {localView === 'Analytics' && renderAnalytics()}
         {localView === 'Payments' && renderPayments()}
      </div>
   );
};

export default DoctorDashboard;
