
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
   user, appointments, payments, updateStatus, patients, medicalReports = [], onStartCall,
   onAddReport, onOpenChat, activeView: controlledView, onViewChange,
}) => {
   const [localView, setLocalView] = useState(controlledView ?? 'Overview');
   const [isBridgeOpen, setIsBridgeOpen] = useState(false);
   const [selectedPatientId, setSelectedPatientId] = useState<string | null>(patients[0]?.id || null);

   // ── Consultation Report State ──────────────────────────────────────────────
   const [isReportModalOpen, setIsReportModalOpen] = useState(false);
   const [writingReportFor, setWritingReportFor] = useState<PatientRecord | null>(null);
   const [reportData, setReportData] = useState({ diagnosis: '', notes: '', prescription: '' });
   const [isSavingReport, setIsSavingReport] = useState(false);

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

   const handleDownloadReport = (base64Data: string, fileName: string) => {
      try {
         const base64Content = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
         const binaryString = window.atob(base64Content);
         const len = binaryString.length;
         const bytes = new Uint8Array(len);
         for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
         }
         const blob = new Blob([bytes], { type: 'application/pdf' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = fileName;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         URL.revokeObjectURL(url);
      } catch (e) {
         console.error("Download failed:", e);
         alert("Failed to download report.");
      }
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

   const activePatient = useMemo(() => patients.find(p => p.id === selectedPatientId) || patients[0], [patients, selectedPatientId]);

   const renderConsultationModal = () => {
      if (!writingReportFor) return null;
      return (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReportModalOpen(false)} />
            <div className={`${T.card} relative w-full max-w-2xl rounded-[48px] shadow-2xl border ${T.cardBorder} p-12 animate-in zoom-in-95 duration-300`}>
               <div className="flex justify-between items-center mb-10">
                  <div>
                     <h2 className={`text-2xl font-black tracking-tight ${T.text}`}>Consultation Report</h2>
                     <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1 ${T.textMuted}`}>Patient: {writingReportFor.name}</p>
                  </div>
                  <button onClick={() => setIsReportModalOpen(false)} className={`w-12 h-12 rounded-2xl flex items-center justify-center ${T.inputBg} hover:bg-slate-200 transition-colors`}>×</button>
               </div>

               <div className="space-y-6">
                  <div>
                     <label className={`text-[10px] font-black uppercase tracking-widest ${T.textMuted} mb-3 block`}>Diagnosis</label>
                     <input
                        type="text"
                        placeholder="Primary diagnosis or condition..."
                        value={reportData.diagnosis}
                        onChange={e => setReportData({ ...reportData, diagnosis: e.target.value })}
                        className={`w-full p-5 rounded-2xl border ${T.cardBorder} ${T.inputBg} ${T.text} outline-none focus:border-blue-500 transition-all font-bold text-sm`}
                     />
                  </div>
                  <div>
                     <label className={`text-[10px] font-black uppercase tracking-widest ${T.textMuted} mb-3 block`}>Clinical Notes</label>
                     <textarea
                        rows={4}
                        placeholder="Detailed observations and notes..."
                        value={reportData.notes}
                        onChange={e => setReportData({ ...reportData, notes: e.target.value })}
                        className={`w-full p-5 rounded-2xl border ${T.cardBorder} ${T.inputBg} ${T.text} outline-none focus:border-blue-500 transition-all font-bold text-sm resize-none`}
                     />
                  </div>
                  <div>
                     <label className={`text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3 block`}>Prescription (Rx)</label>
                     <textarea
                        rows={3}
                        placeholder="Medications, dosage, and duration..."
                        value={reportData.prescription}
                        onChange={e => setReportData({ ...reportData, prescription: e.target.value })}
                        className={`w-full p-5 rounded-2xl border border-blue-100 bg-blue-50/30 text-[#1e293b] outline-none focus:border-blue-500 transition-all font-bold text-sm resize-none shadow-inner`}
                     />
                  </div>
               </div>

               <div className="mt-12 flex gap-4">
                  <button
                     onClick={() => setIsReportModalOpen(false)}
                     className={`flex-1 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-widest ${T.textMuted} hover:bg-slate-100 transition-all`}
                  >
                     Cancel
                  </button>
                  <button
                     onClick={handleSaveConsultationReport}
                     disabled={isSavingReport || !reportData.diagnosis}
                     className="flex-[2] py-5 bg-blue-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                     {isSavingReport ? 'Generating PDF...' : 'Finalize & Save Report'}
                  </button>
               </div>
            </div>
         </div>
      );
   };

   const handleSaveConsultationReport = async () => {
      if (!writingReportFor) return;
      setIsSavingReport(true);

      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(59, 91, 253);
      doc.text("CAYR CLINICAL CONSULTATION", 20, 30);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Consultation Date: ${new Date().toLocaleString()}`, 20, 38);
      doc.text(`Provider: Dr. ${user.name}`, 20, 44);

      doc.setDrawColor(239, 242, 246);
      doc.line(20, 50, 190, 50);

      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text("PATIENT SUMMARY", 20, 60);
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${writingReportFor.name}`, 20, 67);
      doc.text(`Age/Blood: ${writingReportFor.age}y / ${writingReportFor.bloodType}`, 20, 74);

      doc.setFont("helvetica", "bold");
      doc.text("DIAGNOSIS", 20, 88);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitDiagnosis = doc.splitTextToSize(reportData.diagnosis, 170);
      doc.text(splitDiagnosis, 20, 95);

      const notesY = 95 + (splitDiagnosis.length * 5) + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("CLINICAL NOTES", 20, notesY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(reportData.notes, 170);
      doc.text(splitNotes, 20, notesY + 7);

      const prescY = notesY + 7 + (splitNotes.length * 5) + 15;
      doc.setFillColor(248, 250, 252);
      doc.rect(20, prescY - 8, 170, 40, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(59, 91, 253);
      doc.text("PRESCRIPTION (Rx)", 25, prescY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      const splitPresc = doc.splitTextToSize(reportData.prescription, 160);
      doc.text(splitPresc, 25, prescY + 7);

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
         type: "Consultation Note"
      };

      if (onAddReport) await onAddReport(report);

      setIsSavingReport(false);
      setIsReportModalOpen(false);
      setWritingReportFor(null);
      setReportData({ diagnosis: '', notes: '', prescription: '' });
   };

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
            {patients.map(p => {
               const lastAppt = appointments.filter(a => a.patientId === p.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
               const aiReports = medicalReports.filter(r => r.patientId === p.id && r.reportType === 'ai_intake');
               const docReports = medicalReports.filter(r => r.patientId === p.id && r.reportType === 'doctor_consultation');

               return (
                  <div key={p.id} className={`${T.card} border ${T.cardBorder} rounded-[36px] p-8 hover:shadow-xl hover:border-blue-100 transition-all group relative overflow-hidden`}>
                     <div className="flex items-center gap-5 mb-6">
                        <div className={`w-16 h-16 rounded-[20px] overflow-hidden border ${T.cardBorder} ${T.inputBg}`}>
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" />
                        </div>
                        <div>
                           <p className={`font-black text-lg leading-tight ${T.text}`}>{p.name}</p>
                           <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${T.textMuted}`}>{p.age}y • {p.bloodType}</p>
                        </div>
                        <button
                           onClick={() => lastAppt && onOpenChat?.(lastAppt.id)}
                           className={`ml-auto w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${lastAppt ? 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}
                           title={lastAppt ? "Chat with Patient" : "No active appointment for chat"}
                           disabled={!lastAppt}
                        >
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </button>
                     </div>

                     <div className="space-y-4">
                        <div className={`${T.inputBg} rounded-2xl p-4 border ${T.cardBorder}`}>
                           <p className={`text-[9px] font-black uppercase tracking-widest ${T.textMuted}`}>Last Appointment</p>
                           <p className={`font-black mt-1 text-sm ${T.text}`}>{lastAppt ? `${lastAppt.date} @ ${lastAppt.time}` : 'No sessions recorded'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                           <div className={`${docReports.length > 0 ? 'bg-indigo-50 border-indigo-100' : T.inputBg} border rounded-2xl p-3 transition-colors relative group/rep`}>
                              <p className={`text-[8px] font-black uppercase tracking-widest ${T.textMuted}`}>Consults</p>
                              <p className={`font-black text-xs ${T.text}`}>{docReports.length} Files</p>
                              {docReports.length > 0 && (
                                 <button
                                    onClick={() => handleDownloadReport(docReports[0].fileData, docReports[0].fileName)}
                                    className="absolute inset-0 flex items-center justify-center bg-indigo-600/10 opacity-0 group-hover/rep:opacity-100 transition-opacity rounded-2xl"
                                    title="Download Latest"
                                 >
                                    <span className="bg-white p-1.5 rounded-lg shadow-sm text-indigo-600 text-[8px] font-black">⬇️ GET</span>
                                 </button>
                              )}
                           </div>
                           <div className={`${aiReports.length > 0 ? 'bg-emerald-50 border-emerald-100' : T.inputBg} border rounded-2xl p-3 transition-colors relative group/ai`}>
                              <p className={`text-[8px] font-black uppercase tracking-widest ${T.textMuted}`}>AI Intake</p>
                              <p className={`font-black text-xs ${T.text}`}>{aiReports.length} Files</p>
                              {aiReports.length > 0 && (
                                 <button
                                    onClick={() => handleDownloadReport(aiReports[0].fileData, aiReports[0].fileName)}
                                    className="absolute inset-0 flex items-center justify-center bg-emerald-600/10 opacity-0 group-hover/ai:opacity-100 transition-opacity rounded-2xl"
                                    title="Download Latest"
                                 >
                                    <span className="bg-white p-1.5 rounded-lg shadow-sm text-emerald-600 text-[8px] font-black">⬇️ GET</span>
                                 </button>
                              )}
                           </div>
                        </div>
                     </div>

                     <div className="mt-6 flex gap-3">
                        <button onClick={() => { setSelectedPatientId(p.id); setView('My Patients'); }}
                           className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
                           Clinical Chart
                        </button>
                        <button onClick={() => { setWritingReportFor(p); setIsReportModalOpen(true); }}
                           className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                           Issue Report
                        </button>
                     </div>
                  </div>
               );
            })}
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

               <div className="mt-10 border-t pt-10 border-slate-100">
                  <h4 className={`text-[10px] font-black uppercase tracking-widest ${T.textMuted} mb-8`}>Clinical Archive (Vault)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                        <p className={`text-[11px] font-black uppercase tracking-widest text-indigo-500 mb-4 flex items-center`}>
                           <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2" />
                           Consultation Reports
                        </p>
                        <div className="space-y-3">
                           {medicalReports.filter(r => r.patientId === activePatient?.id && r.reportType === 'doctor_consultation').map(r => (
                              <div key={r.id} className={`${T.card} p-5 rounded-3xl border ${T.cardBorder} flex items-center justify-between hover:border-indigo-200 transition-all`}>
                                 <div>
                                    <p className={`text-xs font-black ${T.text}`}>{r.title}</p>
                                    <p className={`text-[9px] font-bold uppercase tracking-widest ${T.textMuted}`}>{r.date}</p>
                                 </div>
                                 <a href={r.fileData} download={r.fileName} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                 </a>
                              </div>
                           ))}
                           {medicalReports.filter(r => r.patientId === activePatient?.id && r.reportType === 'doctor_consultation').length === 0 && (
                              <p className={`text-[10px] italic ${T.textMuted} opacity-60 px-2`}>No consultations issued yet.</p>
                           )}
                        </div>
                     </div>
                     <div>
                        <p className={`text-[11px] font-black uppercase tracking-widest text-emerald-500 mb-4 flex items-center`}>
                           <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2" />
                           AI Intake Overviews
                        </p>
                        <div className="space-y-3">
                           {medicalReports.filter(r => r.patientId === activePatient?.id && r.reportType === 'ai_intake').map(r => (
                              <div key={r.id} className={`${T.card} p-5 rounded-3xl border ${T.cardBorder} flex items-center justify-between hover:border-emerald-200 transition-all`}>
                                 <div>
                                    <p className={`text-xs font-black ${T.text}`}>{r.title}</p>
                                    <p className={`text-[9px] font-bold uppercase tracking-widest ${T.textMuted}`}>{r.date}</p>
                                 </div>
                                 <a href={r.fileData} download={r.fileName} className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                 </a>
                              </div>
                           ))}
                           {medicalReports.filter(r => r.patientId === activePatient?.id && r.reportType === 'ai_intake').length === 0 && (
                              <p className={`text-[10px] italic ${T.textMuted} opacity-60 px-2`}>No AI assessments found.</p>
                           )}
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
         {/* Inline dark mode toggle moved to a better spot or keeping it hidden if needed, but for now just removing the redundant nav */}
         <div className="flex justify-end mb-6">
            <button
               onClick={toggleDark}
               title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
               className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${darkMode ? 'border-[#2a2d3a] text-slate-300 hover:bg-[#252836]' : 'border-slate-200 text-slate-400 hover:bg-slate-100'}`}
               aria-label="Toggle dark/light mode"
            >
               {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
         </div>

         {localView === 'Overview' && renderOverview()}
         {localView === 'Appointment' && renderAppointments()}
         {localView === 'Patients' && renderDirectory()}
         {localView === 'My Patients' && renderRecords()}
         {localView === 'Analytics' && renderAnalytics()}
         {localView === 'Payments' && renderPayments()}
         {localView === 'Settings' && renderSettings()}
         {isReportModalOpen && renderConsultationModal()}
      </div>
   );
};

export default DoctorDashboard;
