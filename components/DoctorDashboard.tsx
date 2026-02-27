import React, { useState, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { User, Appointment, AppointmentStatus, PatientRecord, Payment, MedicalReport } from '../types';
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
   medicalReports?: MedicalReport[];
   onUpdatePatient: (patient: PatientRecord) => void;
   onAddReport?: (report: MedicalReport) => void;
   onOpenChat?: (appointmentId: string) => void;
   onStartCall?: (patientName: string) => void;
   activeView?: string;
   onViewChange?: (view: string) => void;
}

const COLORS = ['#3b5bfd', '#ff5c6c', '#ffa927', '#10b981'];

const lightTheme = {
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
   settingRow: 'bg-slate-50 hover:bg-slate-100',
};

const darkTheme = {
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
   settingRow: 'bg-[#252836] hover:bg-[#2e3145]',
};

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
   user, appointments, payments, updateStatus, patients, medicalReports = [], onStartCall,
   onAddReport, onOpenChat, activeView: controlledView, onViewChange,
}) => {
   const [localView, setLocalView] = useState(controlledView ?? 'Overview');
   const [isBridgeOpen, setIsBridgeOpen] = useState(false);
   const [selectedPatientId, setSelectedPatientId] = useState<string | null>(patients[0]?.id || null);

   const [isReportModalOpen, setIsReportModalOpen] = useState(false);
   const [writingReportFor, setWritingReportFor] = useState<PatientRecord | null>(null);
   const [reportData, setReportData] = useState({ diagnosis: '', notes: '', prescription: '' });
   const [isSavingReport, setIsSavingReport] = useState(false);

   // State for Chat view
   const [chatSelectedId, setChatSelectedId] = useState<string | null>(null);
   const [chatNewMessage, setChatNewMessage] = useState('');
   const [chatLocalMessages, setChatLocalMessages] = useState<Record<string, any[]>>({});

   const [darkMode, setDarkMode] = useState<boolean>(() => {
      try { return localStorage.getItem('doctorDarkMode') === 'true'; } catch { return false; }
   });

   const T = darkMode ? darkTheme : lightTheme;

   const toggleDark = () => {
      setDarkMode(prev => {
         const next = !prev;
         try { localStorage.setItem('doctorDarkMode', String(next)); } catch { }
         return next;
      });
   };

   useEffect(() => {
      if (controlledView) setLocalView(controlledView);
   }, [controlledView]);

   const vitalsData = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
      day: ['18 Oct', '19 Oct', '20 Oct', '21 Oct', '22 Oct', '23 Oct', '24 Oct'][i],
      bp: 5 + Math.random() * 15,
   })), []);

   const latestPatients = useMemo(() => patients.slice(0, 5), [patients]);
   const activePatient = useMemo(() => patients.find(p => p.id === selectedPatientId) || patients[0], [patients, selectedPatientId]);

   const handleDownloadReport = (base64Data: string, fileName: string) => {
      try {
         const base64Content = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
         const binaryString = window.atob(base64Content);
         const bytes = new Uint8Array(binaryString.length);
         for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
         const blob = new Blob([bytes], { type: 'application/pdf' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = fileName;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         URL.revokeObjectURL(url);
      } catch (e) { console.error("Download failed:", e); }
   };

   const handleSaveConsultationReport = async () => {
      if (!writingReportFor) return;
      setIsSavingReport(true);
      const doc = new jsPDF();
      doc.text(`Consultation for ${writingReportFor.name}`, 20, 20);
      doc.text(`Diagnosis: ${reportData.diagnosis}`, 20, 40);
      doc.text(`Notes: ${reportData.notes}`, 20, 60);
      doc.text(`Rx: ${reportData.prescription}`, 20, 80);
      const fileData = doc.output('datauristring');
      const report: any = {
         patientId: writingReportFor.id,
         title: "Consultation Report",
         description: reportData.diagnosis,
         reportType: 'doctor_consultation',
         uploadedBy: 'doctor',
         fileName: `Consultation_${writingReportFor.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
         fileData: fileData,
         findings: reportData.notes,
         date: new Date().toLocaleDateString(),
         type: "Consultation Note"
      };
      if (onAddReport) await onAddReport(report);
      setIsSavingReport(false);
      setIsReportModalOpen(false);
      setWritingReportFor(null);
      setReportData({ diagnosis: '', notes: '', prescription: '' });
   };

   const renderOverview = () => (
      <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700">
         <div className="flex-1 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
               <h1 className={`text-3xl font-black tracking-tight ${T.text}`}>Dashboard overview</h1>
               <div className="relative w-full md:w-96">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">🔍</span>
                  <input type="text" placeholder="Search" className={`w-full pl-12 pr-6 py-4 rounded-[20px] ${T.card} border ${T.cardBorder} text-sm font-medium outline-none shadow-sm`} />
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {[
                  { label: 'Patients Today', value: '8', icon: '👤', color: 'text-rose-500', bg: 'bg-rose-50' },
                  { label: 'Total Patients', value: '364', icon: '👥', color: 'text-indigo-500', bg: 'bg-indigo-50' },
                  { label: 'Requests', value: '20', icon: '📝', color: 'text-blue-500', bg: 'bg-blue-50' },
               ].map((stat, i) => (
                  <div key={i} className={`${T.card} p-8 rounded-[32px] border ${T.cardBorder} shadow-sm flex items-center gap-6 group hover:shadow-md transition-all`}>
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                     <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${T.textMuted}`}>{stat.label}</p>
                        <p className={`text-3xl font-black ${T.text} mt-1`}>{stat.value}</p>
                     </div>
                  </div>
               ))}
            </div>
            <div className={`${T.card} p-8 rounded-[40px] border ${T.cardBorder} shadow-sm`}>
               <div className="flex justify-between items-center mb-8">
                  <div>
                     <h3 className={`text-lg font-black ${T.text}`}>Appointments Statistics</h3>
                     <p className={`text-[10px] font-bold uppercase tracking-widest ${T.textMuted} mt-1`}>October 2021</p>
                  </div>
               </div>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={vitalsData}>
                        <defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b5bfd" stopOpacity={0.1} /><stop offset="95%" stopColor="#3b5bfd" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#2a2d3a' : '#f1f5f9'} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="bp" stroke="#3b5bfd" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
            <div className={`${T.card} p-8 rounded-[40px] border ${T.cardBorder} shadow-sm overflow-hidden`}>
               <h3 className={`text-lg font-black ${T.text} mb-8`}>Latest Patient</h3>
               <table className="w-full">
                  <thead>
                     <tr className={`text-[10px] font-black uppercase tracking-widest ${T.textMuted} border-b ${T.cardBorder}`}>
                        <th className="text-left pb-4 pl-2 w-12 text-center">No</th>
                        <th className="text-left pb-4">Date</th>
                        <th className="text-left pb-4">Name</th>
                        <th className="text-left pb-4">Membership</th>
                        <th className="text-left pb-4">Treatment</th>
                        <th className="pb-4"></th>
                     </tr>
                  </thead>
                  <tbody className={`divide-y ${T.divider}`}>
                     {latestPatients.map((p, i) => (
                        <tr key={p.id} className={`${T.rowHover}`}>
                           <td className="py-5 text-center text-xs font-bold">{96 - i}</td>
                           <td className="py-5 text-xs font-bold text-slate-500">23/10/21</td>
                           <td className="py-5 font-black text-sm">{p.name}</td>
                           <td className="py-5"><span className="px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-[9px] font-black">MEMBER</span></td>
                           <td className="py-5 text-xs font-bold text-slate-500">Consultation</td>
                           <td className="py-5 text-right"><button className="w-8 h-8 rounded-lg">•••</button></td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
         <div className="w-full lg:w-80 space-y-8">
            <div className={`${T.card} p-8 rounded-[40px] border ${T.cardBorder} text-center`}>
               <div className="w-20 h-20 rounded-[24px] overflow-hidden mx-auto mb-4 border-4 border-white shadow-xl">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="" />
               </div>
               <h4 className={`text-lg font-black ${T.text}`}>Dr. {user.name}</h4>
               <p className={`text-[10px] font-bold uppercase tracking-widest ${T.textMuted}`}>{user.role}</p>
            </div>
            <div className={`${T.card} p-8 rounded-[40px] border ${T.cardBorder}`}>
               <div className="flex justify-between items-center mb-6"><h4 className="text-sm font-black">October 2021</h4></div>
               <div className="grid grid-cols-7 gap-2 text-[9px] font-black text-center text-slate-400 mb-4"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
               <div className="grid grid-cols-7 gap-2">
                  {[25, 26, 27, 28, 29, 30, 31].map(d => (
                     <div key={d} className={`aspect-square flex items-center justify-center rounded-xl text-xs font-black ${d === 25 ? 'bg-blue-600 text-white shadow-lg' : ''}`}>{d}</div>
                  ))}
               </div>
            </div>
            <div className="space-y-6">
               <h4 className={`text-sm font-black ${T.text} flex items-center justify-between`}>Upcoming Appointments<span className="text-[9px] font-black uppercase tracking-widest text-blue-500">View All</span></h4>
               <div className="space-y-4">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${T.textMuted}`}>Confirmed • Today</p>
                  {appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).slice(0, 3).map((appt, i) => (
                     <div key={i} className={`${T.card} p-5 rounded-[28px] border ${T.cardBorder} shadow-sm flex items-center gap-4`}>
                        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${appt.patientName}`} alt="" /></div>
                        <div className="flex-1 min-w-0"><p className={`text-xs font-black ${T.text} truncate`}>{appt.patientName}</p><p className={`text-[9px] font-bold ${T.textMuted} mt-0.5`}>Confirmed Visit</p></div>
                        <div className="text-right"><p className="text-[10px] font-black text-blue-600">{appt.time}</p></div>
                     </div>
                  ))}
                  {appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).length === 0 && (
                     <p className={`text-[10px] font-bold ${T.textMuted} uppercase tracking-widest text-center py-4 opacity-50`}>No active sessions</p>
                  )}
               </div>
            </div>
         </div>
      </div>
   );

   const renderAppointments = (viewName: string) => {
      const displayAppointments = viewName === 'Requests'
         ? appointments.filter(a => a.status === AppointmentStatus.PENDING)
         : appointments.filter(a => a.status !== AppointmentStatus.PENDING);

      return (
         <div className="space-y-8 animate-in fade-in duration-700">
            <h1 className={`text-4xl font-black ${T.text}`}>{viewName}</h1>
            <div className={`${T.card} p-10 rounded-[40px] border ${T.cardBorder} shadow-sm divide-y ${T.divider}`}>
               {displayAppointments.length === 0 ? (
                  <p className={`text-[12px] font-bold ${T.textMuted} uppercase tracking-widest text-center py-10 opacity-50`}>No {viewName.toLowerCase()} found</p>
               ) : displayAppointments.map(appt => (
                  <div key={appt.id} className="flex items-center justify-between py-6">
                     <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${appt.patientName}`} alt="" /></div>
                        <div><p className={`font-black ${T.text}`}>{appt.patientName}</p><p className={`text-[10px] font-bold ${T.textMuted}`}>{appt.date} • {appt.time}</p></div>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase ${appt.status === AppointmentStatus.PENDING ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{appt.status}</span>
                        {appt.status === AppointmentStatus.PENDING && (
                           <div className="flex gap-2">
                              <button onClick={() => updateStatus(appt.id, AppointmentStatus.CANCELLED)} className="px-4 py-2 text-rose-500 font-black text-[9px]">Reject</button>
                              <button onClick={() => updateStatus(appt.id, AppointmentStatus.CONFIRMED)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[9px]">Approve</button>
                           </div>
                        )}
                     </div>
                  </div>
               ))}
            </div>
         </div>
      );
   };

   const renderPatients = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in">
         {patients.map(p => (
            <div key={p.id} className={`${T.card} p-8 rounded-[40px] border ${T.cardBorder} shadow-sm group`}>
               <div className="flex items-center gap-5 mb-10"><div className="w-16 h-16 rounded-[24px] bg-slate-100 overflow-hidden"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" /></div><div><h3 className={`text-lg font-black ${T.text}`}>{p.name}</h3><p className={`text-[10px] font-bold ${T.textMuted}`}>{p.age}y • {p.bloodType}</p></div></div>
               <div className="flex gap-4">
                  <button onClick={() => { setSelectedPatientId(p.id); setLocalView('My Patients'); }} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Profile</button>
                  <button onClick={() => { setWritingReportFor(p); setIsReportModalOpen(true); }} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Report</button>
               </div>
            </div>
         ))}
      </div>
   );

   const renderRecords = () => (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 animate-in fade-in">
         <div className={`col-span-1 p-8 ${T.card} border ${T.cardBorder} rounded-[40px]`}><h3 className="text-[10px] font-black uppercase mb-6 opacity-30">Roster</h3><div className="space-y-4">{patients.map(p => (<button key={p.id} onClick={() => setSelectedPatientId(p.id)} className={`w-full p-4 rounded-2xl text-left font-black text-sm ${selectedPatientId === p.id ? 'bg-blue-600 text-white shadow-lg' : T.rowHover}`}>{p.name}</button>))}</div></div>
         <div className="col-span-3 space-y-8">
            <div className={`${T.card} p-12 rounded-[48px] border ${T.cardBorder} shadow-sm`}><h2 className="text-4xl font-black mb-8">{activePatient?.name}</h2><div className="grid grid-cols-2 gap-10"><div><h4 className="text-[10px] font-black uppercase text-blue-500 mb-6 font-bold tracking-widest">History</h4><div className="space-y-6">{activePatient?.history?.map((h, i) => (<div key={i} className="flex gap-4"><div className="w-2 h-2 bg-blue-600 rounded-full mt-2" /><p className="text-sm font-black">{h.condition} <span className="block text-[10px] opacity-40">{h.date}</span></p></div>))}</div></div><div><h4 className="text-[10px] font-black uppercase text-indigo-500 mb-6 font-bold tracking-widest">Reports</h4><div className="space-y-4">{medicalReports.filter(r => r.patientId === activePatient?.id).map(r => (<div key={r.id} className={`${T.inputBg} p-5 rounded-2xl flex justify-between items-center`}><span className="text-xs font-black">{r.title}</span><button onClick={() => handleDownloadReport(r.fileData, r.fileName)} className="text-blue-600 font-black text-[10px] uppercase tracking-widest">Download</button></div>))}</div></div></div></div>
         </div>
      </div>
   );

   const renderPayouts = () => (
      <div className="space-y-8 animate-in fade-in duration-700">
         <div><h1 className="text-4xl font-black tracking-tighter">Payouts & Earnings</h1><p className="text-sm font-black uppercase tracking-widest mt-2 opacity-50">Revenue tracking active</p></div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-10 rounded-[40px] bg-emerald-50 border border-emerald-100`}><p className="text-[10px] font-black uppercase text-emerald-600 mb-4">Available</p><p className="text-4xl font-black text-emerald-600">$4,250.00</p><button className="mt-8 w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Withdraw</button></div>
            <div className={`${T.card} p-10 rounded-[40px] border ${T.cardBorder}`}><p className="text-[10px] font-black uppercase opacity-50 mb-4">Monthly</p><p className="text-4xl font-black">$12,840.00</p></div>
            <div className={`${T.card} p-10 rounded-[40px] border ${T.cardBorder}`}><p className="text-[10px] font-black uppercase opacity-50 mb-4">Pending</p><p className="text-4xl font-black">$1,120.00</p></div>
         </div>
      </div>
   );

   const renderChat = () => {
      const activeChat = appointments.find(a => a.id === chatSelectedId);

      const handleSendMessage = () => {
         if (!chatNewMessage.trim() || !chatSelectedId) return;
         const msg = {
            id: Date.now().toString(),
            content: chatNewMessage,
            senderId: user.id,
            senderName: user.name,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text'
         };
         setChatLocalMessages(prev => ({
            ...prev,
            [chatSelectedId]: [...(prev[chatSelectedId] || []), msg]
         }));
         setChatNewMessage('');
      };

      return (
         <div className="space-y-8 animate-in fade-in duration-700 h-[calc(100vh-200px)]">
            <div><h1 className="text-4xl font-black tracking-tighter">Clinical Messaging</h1><p className="text-sm font-black uppercase tracking-widest mt-2 opacity-50">Secure coordination</p></div>
            <div className={`${T.card} rounded-[40px] border ${T.cardBorder} shadow-sm overflow-hidden flex h-full`}>
               <div className={`w-80 border-r ${T.cardBorder} flex flex-col`}>
                  <div className={`p-6 border-b ${T.cardBorder}`}><h3 className="text-[10px] font-black uppercase opacity-30">Active</h3></div>
                  <div className="flex-1 overflow-y-auto">{appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).map(a => (
                     <button
                        key={a.id}
                        onClick={() => setChatSelectedId(a.id)}
                        className={`w-full p-6 text-left border-b ${T.cardBorder} ${T.rowHover} flex items-center gap-4 ${chatSelectedId === a.id ? T.card : ''}`}
                     >
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 overflow-hidden"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${a.patientName}`} alt="" /></div>
                        <div className="flex-1 min-w-0"><p className={`text-sm font-black truncate ${chatSelectedId === a.id ? 'text-blue-600' : ''}`}>{a.patientName}</p><p className="text-[10px] font-bold opacity-40 truncate">Active session</p></div>
                     </button>
                  ))}</div>
               </div>

               {chatSelectedId ? (
                  <div className="flex-1 flex flex-col bg-white">
                     <div className={`p-6 border-b ${T.cardBorder} flex justify-between items-center bg-white`}>
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeChat?.patientName}`} alt="" />
                           </div>
                           <div>
                              <h3 className="text-sm font-black text-slate-900">{activeChat?.patientName}</h3>
                              <p className="text-[10px] font-black text-emerald-500 uppercase">Connected</p>
                           </div>
                        </div>
                        <div className="flex gap-3">
                           <button
                              onClick={() => setIsBridgeOpen(true)}
                              className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                           >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                           </button>
                        </div>
                     </div>

                     <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/10">
                        <div className="flex justify-center mb-8">
                           <span className="px-4 py-1.5 bg-white rounded-full text-[10px] font-bold text-slate-400 border border-slate-100 uppercase tracking-widest shadow-sm">
                              Today
                           </span>
                        </div>

                        <div className="flex gap-4 justify-end">
                           <div className="bg-blue-600 p-4 rounded-2xl rounded-tr-none shadow-md text-white max-w-[80%]">
                              <p className="text-xs font-bold">Hey, your appointment is successfully booked in this time ({activeChat?.time}) and date ({activeChat?.date}).</p>
                              <p className="text-[9px] font-black text-blue-100 mt-2 uppercase">System Auto-Generated</p>
                           </div>
                        </div>

                        {chatLocalMessages[chatSelectedId]?.map((msg) => (
                           <div key={msg.id} className={`flex gap-4 ${msg.senderId === user.id ? 'justify-end' : ''}`}>
                              {msg.senderId !== user.id && (
                                 <div className="w-8 h-8 rounded-lg bg-indigo-50 overflow-hidden shrink-0"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`} alt="" /></div>
                              )}
                              <div className={`${msg.senderId === user.id ? 'bg-slate-900 text-white rounded-tr-none shadow-lg shadow-slate-900/10' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-sm'} p-4 rounded-2xl max-w-[80%]`}>
                                 <p className="text-xs font-bold">{msg.content}</p>
                                 <p className={`text-[9px] font-black mt-2 uppercase ${msg.senderId === user.id ? 'text-slate-400' : 'text-slate-300'}`}>{msg.timestamp}</p>
                              </div>
                           </div>
                        ))}
                     </div>

                     <div className={`p-6 border-t ${T.cardBorder} bg-white`}>
                        <div className="flex gap-4">
                           <input
                              type="text"
                              value={chatNewMessage}
                              onChange={(e) => setChatNewMessage(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                              placeholder="Type your message..."
                              className="flex-1 bg-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 transition-all"
                           />
                           <button
                              onClick={handleSendMessage}
                              className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-blue-500/10"
                           >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14M12 5l7 7-7 7" /></svg>
                           </button>
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                     <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-[32px] flex items-center justify-center text-4xl mb-8 animate-bounce">💬</div>
                     <h3 className="text-2xl font-black">Secure Clinical Messaging</h3>
                     <p className="text-[13px] font-bold text-slate-400 mt-4 max-w-sm">Select an active session from the left to communicate with your patient in real-time.</p>
                  </div>
               )}
            </div>
         </div>
      );
   };

   const renderSettings = () => (
      <div className="space-y-8 animate-in fade-in duration-700">
         <div><h1 className="text-4xl font-black">Settings</h1><p className="text-sm font-black uppercase tracking-widest mt-2 opacity-50">Account & Preference Controls</p></div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className={`${T.card} p-10 rounded-[40px] border ${T.cardBorder} space-y-8`}><h3 className="text-lg font-black">System Preferences</h3></div>
            <div className={`${T.card} p-10 rounded-[40px] border ${T.cardBorder} space-y-8`}><h3 className="text-lg font-black">Security</h3><button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Change Password</button></div>
         </div>
      </div>
   );

   return (
      <div className={`max-w-[1500px] mx-auto pb-20 px-8 ${T.bg} min-h-screen text-slate-800`}>
         <div className="flex justify-end pt-8 mb-10"><button onClick={toggleDark} className={`px-5 py-2.5 rounded-2xl font-black uppercase text-[10px] border ${T.cardBorder} ${T.textMuted} hover:${T.card} transition-all`}>{darkMode ? '☀️ Light' : '🌙 Dark'}</button></div>
         {['Overview', 'Dashboard'].includes(localView) && renderOverview()}
         {['Appointments', 'Requests'].includes(localView) && renderAppointments(localView)}
         {localView === 'Patients' && renderPatients()}
         {localView === 'Chat' && renderChat()}
         {localView === 'Payouts' && renderPayouts()}
         {localView === 'Settings' && renderSettings()}
         {localView === 'My Patients' && renderRecords()}
         {localView === 'Doctors' && (
            <div className={`p-20 text-center font-black uppercase text-[10px] tracking-[0.3em] ${T.textMuted} ${T.card} rounded-[40px] border ${T.cardBorder}`}>Network Node Module • Active</div>
         )}
         {isReportModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReportModalOpen(false)} />
               <div className={`${T.card} relative w-full max-w-2xl rounded-[48px] shadow-2xl border ${T.cardBorder} p-12`}>
                  <h2 className={`text-2xl font-black ${T.text} mb-8`}>Finalize Report</h2>
                  <div className="space-y-6">
                     <input type="text" placeholder="Diagnosis" value={reportData.diagnosis} onChange={e => setReportData({ ...reportData, diagnosis: e.target.value })} className={`w-full p-4 rounded-2xl border ${T.cardBorder} ${T.inputBg} outline-none font-bold`} />
                     <textarea rows={4} placeholder="Notes" value={reportData.notes} onChange={e => setReportData({ ...reportData, notes: e.target.value })} className={`w-full p-4 rounded-2xl border ${T.cardBorder} ${T.inputBg} outline-none font-bold`} />
                     <textarea rows={2} placeholder="Rx" value={reportData.prescription} onChange={e => setReportData({ ...reportData, prescription: e.target.value })} className={`w-full p-4 rounded-2xl border ${T.cardBorder} ${T.inputBg} outline-none font-bold`} />
                  </div>
                  <div className="mt-8 flex gap-4"><button onClick={() => setIsReportModalOpen(false)} className="flex-1 py-4 font-black uppercase text-[10px]">Back</button><button onClick={handleSaveConsultationReport} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-blue-500/20">{isSavingReport ? 'Saving...' : 'Finalize'}</button></div>
               </div>
            </div>
         )}
         {isBridgeOpen && <MultilingualBridge partnerName="Staff" onClose={() => setIsBridgeOpen(false)} />}
      </div>
   );
};

export default DoctorDashboard;
