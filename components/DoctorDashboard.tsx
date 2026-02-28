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
   const [reportData, setReportData] = useState({ diagnosis: '', notes: '' });
   const [medicines, setMedicines] = useState<{ name: string; dose: string; daysCount: string }[]>([]);
   const [isSavingReport, setIsSavingReport] = useState(false);

   // Calendar state (dynamic - defaults to today)
   const today = new Date();
   const [calYear, setCalYear] = useState(today.getFullYear());
   const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-indexed
   const [selectedCalDate, setSelectedCalDate] = useState<number>(today.getDate());

   // Report History modal
   const [viewingHistoryFor, setViewingHistoryFor] = useState<PatientRecord | null>(null);
   const [patientIntakeReports, setPatientIntakeReports] = useState<any[]>([]);
   const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

   useEffect(() => {
      let interval: any;
      const fetchMsgs = async () => {
         if (!chatSelectedId) return;
         try {
            const res = await fetch(`/api/chats/${chatSelectedId}/messages`);
            if (res.ok) {
               const data = await res.json();
               setChatLocalMessages(prev => ({ ...prev, [chatSelectedId]: data.messages }));
            }
         } catch (err) { }
      };
      if (chatSelectedId) {
         fetchMsgs();
         interval = setInterval(fetchMsgs, 4000);
      }
      return () => clearInterval(interval);
   }, [chatSelectedId]);

   // Build chart data: count of appointments per day for the current calendar month
   const appointmentsChartData = useMemo(() => {
      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
      const monthStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return Array.from({ length: daysInMonth }, (_, i) => {
         const day = i + 1;
         const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
         const count = appointments.filter(a => a.date === dateStr).length;
         const dow = new Date(calYear, calMonth, day).getDay();
         return { day: `${dayLabels[dow]} ${day}`, appointments: count, date: dateStr };
      });
   }, [appointments, calYear, calMonth]);

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

   const handleFetchPatientIntakeReports = async (patient: PatientRecord) => {
      setViewingHistoryFor(patient);
      setIsLoadingHistory(true);
      setPatientIntakeReports([]);
      try {
         const res = await fetch(`/api/reports/doctor?patientId=${patient.id}`, { credentials: 'include' });
         if (res.ok) {
            const data = await res.json();
            const intakes = data.filter((r: any) => r.reportType === 'ai_intake');
            setPatientIntakeReports(intakes);
         }
      } catch (e) { console.error('Failed to fetch patient intake reports', e); }
      setIsLoadingHistory(false);
   };

   const handleDownloadFromData = (fileData: string, fileName: string) => {
      try {
         const base64 = fileData.includes('base64,') ? fileData.split('base64,')[1] : fileData;
         const binary = window.atob(base64);
         const bytes = new Uint8Array(binary.length);
         for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
         const blob = new Blob([bytes], { type: 'application/pdf' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a'); a.href = url; a.download = fileName;
         document.body.appendChild(a); a.click(); document.body.removeChild(a);
         URL.revokeObjectURL(url);
      } catch (e) { console.error('Download failed', e); }
   };

   const handleSaveConsultationReport = async () => {
      if (!writingReportFor || !reportData.diagnosis.trim()) return;
      setIsSavingReport(true);
      try {
         // Step 1: Call backend → Groq AI generates summary
         const genRes = await fetch('/api/reports/generate-doctor-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
               patientId: writingReportFor.id,
               patientName: writingReportFor.name,
               patientAge: writingReportFor.age,
               patientBloodType: writingReportFor.bloodType,
               patientAllergies: writingReportFor.allergies?.join(', '),
               diagnosis: reportData.diagnosis,
               notes: reportData.notes,
               medicines,
            }),
         });
         const genData = await genRes.json();
         if (!genRes.ok) throw new Error(genData.error || 'Report generation failed');

         const aiSummary: string = genData.aiSummary || '';
         const reportId: string = genData.report._id;

         // Step 2: Build professional PDF
         const doc = new jsPDF();

         // Header
         doc.setFont('helvetica', 'bold');
         doc.setFontSize(16);
         doc.setTextColor(30, 41, 59);
         doc.text('CAYR CLINICAL PORTAL', 105, 18, { align: 'center' });
         doc.setFont('helvetica', 'normal');
         doc.setFontSize(8);
         doc.setTextColor(100, 116, 139);
         doc.text('Advanced Digital Healthcare Network | Verified Clinical Document', 105, 24, { align: 'center' });
         doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 105, 29, { align: 'center' });
         doc.setDrawColor(200, 200, 210);
         doc.line(15, 33, 195, 33);

         // Patient Information Table
         doc.setFont('helvetica', 'bold');
         doc.setFontSize(10);
         doc.setTextColor(30, 41, 59);
         doc.text('Patient Prescription Details', 15, 42);

         const tableTop = 47;
         const rows = [
            ['Patient Name:', writingReportFor.name],
            ['Age / Blood Group:', `${writingReportFor.age} yrs / ${writingReportFor.bloodType || 'N/A'}`],
            ['Allergies:', writingReportFor.allergies?.join(', ') || 'None'],
            ['Diagnosis:', reportData.diagnosis],
            ['Consultant:', `Dr. ${user.name.replace(/^Dr\.?\s*/i, '')}`],
         ];
         doc.setFontSize(9);
         rows.forEach(([label, value], i) => {
            const y = tableTop + i * 9;
            doc.setFillColor(248, 250, 252);
            doc.rect(15, y - 5, 175, 8, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.rect(15, y - 5, 175, 8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text(label, 18, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            doc.text(String(value || 'N/A'), 70, y);
         });

         // Clinical Notes
         let y = tableTop + rows.length * 9 + 8;
         if (reportData.notes) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text('Clinical Notes', 15, y); y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const noteLines = doc.splitTextToSize(reportData.notes, 170);
            doc.text(noteLines, 15, y);
            y += noteLines.length * 5 + 6;
         }

         // AI Summary
         if (aiSummary) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text('Clinical Summary', 15, y); y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const summaryLines = doc.splitTextToSize(aiSummary, 170);
            doc.text(summaryLines, 15, y);
            y += summaryLines.length * 5 + 8;
         }

         // Prescription Table
         if (medicines.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text('Prescription', 15, y); y += 6;

            // Table header
            doc.setFillColor(59, 91, 253);
            doc.rect(15, y - 5, 175, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            doc.text('#', 18, y);
            doc.text('Medicine Name', 28, y);
            doc.text('Dose / Day', 105, y);
            doc.text('Days', 160, y);
            y += 3;

            // Table rows
            medicines.forEach((m, i) => {
               y += 6;
               doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
               doc.rect(15, y - 5, 175, 7, 'F');
               doc.setDrawColor(226, 232, 240);
               doc.rect(15, y - 5, 175, 7);
               doc.setFont('helvetica', 'normal');
               doc.setTextColor(30, 41, 59);
               doc.text(String(i + 1), 18, y);
               doc.text(m.name, 28, y);
               doc.text(m.dose || '-', 105, y);
               doc.text(String(m.daysCount || '-'), 160, y);
            });
            y += 10;
         }

         // Doctor Signature
         doc.setDrawColor(200, 200, 210);
         doc.line(15, y + 5, 195, y + 5);
         doc.setFont('helvetica', 'normal');
         doc.setFontSize(8);
         doc.setTextColor(100, 116, 139);
         doc.text(`Doctor Signature: ______________________`, 15, y + 12);
         doc.text(`Dr. ${user.name.replace(/^Dr\.?\s*/i, '')}`, 15, y + 18);
         doc.text('This is a digitally generated clinical document from CAYR Healthcare Portal.', 105, y + 18, { align: 'center' });

         const fileData = doc.output('datauristring');

         // Step 3: Attach PDF to saved report
         await fetch(`/api/reports/${reportId}/attach-pdf`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ fileData }),
         });

         if (onAddReport) await onAddReport(genData.report as any);
      } catch (err: any) {
         console.error('handleSaveConsultationReport error:', err);
         alert(`Failed to generate report: ${err.message}`);
      } finally {
         setIsSavingReport(false);
         setIsReportModalOpen(false);
         setWritingReportFor(null);
         setReportData({ diagnosis: '', notes: '' });
         setMedicines([]);
      }
   };

   const renderOverview = () => {
      // Build calendar grid
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
      // getDay() returns 0=Sun,1=Mon; convert to Mon-first: Mon=0...Sun=6
      const firstDayRaw = new Date(calYear, calMonth, 1).getDay();
      const startOffset = (firstDayRaw === 0 ? 6 : firstDayRaw - 1);
      const calCells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

      const selectedDateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedCalDate).padStart(2, '0')}`;
      const apptOnDate = appointments.filter(a => a.status !== AppointmentStatus.PENDING && a.date === selectedDateStr);
      const isToday = (d: number) => calYear === today.getFullYear() && calMonth === today.getMonth() && d === today.getDate();

      return (
         <div className="relative z-10 flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto">
            <div className="flex-1 space-y-8">
               <div className="flex items-center">
                  <div>
                     <h1 className="text-[26px] font-semibold tracking-tight text-[#1C2B39]">
                        Welcome back, Dr. {user.name.replace(/^Dr\.?\s*/i, '').split(' ')[0]}
                     </h1>
                     <p className="text-[15px] text-[#5C6B7A] mt-1 font-normal">Your health overview is ready for review.</p>
                  </div>
               </div>

               {/* Dashboard Overview Cards */}
               <div className="bg-[#FFFFFF] border border-[#E3EAF2] rounded-[14px] p-6 shadow-[0_4px_14px_rgba(16,42,67,0.06)] hover:shadow-[0_8px_20px_rgba(16,42,67,0.08)] transition-shadow">
                  <h3 className="text-[18px] font-semibold text-[#1C2B39] mb-5">Dashboard Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {[
                        {
                           label: 'Patients Today', value: appointments.filter(a => a.date === today.toISOString().split('T')[0]).length.toString() || '12', icon: (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                           ), color: 'text-[#1F4E79]', bg: 'bg-[#E8F1FA]'
                        },
                        {
                           label: 'Total Patients', value: String(patients.length || 452), icon: (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                           ), color: 'text-[#1F4E79]', bg: 'bg-[#E8F1FA]'
                        },
                        {
                           label: 'Requests', value: String(appointments.filter(a => a.status === AppointmentStatus.PENDING).length), icon: (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
                           ), color: 'text-[#1F4E79]', bg: 'bg-[#E8F1FA]'
                        },
                     ].map((stat, i) => (
                        <div key={i} className="bg-[#FFFFFF] rounded-[8px] p-5 border border-[#E3EAF2] flex items-center gap-4">
                           <div className={`w-11 h-11 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
                              {stat.icon}
                           </div>
                           <div>
                              <p className="text-[12px] font-medium text-[#6B7C8F]">{stat.label}</p>
                              <p className="text-[24px] font-semibold mt-0.5 leading-none text-[#1C2B39]">{stat.value}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Appointments Statistics Container */}
               <div className="bg-[#FFFFFF] border border-[#E3EAF2] rounded-[16px] p-7 shadow-[0_4px_14px_rgba(16,42,67,0.06)]">
                  <h3 className="text-[18px] font-semibold text-[#1C2B39] mb-1">Appointments Statistics</h3>
                  <p className="text-[12px] font-medium text-[#6B7C8F] mb-6">{monthNames[calMonth]} {calYear}</p>

                  <div className="h-44 mb-5">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={appointmentsChartData}>
                           <defs>
                              <linearGradient id="apptGrad" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#1F4E79" stopOpacity={0.15} />
                                 <stop offset="95%" stopColor="#1F4E79" stopOpacity={0} />
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EEF5" />
                           <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 500, fill: '#7A8B9C' }} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 500, fill: '#7A8B9C' }} />
                           <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E3EAF2', borderRadius: '8px', color: '#1C2B39', boxShadow: '0 4px 14px rgba(16,42,67,0.06)', fontSize: '12px', fontWeight: 500 }} formatter={(value: any) => [value, "Appointments"]} />
                           <Area type="monotone" dataKey="appointments" name="Appointments" dot={false} stroke="#1F4E79" strokeWidth={2.5} fillOpacity={1} fill="url(#apptGrad)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>

                  <div className="bg-[#F4F7FB] rounded-lg py-3 px-6 flex justify-between items-center border border-[#E3EAF2]">
                     <div className="flex items-center gap-6">
                        <span className="flex items-center gap-3 text-[13px] font-medium text-[#1C2B39]">
                           <span className="w-6 h-6 rounded-md bg-[#1F4E79] text-white flex items-center justify-center text-[11px] font-semibold">{appointments.filter(a => a.status === AppointmentStatus.CONFIRMED || a.status === AppointmentStatus.PENDING).length}</span>
                        </span>
                        <span className="flex items-center gap-2 text-[13px] font-medium text-[#1C2B39]">
                           <span className="w-5 h-5 rounded-md bg-[#2E6FA3] text-white flex items-center justify-center text-[10px]">✓</span>
                           Completed
                        </span>
                     </div>
                     <button onClick={() => setLocalView('Appointments')} className="text-[12px] font-semibold text-[#1F4E79] hover:underline transition-all">
                        View All &gt;
                     </button>
                  </div>
               </div>
            </div>

            <div className="w-full lg:w-[300px] space-y-4 shrink-0">
               {/* Profile Info Card */}
               <div className="bg-[#FFFFFF] border border-[#E3EAF2] rounded-[16px] p-6 text-center text-[#1C2B39] shadow-[0_4px_14px_rgba(16,42,67,0.04)]">
                  <div className="relative inline-block mb-3">
                     <div className="w-20 h-20 rounded-full overflow-hidden border border-[#D6E0EB] bg-[#EAF1F8]">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="Doctor Avatar" className="w-full h-full object-cover" />
                     </div>
                     <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-sm">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                     </div>
                  </div>
                  <h4 className="text-[16px] font-semibold text-[#1C2B39]">Dr. {user.name.replace(/^Dr\.?\s*/i, '')}</h4>
                  <p className="text-[12px] font-medium text-[#6B7C8F] mt-1">Verified Doctor</p>
               </div>

               {/* Calendar Widget */}
               <div className="bg-[#FFFFFF] border border-[#E3EAF2] rounded-[16px] p-5 shadow-[0_4px_14px_rgba(16,42,67,0.04)]">
                  <div className="flex items-center justify-between mb-4">
                     <h4 className="text-[14px] font-semibold text-[#1C2B39]">{monthNames[calMonth]} {calYear}</h4>
                     <div className="flex gap-1">
                        <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} className="w-6 h-6 rounded bg-[#F4F7FB] hover:bg-[#1F4E79] hover:text-white text-[#6B7C8F] flex items-center justify-center text-[10px] font-bold transition-colors">&lt;</button>
                        <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} className="w-6 h-6 rounded bg-[#F4F7FB] hover:bg-[#1F4E79] hover:text-white text-[#6B7C8F] flex items-center justify-center text-[10px] font-bold transition-colors">&gt;</button>
                     </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-[11px] font-medium text-center text-[#9FB3C8] mb-2">
                     {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-[12px] font-medium text-center">
                     {calCells.map((d, i) => d === null ? <div key={i} /> : (
                        <button
                           key={i}
                           onClick={() => setSelectedCalDate(d)}
                           className={`aspect-square flex items-center justify-center rounded-lg transition-all text-[12px] ${d === selectedCalDate && !isToday(d) ? 'bg-[#1F4E79] text-white shadow-sm' :
                              isToday(d) ? 'bg-[#0F2A43] text-white font-semibold' :
                                 appointments.some(a => a.date === `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` && a.status !== AppointmentStatus.PENDING) ? 'text-[#1F4E79] bg-[#E8F1FA] font-semibold' :
                                    'text-[#5C6B7A] hover:bg-[#F4F7FB]'
                              }`}
                        >{d}</button>
                     ))}
                  </div>
               </div>

               {/* Upcoming Appointments for Selected Date */}
               <div className="bg-[#FFFFFF] border border-[#E3EAF2] rounded-[16px] p-5 shadow-[0_4px_14px_rgba(16,42,67,0.04)]">
                  <div className="flex items-center justify-between mb-4">
                     <h4 className="text-[14px] font-semibold text-[#1C2B39]">Upcoming Appointments</h4>
                     <button className="text-[#1F4E79] hover:text-[#0F2A43]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                     </button>
                  </div>
                  {apptOnDate.length === 0 ? (
                     <p className="text-[12px] text-[#9FB3C8] text-center py-4 font-medium uppercase tracking-wide">No appointments on {selectedCalDate} {monthNames[calMonth]}</p>
                  ) : apptOnDate.map(a => (
                     <div key={a.id} className="bg-[#FFFFFF] rounded-[10px] p-3 flex items-center gap-3 shadow-none border border-[#E3EAF2] hover:border-[#1F4E79] transition-colors mb-2">
                        <div className="w-10 h-10 rounded-full bg-[#EAF1F8] border border-[#D6E0EB] overflow-hidden shrink-0">
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${a.patientName}`} alt={a.patientName} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                           <p className="text-[13px] font-semibold text-[#1C2B39] truncate">{a.patientName}</p>
                           <p className="text-[11px] font-medium text-[#6B7C8F] mt-0.5 truncate">{a.time}</p>
                        </div>
                        <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      );
   };

   const renderAppointments = (viewName: string) => {
      const displayAppointments = viewName === 'Requests'
         ? appointments.filter(a => a.status === AppointmentStatus.PENDING)
         : appointments.filter(a => a.status !== AppointmentStatus.PENDING);

      return (
         <div className="space-y-6 animate-in fade-in duration-700">
            <h1 className="text-[26px] font-semibold text-[#1C2B39]">{viewName}</h1>
            <div className="bg-[#FFFFFF] border border-[#E3EAF2] p-8 rounded-[16px] shadow-[0_4px_14px_rgba(16,42,67,0.04)] divide-y divide-[#E3EAF2]">
               {displayAppointments.length === 0 ? (
                  <p className="text-[12px] font-medium text-[#9FB3C8] uppercase tracking-wide text-center py-10">No {viewName.toLowerCase()} found</p>
               ) : displayAppointments.map(appt => (
                  <div key={appt.id} className="flex items-center justify-between py-5">
                     <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-[#EAF1F8] border border-[#D6E0EB] overflow-hidden"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${appt.patientName}`} alt="" className="w-full h-full object-cover" /></div>
                        <div><p className="font-semibold text-[#1C2B39]">{appt.patientName}</p><p className="text-[11px] font-medium text-[#6B7C8F] mt-0.5">{appt.date} &bull; {appt.time}</p></div>
                     </div>
                     <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-md text-[10px] font-semibold uppercase ${appt.status === AppointmentStatus.PENDING ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>{appt.status}</span>
                        {appt.status === AppointmentStatus.PENDING && (
                           <div className="flex gap-2">
                              <button onClick={() => updateStatus(appt.id, AppointmentStatus.CANCELLED)} className="px-3 py-1.5 text-[#6B7C8F] font-semibold text-[11px] hover:text-rose-600 transition-colors">Reject</button>
                              <button onClick={() => updateStatus(appt.id, AppointmentStatus.CONFIRMED)} className="px-4 py-1.5 bg-[#1F4E79] text-[#FFFFFF] rounded-lg font-medium text-[12px] shadow-sm hover:bg-[#163A5C] transition-colors">Approve</button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
         {patients.map(p => (
            <div key={p.id} className="bg-[#FFFFFF] border border-[#E3EAF2] p-6 rounded-[14px] shadow-[0_4px_14px_rgba(16,42,67,0.06)] hover:shadow-[0_8px_20px_rgba(16,42,67,0.08)] transition-all">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-[#EAF1F8] overflow-hidden border border-[#D6E0EB]">
                     <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                     <h3 className="text-[16px] font-semibold text-[#1C2B39]">{p.name}</h3>
                     <p className="text-[12px] font-medium text-[#6B7C8F] mt-0.5">{p.age}y &bull; {p.bloodType}</p>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => { setSelectedPatientId(p.id); setLocalView('My Patients'); }} className="flex-1 py-2 bg-[#F0F4F9] border border-[#D6E0EB] text-[#1F4E79] rounded-lg font-medium text-[11px] hover:bg-[#E3EAF2] transition-colors">Profile</button>
                  <button onClick={() => handleFetchPatientIntakeReports(p)} className="flex-1 py-2 bg-[#F0F4F9] border border-[#D6E0EB] text-[#1F4E79] rounded-lg font-medium text-[11px] hover:bg-[#E3EAF2] transition-colors">History</button>
                  <button onClick={() => { setWritingReportFor(p); setMedicines([]); setReportData({ diagnosis: '', notes: '' }); setIsReportModalOpen(true); }} className="flex-1 py-2 bg-[#1F4E79] text-[#FFFFFF] rounded-lg font-medium text-[11px] shadow-sm hover:bg-[#163A5C] transition-colors">Report</button>
               </div>
            </div>
         ))}
      </div>
   );

   const renderRecords = () => (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in">
         <div className="col-span-1 p-6 bg-[#FFFFFF] border border-[#E3EAF2] rounded-[16px] shadow-[0_4px_14px_rgba(16,42,67,0.04)]">
            <h3 className="text-[12px] font-medium text-[#6B7C8F] uppercase tracking-wide mb-4">Roster</h3>
            <div className="space-y-2">{patients.map(p => (<button key={p.id} onClick={() => setSelectedPatientId(p.id)} className={`w-full p-3 rounded-lg text-left font-semibold text-[14px] transition-colors ${selectedPatientId === p.id ? 'bg-[#1F4E79] text-[#FFFFFF] shadow-sm' : 'text-[#5C6B7A] hover:bg-[#F4F7FB]'}`}>{p.name}</button>))}</div>
         </div>
         <div className="col-span-3 space-y-6">
            <div className="bg-[#FFFFFF] border border-[#E3EAF2] p-10 rounded-[16px] shadow-[0_4px_14px_rgba(16,42,67,0.04)] text-[#1C2B39]">
               <h2 className="text-[26px] font-semibold mb-6">{activePatient?.name}</h2>
               <div className="grid grid-cols-2 gap-8">
                  <div><h4 className="text-[13px] uppercase text-[#1F4E79] mb-4 font-semibold tracking-wide">History</h4><div className="space-y-4">{activePatient?.history?.map((h, i) => (<div key={i} className="flex gap-3"><div className="w-2 h-2 bg-[#1F4E79] rounded-full mt-1.5 shrink-0" /><p className="text-[14px] font-semibold">{h.condition} <span className="block text-[11px] text-[#6B7C8F] mt-0.5">{h.date}</span></p></div>))}</div></div>
                  <div><h4 className="text-[13px] uppercase text-[#1F4E79] mb-4 font-semibold tracking-wide">Reports</h4><div className="space-y-3">{medicalReports.filter(r => r.patientId === activePatient?.id).map(r => (<div key={r.id} className="bg-[#F4F7FB] border border-[#E3EAF2] p-4 rounded-lg flex justify-between items-center"><span className="text-[12px] font-semibold text-[#1C2B39]">{r.title}</span><button onClick={() => handleDownloadReport(r.fileData, r.fileName)} className="text-[#1F4E79] hover:text-[#0F2A43] font-semibold text-[11px] uppercase tracking-wide transition-colors">Download</button></div>))}</div></div>
               </div>
            </div>
         </div>
      </div>
   );

   const renderPayouts = () => (
      <div className="space-y-6 animate-in fade-in duration-700 text-[#1C2B39]">
         <div><h1 className="text-[26px] font-semibold tracking-tight">Payouts & Earnings</h1><p className="text-[13px] font-medium mt-1 text-[#6B7C8F]">Revenue tracking active</p></div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-8 rounded-[16px] bg-[#1F4E79] shadow-sm"><p className="text-[12px] font-medium uppercase text-[#E8F1FA] mb-3 tracking-wide">Available</p><p className="text-[32px] font-semibold text-white">$4,250.00</p><button className="mt-6 w-full py-3 bg-[#FFFFFF] text-[#1F4E79] shadow-sm rounded-lg text-[13px] font-semibold hover:bg-[#F4F7FB] transition-colors">Withdraw</button></div>
            <div className="p-8 rounded-[16px] bg-[#FFFFFF] border border-[#E3EAF2] shadow-[0_4px_14px_rgba(16,42,67,0.04)]"><p className="text-[12px] font-medium uppercase tracking-wide text-[#6B7C8F] mb-3">Monthly</p><p className="text-[32px] font-semibold text-[#1C2B39]">$12,840.00</p></div>
            <div className="p-8 rounded-[16px] bg-[#FFFFFF] border border-[#E3EAF2] shadow-[0_4px_14px_rgba(16,42,67,0.04)]"><p className="text-[12px] font-medium uppercase tracking-wide text-[#6B7C8F] mb-3">Pending</p><p className="text-[32px] font-semibold text-[#1C2B39]">$1,120.00</p></div>
         </div>
      </div>
   );

   const renderChat = () => {
      const activeChat = appointments.find(a => a.id === chatSelectedId);

      const handleSendMessage = async () => {
         if (!chatNewMessage.trim() || !chatSelectedId) return;
         const text = chatNewMessage;
         setChatNewMessage('');
         try {
            await fetch(`/api/chats/${chatSelectedId}/messages`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ text })
            });
            const msg = {
               _id: Date.now().toString(),
               text: text,
               senderId: user.id,
               senderName: user.name,
               createdAt: new Date().toISOString()
            };
            setChatLocalMessages(prev => ({
               ...prev,
               [chatSelectedId]: [...(prev[chatSelectedId] || []), msg]
            }));
         } catch (err) {
            setChatNewMessage(text);
         }
      };

      return (
         <div className="space-y-8 animate-in fade-in duration-700 h-[calc(100vh-200px)] text-[#1C2B39]">
            <div><h1 className="text-[26px] font-semibold tracking-tight">Clinical Messaging</h1><p className="text-[13px] font-medium mt-1 text-[#6B7C8F]">Secure coordination</p></div>
            <div className="bg-[#FFFFFF] border border-[#E3EAF2] shadow-[0_4px_14px_rgba(16,42,67,0.04)] rounded-[16px] overflow-hidden flex h-full">
               <div className="w-80 border-r border-[#E3EAF2] flex flex-col bg-[#F4F7FB]">
                  <div className="p-6 border-b border-[#E3EAF2]"><h3 className="text-[12px] font-medium uppercase text-[#6B7C8F] tracking-wide">Active</h3></div>
                  <div className="flex-1 overflow-y-auto">{appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).map(a => (
                     <button
                        key={a.id}
                        onClick={() => setChatSelectedId(a.id)}
                        className={`w-full p-6 text-left border-b border-[#E3EAF2] flex items-center gap-4 transition-colors ${chatSelectedId === a.id ? 'bg-[#E8F1FA]' : 'hover:bg-[#FFFFFF]'}`}
                     >
                        <div className="w-12 h-12 rounded-full border border-[#D6E0EB] bg-[#FFFFFF] shadow-sm overflow-hidden"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${a.patientName}`} alt="" className="w-full h-full object-cover" /></div>
                        <div className="flex-1 min-w-0"><p className={`text-[14px] font-semibold truncate ${chatSelectedId === a.id ? 'text-[#1F4E79]' : 'text-[#1C2B39]'}`}>{a.patientName}</p><p className="text-[11px] font-medium text-[#6B7C8F] mt-0.5 truncate">Active session</p></div>
                     </button>
                  ))}</div>
               </div>

               {chatSelectedId ? (
                  <div className="flex-1 flex flex-col bg-[#FFFFFF]">
                     <div className="p-6 border-b border-[#E3EAF2] flex justify-between items-center bg-[#FFFFFF]">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full border border-[#D6E0EB] bg-[#F4F7FB] shadow-sm overflow-hidden">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeChat?.patientName}`} alt="" className="w-full h-full object-cover" />
                           </div>
                           <div>
                              <h3 className="text-[15px] font-semibold text-[#1C2B39]">{activeChat?.patientName}</h3>
                              <p className="text-[11px] font-medium text-emerald-600 tracking-wide mt-0.5">Connected</p>
                           </div>
                        </div>
                        <div className="flex gap-3">
                           <button
                              onClick={() => setIsBridgeOpen(true)}
                              className="p-2.5 bg-[#F0F4F9] border border-[#D6E0EB] text-[#1F4E79] rounded-lg hover:bg-[#E3EAF2] transition-all shadow-sm"
                           >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                           </button>
                        </div>
                     </div>

                     <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        <div className="flex justify-center mb-8">
                           <span className="px-4 py-1.5 bg-[#F4F7FB] border border-[#E3EAF2] rounded-full text-[11px] font-medium text-[#6B7C8F]">
                              Today
                           </span>
                        </div>

                        <div className="flex gap-4 justify-end">
                           <div className="bg-[#1F4E79] border border-[#163A5C] p-4 rounded-xl rounded-tr-none shadow-sm text-white max-w-[80%]">
                              <p className="text-[13px] font-medium leading-relaxed">Hey, your appointment is successfully booked in this time ({activeChat?.time}) and date ({activeChat?.date}).</p>
                              <p className="text-[10px] font-semibold text-[#9FB3C8] mt-2 uppercase tracking-wide">System Auto-Generated</p>
                           </div>
                        </div>

                        {chatLocalMessages[chatSelectedId]?.map((msg) => (
                           <div key={msg._id || msg.id} className={`flex gap-4 ${msg.senderId === user.id ? 'justify-end' : ''}`}>
                              {msg.senderId !== user.id && (
                                 <div className="w-8 h-8 rounded-full border border-[#D6E0EB] bg-[#F4F7FB] overflow-hidden shrink-0"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`} alt="" className="w-full h-full object-cover" /></div>
                              )}
                              <div className={`${msg.senderId === user.id ? 'bg-[#1F4E79] border-transparent text-white rounded-tr-none' : 'bg-[#FFFFFF] border-[#E3EAF2] text-[#1C2B39] rounded-tl-none'} border p-4 rounded-xl shadow-sm max-w-[80%]`}>
                                 <p className="text-[13px] font-medium leading-relaxed">{msg.text || msg.content}</p>
                                 <p className={`text-[10px] font-medium mt-2 ${msg.senderId === user.id ? 'text-[#9FB3C8]' : 'text-[#6B7C8F]'}`}>
                                    {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </p>
                              </div>
                           </div>
                        ))}
                     </div>

                     <div className="p-6 border-t border-[#E3EAF2] bg-[#FFFFFF]">
                        <div className="flex gap-4">
                           <input
                              type="text"
                              value={chatNewMessage}
                              onChange={(e) => setChatNewMessage(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                              placeholder="Type your message..."
                              className="flex-1 bg-[#F4F7FB] border border-[#D6E0EB] rounded-lg px-6 py-3.5 text-[14px] font-medium text-[#1C2B39] outline-none focus:ring-4 focus:ring-[#1F4E79]/10 placeholder:text-[#9FB3C8] transition-all"
                           />
                           <button
                              onClick={handleSendMessage}
                              className="p-3.5 px-5 bg-[#1F4E79] text-white rounded-lg hover:bg-[#163A5C] transition-all shadow-sm"
                           >
                              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" /></svg>
                           </button>
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-[#FFFFFF]">
                     <div className="w-20 h-20 bg-[#E8F1FA] text-[#1F4E79] rounded-full flex items-center justify-center text-[32px] mb-6">💬</div>
                     <h3 className="text-[22px] font-semibold text-[#1C2B39]">Secure Clinical Messaging</h3>
                     <p className="text-[14px] font-medium text-[#6B7C8F] mt-3 max-w-sm">Select an active session from the left to communicate with your patient in real-time.</p>
                  </div>
               )}
            </div>
         </div>
      );
   };

   const renderSettings = () => (
      <div className="space-y-6 animate-in fade-in duration-700 text-[#1C2B39]">
         <div><h1 className="text-[26px] font-semibold">Settings</h1><p className="text-[13px] font-medium mt-1 text-[#6B7C8F]">Account & Preference Controls</p></div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#FFFFFF] border border-[#E3EAF2] p-8 rounded-[16px] shadow-[0_4px_14px_rgba(16,42,67,0.04)] space-y-5"><h3 className="text-[16px] font-semibold">System Preferences</h3></div>
            <div className="bg-[#FFFFFF] border border-[#E3EAF2] p-8 rounded-[16px] shadow-[0_4px_14px_rgba(16,42,67,0.04)] space-y-5"><h3 className="text-[16px] font-semibold">Security</h3><button className="w-full py-3 bg-[#1F4E79] text-[#FFFFFF] rounded-lg text-[14px] font-medium hover:bg-[#163A5C] transition-colors">Change Password</button></div>
         </div>
      </div>
   );

   const isOverview = ['Overview', 'Dashboard'].includes(localView);

   return (
      <div className="min-h-[calc(100vh)] -m-10 p-10 bg-[#F4F7FB] relative overflow-hidden">
         {/* Top Section Light Radial Highlight */}
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#0F2A43]/5 rounded-full blur-[100px] pointer-events-none"></div>

         <div className="relative z-10 max-w-[1500px] mx-auto pb-20 px-8 w-full">
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
            {/* ── Report History Modal ── */}
            {viewingHistoryFor && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-[#0F2A43]/40 backdrop-blur-sm" onClick={() => setViewingHistoryFor(null)} />
                  <div className="bg-[#FFFFFF] relative w-full max-w-2xl rounded-[16px] shadow-[0_8px_30px_rgba(15,42,67,0.12)] border border-[#E3EAF2] p-8 text-[#1C2B39] max-h-[85vh] flex flex-col">
                     <div className="flex items-center justify-between mb-6">
                        <div>
                           <h2 className="text-[20px] font-semibold text-[#1C2B39]">AI Intake Reports</h2>
                           <p className="text-[12px] font-medium text-[#6B7C8F] uppercase tracking-wide mt-1">{viewingHistoryFor.name}</p>
                        </div>
                        <button onClick={() => setViewingHistoryFor(null)} className="w-8 h-8 rounded-lg bg-[#F4F7FB] border border-[#E3EAF2] flex items-center justify-center text-[#6B7C8F] hover:bg-[#E3EAF2] hover:text-[#1C2B39] transition-colors">✕</button>
                     </div>
                     <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                        {isLoadingHistory ? (
                           <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#1F4E79] border-t-transparent rounded-full animate-spin" /></div>
                        ) : patientIntakeReports.length === 0 ? (
                           <div className="text-center py-16 opacity-70">
                              <div className="text-4xl mb-3">📋</div>
                              <p className="text-[12px] font-medium uppercase tracking-wide text-[#6B7C8F]">No AI intake reports found for this patient</p>
                           </div>
                        ) : patientIntakeReports.map((r: any) => (
                           <div key={r._id} className="bg-[#F4F7FB] border border-[#E3EAF2] rounded-xl p-5 shadow-sm">
                              <div className="flex items-start justify-between gap-4">
                                 <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-[#1C2B39] text-[14px] truncate">{r.title || 'AI Intake Report'}</p>
                                    <p className="text-[11px] font-medium text-[#6B7C8F] uppercase tracking-wide mt-1">
                                       {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                    {r.extractedSummary?.symptoms && (
                                       <p className="text-[13px] text-[#5C6B7A] mt-2 line-clamp-2">{r.extractedSummary.symptoms}</p>
                                    )}
                                    {r.extractedSummary?.conditions?.length > 0 && (
                                       <div className="flex flex-wrap gap-1.5 mt-3">
                                          {r.extractedSummary.conditions.map((c: string, i: number) => (
                                             <span key={i} className="px-2 py-0.5 bg-[#E8F1FA] border border-[#D6E0EB] text-[#1F4E79] rounded-full text-[10px] font-semibold uppercase">{c}</span>
                                          ))}
                                       </div>
                                    )}
                                 </div>
                                 {r.fileData && (
                                    <button
                                       onClick={() => handleDownloadFromData(r.fileData, r.fileName || 'intake_report.pdf')}
                                       className="shrink-0 px-4 py-2 bg-[#F0F4F9] border border-[#D6E0EB] text-[#1F4E79] rounded-lg text-[10px] font-semibold uppercase tracking-wide hover:bg-[#E3EAF2] hover:text-[#0F2A43] transition-all"
                                    >Download</button>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )}

            {/* ── Make Report Modal ── */}
            {isReportModalOpen && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-[#0F2A43]/40 backdrop-blur-sm" onClick={() => setIsReportModalOpen(false)} />
                  <div className="bg-[#FFFFFF] relative w-full max-w-2xl rounded-[16px] shadow-[0_8px_30px_rgba(15,42,67,0.12)] border border-[#E3EAF2] p-8 text-[#1C2B39] max-h-[90vh] flex flex-col">
                     <div className="mb-6">
                        <h2 className="text-[20px] font-semibold text-[#1C2B39]">Make Report</h2>
                        <p className="text-[12px] font-medium text-[#6B7C8F] uppercase tracking-wide mt-1">{writingReportFor?.name}</p>
                     </div>
                     <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                        <div>
                           <label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7C8F] mb-2 block">Diagnosis *</label>
                           <input
                              type="text"
                              placeholder="e.g. Acute Upper Respiratory Infection"
                              value={reportData.diagnosis}
                              onChange={e => setReportData({ ...reportData, diagnosis: e.target.value })}
                              className="w-full p-3.5 rounded-lg border border-[#D6E0EB] bg-[#FFFFFF] text-[#1C2B39] placeholder-[#9FB3C8] outline-none font-medium focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79] transition-all"
                           />
                        </div>
                        <div>
                           <label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7C8F] mb-2 block">Clinical Notes</label>
                           <textarea
                              rows={3}
                              placeholder="Findings, observations, advice..."
                              value={reportData.notes}
                              onChange={e => setReportData({ ...reportData, notes: e.target.value })}
                              className="w-full p-3.5 rounded-lg border border-[#D6E0EB] bg-[#FFFFFF] text-[#1C2B39] placeholder-[#9FB3C8] outline-none font-medium resize-none focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79] transition-all"
                           />
                        </div>

                        {/* Prescription Table */}
                        <div>
                           <div className="flex items-center justify-between mb-3">
                              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7C8F]">Prescription</label>
                              <button
                                 onClick={() => setMedicines(prev => [...prev, { name: '', dose: '', daysCount: '' }])}
                                 className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 bg-[#F0F4F9] border border-[#D6E0EB] text-[#1F4E79] rounded-lg hover:bg-[#E3EAF2] hover:text-[#0F2A43] transition-all"
                              >+ Add Medicine</button>
                           </div>

                           {medicines.length === 0 ? (
                              <div className="border border-dashed border-[#D6E0EB] rounded-lg p-6 text-center bg-[#F4F7FB]">
                                 <p className="text-[12px] font-medium text-[#6B7C8F]">No medicines added yet</p>
                              </div>
                           ) : (
                              <div className="space-y-3">
                                 {/* Header row */}
                                 <div className="grid grid-cols-12 gap-2 px-1">
                                    <span className="col-span-5 text-[10px] font-semibold uppercase text-[#6B7C8F]">Medicine</span>
                                    <span className="col-span-4 text-[10px] font-semibold uppercase text-[#6B7C8F]">Dose / Day</span>
                                    <span className="col-span-2 text-[10px] font-semibold uppercase text-[#6B7C8F]">Days</span>
                                 </div>
                                 {medicines.map((m, i) => (
                                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                       <input
                                          className="col-span-5 p-2.5 rounded-lg border border-[#D6E0EB] bg-[#FFFFFF] text-[#1C2B39] text-[13px] font-medium placeholder-[#9FB3C8] outline-none focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79] transition-all"
                                          placeholder="Paracetamol 500mg"
                                          value={m.name}
                                          onChange={e => setMedicines(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                       />
                                       <input
                                          className="col-span-4 p-2.5 rounded-lg border border-[#D6E0EB] bg-[#FFFFFF] text-[#1C2B39] text-[13px] font-medium placeholder-[#9FB3C8] outline-none focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79] transition-all"
                                          placeholder="2x / day"
                                          value={m.dose}
                                          onChange={e => setMedicines(prev => prev.map((x, j) => j === i ? { ...x, dose: e.target.value } : x))}
                                       />
                                       <input
                                          type="number" min="1"
                                          className="col-span-2 p-2.5 rounded-lg border border-[#D6E0EB] bg-[#FFFFFF] text-[#1C2B39] text-[13px] font-medium placeholder-[#9FB3C8] outline-none focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79] transition-all"
                                          placeholder="5"
                                          value={m.daysCount}
                                          onChange={e => setMedicines(prev => prev.map((x, j) => j === i ? { ...x, daysCount: e.target.value } : x))}
                                       />
                                       <button
                                          onClick={() => setMedicines(prev => prev.filter((_, j) => j !== i))}
                                          className="col-span-1 w-8 h-8 rounded-lg bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center text-[14px] hover:bg-rose-500 hover:text-white hover:border-rose-600 transition-all ml-1"
                                       >✕</button>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="mt-6 flex gap-4 pt-6 border-t border-[#E3EAF2]">
                        <button onClick={() => setIsReportModalOpen(false)} className="flex-1 py-3 font-semibold text-[#6B7C8F] bg-[#FFFFFF] border border-[#D6E0EB] rounded-lg text-[13px] hover:bg-[#F4F7FB] hover:text-[#1C2B39] transition-colors">Cancel</button>
                        <button
                           onClick={handleSaveConsultationReport}
                           disabled={isSavingReport || !reportData.diagnosis.trim()}
                           className="flex-1 py-3 bg-[#1F4E79] text-[#FFFFFF] rounded-lg font-semibold text-[13px] shadow-sm hover:bg-[#163A5C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {isSavingReport ? (
                              <span className="flex items-center justify-center gap-2">
                                 <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" /></svg>
                                 Generating...
                              </span>
                           ) : 'Generate Report'}
                        </button>
                     </div>
                  </div>
               </div>
            )}
            {isBridgeOpen && <MultilingualBridge partnerName="Staff" onClose={() => setIsBridgeOpen(false)} />}
         </div>
      </div>
   );
};

export default DoctorDashboard;
