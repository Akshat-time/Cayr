
import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { User, Appointment, AppointmentStatus, MedicalReport, Prescription, Payment, PainArea } from '../types';
import { MOCK_DOCTORS } from '../constants';
import {
  createClinicalIntakeSession,
  createSymptomCheckerSession,
  generateSOAPNote,
  searchNearbyClinics
} from '../services/geminiService';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import MultilingualBridge from './MultilingualBridge';
import BodyScanner from './BodyScanner';
import ClinicLabFinder from './ClinicLabFinder';
import Pharmacy from './Pharmacy';

interface ChatMessage { role: 'user' | 'ai'; text: string; }

interface PatientDashboardProps {
  user: User;
  appointments: Appointment[];
  medicalReports: MedicalReport[];
  prescriptions: Prescription[];
  payments: Payment[];
  onBook: (doctorId: string, doctorName: string, date: string, time: string) => void;
  onAddReport: (report: MedicalReport) => void;
  onOpenChat?: (appointmentId: string) => void;
  onUploadPrescription: (prescription: Prescription) => void;
  view: 'dashboard' | 'analytics' | 'payments' | 'reports' | 'reminders' | 'facilities' | 'booking' | 'pharmacy' | 'doctors' | 'chat';
  onSubViewChange?: (view: string) => void;
}

const PatientDashboard: React.FC<PatientDashboardProps> = ({
  user,
  appointments,
  medicalReports,
  prescriptions,
  payments,
  onBook,
  onAddReport,
  onOpenChat,
  onUploadPrescription,
  view: initialView = 'dashboard',
  onSubViewChange
}) => {
  const [activeTab, setActiveTab] = useState(initialView);
  const [isBridgeOpen, setIsBridgeOpen] = useState(false);
  const [isBodyScanOpen, setIsBodyScanOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatType, setChatType] = useState<'intake' | 'symptom'>('intake');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDoctorName, setPaymentDoctorName] = useState<string>('');

  // State for Doctors view
  const [doctorsSearchTerm, setDoctorsSearchTerm] = useState('');
  const [doctorsPincodeTerm, setDoctorsPincodeTerm] = useState('');

  // State for Chat view
  const [chatSelectedId, setChatSelectedId] = useState<string | null>(null);
  const [chatNewMessage, setChatNewMessage] = useState('');
  const [chatLocalMessages, setChatLocalMessages] = useState<Record<string, any[]>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [intakeData, setIntakeData] = useState<any>(null);
  const [activePainMap, setActivePainMap] = useState<PainArea[]>(() => {
    const saved = sessionStorage.getItem('cayr_pain_map');
    return saved ? JSON.parse(saved) : [];
  });


  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [isBookingSuccessful, setIsBookingSuccessful] = useState(false);

  const chatSessionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialView);
  }, [initialView]);

  useEffect(() => {
    sessionStorage.setItem('cayr_pain_map', JSON.stringify(activePainMap));
  }, [activePainMap]);

  // Fetch intake record for health summary card
  useEffect(() => {
    fetch('/api/intake/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.intake) setIntakeData(d.intake); })
      .catch(() => null);
  }, []);

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    onSubViewChange?.(tab);
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory, isTyping]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const txt = chatInput.trim();
    if (!txt || isTyping) return;

    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: txt }]);
    setIsTyping(true);

    try {
      const resp = await chatSessionRef.current.sendMessage({ message: txt });
      const aiText = resp.text;
      setChatHistory(prev => [...prev, { role: 'ai', text: aiText }]);
      if (chatType === 'intake' && aiText.toLowerCase().includes("summary is ready")) setReportReady(true);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'ai', text: "Service interrupted. Please retry." }]);
    } finally {
      setIsTyping(false);
    }
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
      alert("Failed to download report. The file may be corrupted.");
    }
  };

  const handleCreateReport = async () => {
    setIsGeneratingReport(true);
    const history = chatHistory.map(m => `${m.role}: ${m.text}`).join('\n');
    const painContext = activePainMap.length > 0
      ? `\nPain Map Data: ${activePainMap.map(a => `${a.label} (${a.side}) intensity ${a.intensity}/10`).join(', ')}`
      : "";

    const summary = await generateSOAPNote(history + painContext);

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(59, 91, 253);
    doc.text("CAYR CLINICAL INTAKE REPORT", 20, 30);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 38);

    doc.setDrawColor(239, 242, 246);
    doc.line(20, 45, 190, 45);

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("PATIENT INFORMATION", 20, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${user.name}`, 20, 62);
    doc.text(`DOB: ${user.dob || 'N/A'}`, 20, 69);
    doc.text(`Address: ${user.address || 'N/A'}`, 20, 76);

    doc.setFont("helvetica", "bold");
    doc.text("CLINICAL SUMMARY (SOAP NOTE)", 20, 90);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitSummary = doc.splitTextToSize(summary, 170);
    doc.text(splitSummary, 20, 97);

    if (activePainMap.length > 0) {
      const yPos = 97 + (splitSummary.length * 5) + 10;
      doc.setFont("helvetica", "bold");
      doc.text("ACTIVE PAIN MAP DATA", 20, yPos);
      doc.setFont("helvetica", "normal");
      activePainMap.forEach((area, i) => {
        doc.text(`- ${area.label} (${area.side}): Intensity ${area.intensity}/10`, 20, yPos + 7 + (i * 6));
      });
    }

    const fileData = doc.output('datauristring');

    const report: any = {
      title: "AI Intake Report",
      description: "Automated symptom assessment and SOAP note generation.",
      findings: summary,
      type: "Pre-Assessment Note",
      reportType: 'ai_intake',
      uploadedBy: 'patient',
      fileName: `Intake_Report_${user.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
      fileData: fileData,
      demographics: { dob: user.dob || '', address: user.address || '', height: user.height || 0, weight: user.weight || 0, age: 30 },
      painMap: activePainMap
    };

    if (onAddReport) await onAddReport(report);

    setIsGeneratingReport(false);
    setIsChatOpen(false);
    setReportReady(false);
    setChatHistory([]);
    setActivePainMap([]);
  };

  const renderHome = () => (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Greeting Banner */}
      <div>
        <h1 className="text-[28px] font-semibold text-white tracking-tight">
          Hello, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-[14px] font-medium text-blue-100/80 mt-2">
          Your health overview is ready for review.
        </p>
      </div>

      {/* Active Pain Alert */}
      {activePainMap.length > 0 && (
        <div className="bg-white/95 backdrop-blur-md p-6 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4">
          <div className="flex items-center space-x-6">
            <div className="w-14 h-14 bg-rose-500 text-white rounded-[14px] flex items-center justify-center text-2xl shadow-lg shadow-rose-500/20">🌡️</div>
            <div>
              <h4 className="text-[18px] font-bold text-slate-900">Active Anatomical Map</h4>
              <p className="text-[14px] font-medium text-slate-500 mt-1">{activePainMap.length} regions requiring assessment.</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => { setChatType('intake'); setChatHistory([{ role: 'ai', text: `I've analyzed your body scan. You reported intensity at ${activePainMap.map(a => a.label).join(', ')}. When did these sensations begin?` }]); chatSessionRef.current = createClinicalIntakeSession(); setIsChatOpen(true); }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-[14px] text-[14px] font-bold hover:scale-[1.02] transition-all shadow-lg shadow-blue-500/30"
            >
              Start AI Intake
            </button>
            <button onClick={() => setActivePainMap([])} className="text-[14px] font-medium text-slate-400 hover:text-slate-600 px-4">Clear</button>
          </div>
        </div>
      )}

      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Body Mapping', img: '/card_body_scan-removebg-preview.png', color: 'bg-gradient-to-br from-[#4d6bfe] to-[#3b4bdf] text-white', sub: 'SPATIAL AI SCAN', buttonText: 'Start Scan', onClick: () => setIsBodyScanOpen(true) },
          { label: 'Clinical Intake', img: '/card_clinical_intake-removebg-preview.png', color: 'bg-gradient-to-br from-[#84b4fd] to-[#8cb9fd] text-slate-900', sub: 'SOAP NOTE PREP', buttonText: 'View Form', onClick: () => { setChatType('intake'); setChatHistory([{ role: 'ai', text: "Hello. I'll help gather clinical data for your doctor. What brings you in?" }]); chatSessionRef.current = createClinicalIntakeSession(); setIsChatOpen(true); } },
          { label: 'Symptom Triage', img: '/symptom-triage-removebg-preview.png', color: 'bg-gradient-to-br from-[#fbabc8] to-[#ff97b6] text-slate-900', sub: 'RISK ANALYSIS', buttonText: 'Start Triage', onClick: () => { setChatType('symptom'); setChatHistory([{ role: 'ai', text: "I'm the Cayr AI Triage Bot. What symptoms are you experiencing?" }]); chatSessionRef.current = createSymptomCheckerSession(); setIsChatOpen(true); } },
          { label: 'Interpreter', img: '/interpreter-removebg-preview.png', color: 'bg-gradient-to-br from-[#8f7bff] to-[#a08fff] text-slate-900', sub: 'LANGUAGE BRIDGE', buttonText: 'Launch Bridge', onClick: () => setIsBridgeOpen(true) },
        ].map((item, i) => (
          <div key={i} className={`p-6 rounded-[32px] ${item.color} shadow-[0_10px_40px_rgba(0,0,0,0.3)] text-left flex flex-col justify-between min-h-[300px] relative overflow-hidden group border border-white/40`}>
            <div className={`rounded-[24px] mb-4 h-48 flex items-center justify-center transition-all duration-500 overflow-hidden bg-white/10`}>
              <img src={item.img} alt={item.label} className="h-full scale-[1.2] object-contain filter drop-shadow-2xl translate-y-2 group-hover:scale-[1.2] group-hover:translate-y-0 transition-transform" />
            </div>

            <div className="z-10 relative">
              <p className={`text-[20px] font-black tracking-tight leading-tight uppercase ${item.color.includes('text-white') ? 'text-white' : 'text-slate-900'}`}>{item.label}</p>
              <p className={`text-[12px] font-black tracking-[0.1em] mt-1 mb-6 uppercase ${item.color.includes('text-white') ? 'text-white/80' : 'text-[#343434]'}`}>{item.sub}</p>

              <button onClick={item.onClick} className={`w-full py-5 rounded-[18px] flex items-center justify-between px-8 text-[14px] font-black transition-all shadow-lg ${item.color.includes('text-white')
                ? 'bg-white/20 hover:bg-white/30 backdrop-blur-md text-white'
                : 'bg-white/80 hover:bg-white text-slate-900'
                }`}>
                <span>{item.buttonText}</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Health Vitals Analytics Chart */}
          <div className="bg-white rounded-[32px] p-10 shadow-[0_10px_50px_rgba(0,0,0,0.1)] border border-white/40 overflow-hidden group">
            <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Health Calibration Vitals</h3>
                <p className="text-[14px] font-bold text-slate-400 mt-1">Today's Vitals Trends • Standard Analysis</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
                  <span className="text-xs font-black text-slate-900 uppercase tracking-widest">SYS 123</span>
                </div>
                <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
                  <span className="text-xs font-black text-slate-900 uppercase tracking-widest">DIA 82</span>
                </div>
              </div>
            </div>

            <div className="h-[280px] w-full mt-6 relative selection:bg-blue-100">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={Array.from({ length: 14 }, (_, i) => ({ day: i + 1, sys: 120 + Math.random() * 20, dia: 80 + Math.random() * 10 }))} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '20px',
                      border: 'none',
                      boxShadow: '0 15px 40px rgba(0,0,0,0.15)',
                      padding: '16px 20px',
                    }}
                    itemStyle={{
                      fontSize: '12px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sys"
                    stroke="#3b82f6"
                    strokeWidth={5}
                    fillOpacity={1}
                    fill="url(#colorSys)"
                  />
                  <Area
                    type="monotone"
                    dataKey="dia"
                    stroke="#f43f5e"
                    strokeWidth={5}
                    fillOpacity={1}
                    fill="url(#colorDia)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8 flex items-center justify-between p-6 bg-slate-50/50 rounded-[24px] border border-slate-100/50">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">💙</div>
                  <p className="text-[18px] font-black text-slate-900">123/82 <span className="text-xs text-slate-400 ml-1">mmHg</span></p>
                </div>
                <div className="h-8 w-[1px] bg-slate-200" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">❤️</div>
                  <p className="text-[18px] font-black text-slate-900">78 <span className="text-xs text-slate-400 ml-1">bpm</span></p>
                </div>
              </div>
              <div className="h-10 w-32 bg-slate-200/50 rounded-full overflow-hidden flex items-center justify-center">
                <div className="w-full h-1 bg-blue-500/30 relative">
                  <div className="absolute inset-y-0 left-0 w-[60%] bg-blue-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-10">
          <div className="bg-white rounded-[32px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/40 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8 px-2">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Next Visit</h3>
                <button onClick={() => setActiveTab('booking')} className="text-[12px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest">Book New</button>
              </div>

              {appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).slice(0, 1).map(apt => {
                const doc = MOCK_DOCTORS.find(d => d.id === apt.doctorId);
                return (
                  <div key={apt.id} className="p-6 bg-slate-50/50 rounded-[28px] border border-slate-100 mb-6 group/item hover:bg-white hover:shadow-xl hover:scale-[1.02] transition-all duration-500">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-[20px] overflow-hidden border-2 border-white shadow-sm ring-4 ring-blue-50/50">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doc?.name}`}
                          alt={doc?.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-black text-slate-900 truncate">Dr. {doc?.name || apt.doctorName}</p>
                        <p className="text-[13px] font-bold text-slate-400 mt-1">{apt.date} • {apt.time}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 group-hover/item:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => setActiveTab('reports')}
                className="w-full py-4 bg-slate-900 text-white rounded-[18px] text-[13px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95"
              >
                View Records
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/40">
            <div className="flex items-center justify-between mb-8 px-2">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Education</h3>
            </div>
            <div className="space-y-4">
              {[
                { title: 'Diabetes Management', icon: '📊', color: 'bg-emerald-50 text-emerald-600' },
                { title: 'Healthy Heart Diet', icon: '🥗', color: 'bg-rose-50 text-rose-600' },
              ].map((item, i) => (
                <div key={i} className="p-5 bg-white border border-slate-100 rounded-[24px] flex items-center justify-between group hover:border-blue-200 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-[16px] ${item.color.split(' ')[0]} flex items-center justify-center text-xl`}>{item.icon}</div>
                    <span className="text-[14px] font-black text-slate-700">{item.title}</span>
                  </div>
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBooking = () => (
    <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom-6 duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Clinical Scheduling</h2>
        <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Verified Specialists Available</p>
      </div>

      {isBookingSuccessful ? (
        <div className="p-12 bg-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-green-500/5" />
          <div className="relative z-10">
            <div className="w-20 h-20 bg-green-100 rounded-[14px] flex items-center justify-center text-4xl mx-auto mb-6 text-green-500 shadow-sm border border-green-200">✅</div>
            <h3 className="text-[24px] font-bold text-slate-900 tracking-tight">Appointment Sync Requested</h3>
            <p className="text-[14px] font-medium text-slate-500 mt-2">Your physician will confirm the session shortly.</p>
            <button onClick={() => { setIsBookingSuccessful(false); handleTabChange('dashboard'); }} className="mt-8 px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-[14px] font-bold shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] transition-all">Back to Home</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">1. Choose Specialist</p>
            <div className="space-y-4">
              {MOCK_DOCTORS.map(doc => (
                <button key={doc.id} onClick={() => setSelectedDoctorId(doc.id)} className={`w-full p-5 rounded-[16px] border ${selectedDoctorId === doc.id ? 'bg-blue-50/50 border-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'} transition-all text-left flex items-center space-x-5 group`}>
                  <div className="w-12 h-12 bg-slate-100 rounded-[12px] overflow-hidden flex-shrink-0"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.name}`} alt="" className="w-full h-full object-cover" /></div>
                  <div>
                    <p className="text-[16px] font-bold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">{doc.name}</p>
                    <p className="text-[12px] font-semibold text-blue-600 uppercase tracking-widest mt-1">{doc.specialty}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] space-y-8">
              <div className="space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-widest text-slate-500 ml-1">Visit Date</label>
                <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[14px] text-[15px] font-semibold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800" />
              </div>
              <div className="space-y-4">
                <label className="text-[12px] font-bold uppercase tracking-widest text-slate-500 ml-1">Time Slot</label>
                <div className="grid grid-cols-2 gap-3">
                  {['09:00 AM', '11:00 AM', '02:00 PM', '04:30 PM'].map(t => (
                    <button key={t} onClick={() => setBookingTime(t)} className={`py-4 rounded-[14px] text-[13px] font-bold uppercase tracking-widest border transition-all ${bookingTime === t ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
            <button
              disabled={!selectedDoctorId || !bookingDate || !bookingTime}
              onClick={() => { onBook(selectedDoctorId!, MOCK_DOCTORS.find(d => d.id === selectedDoctorId)!.name, bookingDate, bookingTime); setIsBookingSuccessful(true); }}
              className="w-full py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-[14px] font-bold text-[16px] shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 disabled:shadow-none"
            >
              Confirm Booking
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderFacilities = () => (
    <ClinicLabFinder />
  );

  const renderDoctors = () => {
    const filteredDoctors = MOCK_DOCTORS.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(doctorsSearchTerm.toLowerCase()) ||
        d.specialty.toLowerCase().includes(doctorsSearchTerm.toLowerCase());
      const matchesPincode = d.addressDetails?.zip.includes(doctorsPincodeTerm) || !doctorsPincodeTerm;
      return matchesSearch && matchesPincode;
    });

    return (
      <div className="space-y-10 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-[28px] font-semibold text-white tracking-tight">Find Specialists</h1>
            <p className="text-[14px] font-medium text-blue-100/60 mt-1">Search through our verified medical network</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Doctor or Specialty..."
                value={doctorsSearchTerm}
                onChange={(e) => setDoctorsSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/95 backdrop-blur-md rounded-[20px] text-[14px] font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-white/20 shadow-xl transition-all"
              />
            </div>
            <div className="relative w-full md:w-48">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">📍</span>
              <input
                type="text"
                placeholder="Pincode..."
                value={doctorsPincodeTerm}
                onChange={(e) => setDoctorsPincodeTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/95 backdrop-blur-md rounded-[20px] text-[14px] font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-white/20 shadow-xl transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDoctors.map(doc => (
            <div key={doc.id} className="bg-white rounded-[32px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/40 group hover:scale-[1.02] transition-all">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-[24px] overflow-hidden border-4 border-slate-50 shadow-sm transition-transform group-hover:scale-105">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.name}`} alt="" />
                </div>
                <div>
                  <h3 className="text-[18px] font-black text-slate-900 leading-tight">Dr. {doc.name}</h3>
                  <p className="text-[12px] font-black text-blue-600 uppercase tracking-widest mt-1">{doc.specialty}</p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-slate-500 font-bold text-[13px]">
                  <span>⭐ 4.9 (120+ reviews)</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 font-bold text-[13px]">
                  <span>📍 Medical Center East</span>
                </div>
              </div>
              <button
                onClick={() => { setSelectedDoctorId(doc.id); setActiveTab('booking'); }}
                className="w-full py-4 bg-slate-900 text-white rounded-[18px] text-[13px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10"
              >
                Schedule Appointment
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
      <div className="space-y-10 animate-in fade-in duration-700 h-[calc(100vh-200px)]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-[28px] font-semibold text-white tracking-tight">Messages</h1>
            <p className="text-[14px] font-medium text-blue-100/60 mt-1">Coordinate with your care team</p>
          </div>
        </div>

        <div className="bg-white rounded-[32px] shadow-[0_10px_50px_rgba(0,0,0,0.15)] overflow-hidden flex h-full border border-white/40">
          <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/30">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Recent Chats</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).map(a => (
                <button
                  key={a.id}
                  onClick={() => setChatSelectedId(a.id)}
                  className={`w-full p-4 rounded-2xl text-left border ${chatSelectedId === a.id ? 'bg-white border-blue-500 shadow-md shadow-blue-500/10' : 'bg-transparent border-transparent hover:bg-slate-100'} transition-all flex items-center gap-4`}
                >
                  <div className="w-12 h-12 rounded-[16px] bg-slate-200 overflow-hidden shrink-0"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Dr_${a.doctorName}`} alt="" /></div>
                  <div className="flex-1 min-w-0"><p className="text-[14px] font-bold text-slate-900 truncate">Dr. {a.doctorName}</p><p className="text-[12px] font-semibold text-blue-600 truncate">Tap to chat</p></div>
                </button>
              ))}
              {appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).length === 0 && (
                <div className="p-10 text-center opacity-40">
                  <p className="text-[10px] font-black uppercase tracking-widest">No active sessions</p>
                </div>
              )}
            </div>
          </div>

          {chatSelectedId ? (
            <div className="flex-1 flex flex-col pt-0">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[16px] bg-slate-100 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Dr_${activeChat?.doctorName}`} alt="" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black text-slate-900 leading-tight">Dr. {activeChat?.doctorName}</h3>
                    <p className="text-[12px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Online</p>
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

              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
                <div className="flex justify-center mb-8">
                  <span className="px-4 py-1.5 bg-white rounded-full text-[10px] font-bold text-slate-400 border border-slate-100 uppercase tracking-widest shadow-sm">
                    Today
                  </span>
                </div>

                {/* Simulated default message if confirmed */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 overflow-hidden shrink-0"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeChat?.doctorName}`} alt="" /></div>
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 max-w-[80%]">
                    <p className="text-xs font-bold text-slate-800">Hey, your appointment is successfully booked in this time ({activeChat?.time}) and date ({activeChat?.date}).</p>
                    <p className="text-[9px] font-black text-slate-300 mt-2 uppercase">10:00 AM</p>
                  </div>
                </div>

                {chatLocalMessages[chatSelectedId]?.map((msg) => (
                  <div key={msg.id} className={`flex gap-4 ${msg.senderId === user.id ? 'justify-end' : ''}`}>
                    {msg.senderId !== user.id && (
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 overflow-hidden shrink-0"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`} alt="" /></div>
                    )}
                    <div className={`${msg.senderId === user.id ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'} p-4 rounded-2xl shadow-sm max-w-[80%]`}>
                      <p className="text-xs font-bold">{msg.content}</p>
                      <p className={`text-[9px] font-black mt-2 uppercase ${msg.senderId === user.id ? 'text-blue-100' : 'text-slate-300'}`}>{msg.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-slate-100 bg-white">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={chatNewMessage}
                    onChange={(e) => setChatNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-[16px] px-6 py-4 text-[14px] font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-400"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 bg-white">
              <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-[32px] flex items-center justify-center text-4xl mb-8 shadow-2xl shadow-blue-500/10 animate-bounce">💬</div>
              <h3 className="text-2xl font-black text-slate-900">Secure Messaging Network</h3>
              <p className="text-[14px] font-bold text-slate-400 text-center mt-4 max-w-sm leading-relaxed">
                Select a care provider from the left to begin a HIPAA-compliant consultation thread.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 relative">

      {activeTab === 'dashboard' && renderHome()}
      {activeTab === 'booking' && renderBooking()}
      {activeTab === 'facilities' && renderFacilities()}
      {activeTab === 'doctors' && renderDoctors()}
      {activeTab === 'chat' && renderChat()}
      {activeTab === 'reports' && (
        <div className="space-y-10 animate-in fade-in duration-700">
          <div className="flex items-center gap-8 animate-in slide-in-from-left duration-700">
            <img src="/vault-removebg-preview.png" alt="Clinical Vault" className="h-24 w-24 md:h-28 md:w-28 object-contain filter drop-shadow-2xl" />
            <div>
              <h1 className="text-[32px] md:text-[40px] font-black text-white tracking-tight leading-none uppercase">Clinical Vault</h1>
              <p className="text-[14px] font-medium text-blue-100/60 mt-2 uppercase tracking-widest">Categorized clinical report network active</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Doctor Consultations */}
            <div className="bg-white rounded-[20px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex flex-col h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-[12px] flex items-center justify-center text-xl">👨‍⚕️</div>
                <div>
                  <h3 className="text-[18px] font-bold text-slate-900 leading-tight">Doctor Consultations</h3>
                  <p className="text-[14px] font-medium text-slate-500 mt-1">Verified clinical summaries</p>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                {medicalReports.filter(r => r.reportType === 'doctor_consultation').map(r => (
                  <div key={r.id} className="p-5 bg-white border border-slate-200 rounded-[16px] hover:border-indigo-300 hover:shadow-md transition-all group list-none">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-[15px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{r.title}</p>
                        <p className="text-[13px] font-medium text-slate-500 mt-1 truncate">Dr. {r.doctorName} • {r.date}</p>
                      </div>
                      <button
                        onClick={() => handleDownloadReport(r.fileData, r.fileName)}
                        className="w-10 h-10 shrink-0 bg-indigo-50 border border-indigo-100 rounded-[10px] flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
                {medicalReports.filter(r => r.reportType === 'doctor_consultation').length === 0 && (
                  <div className="py-12 text-center opacity-40 select-none">
                    <div className="text-4xl mb-4 grayscale">📭</div>
                    <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">No verified reports received.</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Pre-Assessments */}
            <div className="bg-white rounded-[20px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex flex-col h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-[12px] flex items-center justify-center text-xl">✨</div>
                <div>
                  <h3 className="text-[18px] font-bold text-slate-900 leading-tight">AI Pre-Assessments</h3>
                  <p className="text-[14px] font-medium text-slate-500 mt-1">Automated intake notes</p>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                {medicalReports.filter(r => r.reportType === 'ai_intake').map(r => (
                  <div key={r.id} className="p-5 bg-white border border-slate-200 rounded-[16px] hover:border-emerald-300 hover:shadow-md transition-all group list-none">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-[15px] font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">{r.title}</p>
                        <p className="text-[13px] font-medium text-slate-500 mt-1 truncate">AI Clinical Scribe • {r.date}</p>
                      </div>
                      <button
                        onClick={() => handleDownloadReport(r.fileData, r.fileName)}
                        className="w-10 h-10 shrink-0 bg-emerald-50 border border-emerald-100 rounded-[10px] flex items-center justify-center text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
                {medicalReports.filter(r => r.reportType === 'ai_intake').length === 0 && (
                  <div className="py-12 text-center opacity-40 select-none">
                    <div className="text-4xl mb-4 grayscale">🛸</div>
                    <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Initialize an AI intake session to generate reports.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'pharmacy' && <Pharmacy />}

      {/* ── Analytics ── */}
      {activeTab === 'analytics' && (() => {
        const confirmedAppts = appointments.filter(a => a.status === AppointmentStatus.CONFIRMED);
        const pendingAppts = appointments.filter(a => a.status === AppointmentStatus.PENDING);
        const cancelledAppts = appointments.filter(a => a.status === AppointmentStatus.CANCELLED);
        const trendData = Array.from({ length: 6 }, (_, i) => ({
          month: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'][i],
          visits: Math.floor(Math.random() * 8) + 1,
          bp: 110 + Math.floor(Math.random() * 25),
          hr: 68 + Math.floor(Math.random() * 18),
        }));
        return (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex items-center gap-8 animate-in slide-in-from-left duration-700">
              <img src="/analytics-removebg-preview.png" alt="Analytics" className="h-24 w-24 md:h-28 md:w-28 object-contain filter drop-shadow-2xl" />
              <div>
                <h1 className="text-[32px] md:text-[40px] font-black text-white tracking-tight leading-none uppercase">Health Analytics</h1>
                <p className="text-[14px] font-medium text-blue-100/60 mt-2 uppercase tracking-widest">Deep longitudinal data mining active</p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { label: 'Total Visits', value: appointments.length, icon: '📅', color: 'text-blue-600' },
                { label: 'Confirmed', value: confirmedAppts.length, icon: '✅', color: 'text-emerald-600' },
                { label: 'Pending', value: pendingAppts.length, icon: '⏳', color: 'text-amber-600' },
                { label: 'Cancelled', value: cancelledAppts.length, icon: '❌', color: 'text-rose-600' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-[20px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex flex-col">
                  <span className="text-xl mb-3">{s.icon}</span>
                  <p className={`text-[24px] font-bold ${s.color} leading-none`}>{s.value}</p>
                  <p className="text-[13px] font-medium text-slate-500 mt-2">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
              <div className="bg-white rounded-[20px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex flex-col h-full">
                <h3 className="text-[18px] font-bold text-slate-900 mb-1">Visit Frequency</h3>
                <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-6">Last 6 months</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="vf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b5bfd" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b5bfd" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="visits" stroke="#3b5bfd" strokeWidth={2.5} fill="url(#vf)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-[20px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex flex-col h-full">
                <h3 className="text-[18px] font-bold text-slate-900 mb-1">Blood Pressure Trend</h3>
                <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-6">Systolic (mmHg)</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="bp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff5c6c" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#ff5c6c" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="bp" stroke="#ff5c6c" strokeWidth={2.5} fill="url(#bp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Appointment list */}
            <div className="bg-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] overflow-hidden">
              <div className="p-6 border-b border-slate-50">
                <h2 className="text-[18px] font-bold text-slate-900">Appointment History</h2>
              </div>
              {appointments.length === 0 ? (
                <div className="p-16 text-center text-slate-400 font-semibold uppercase text-[12px] tracking-widest">No appointments recorded</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {appointments.map((a, i) => {
                    const colors: Record<string, string> = {
                      [AppointmentStatus.CONFIRMED]: 'bg-green-100 text-green-700',
                      [AppointmentStatus.PENDING]: 'bg-amber-100 text-amber-700',
                      [AppointmentStatus.CANCELLED]: 'bg-rose-100 text-rose-700',
                      [AppointmentStatus.COMPLETED]: 'bg-slate-100 text-slate-600',
                    };
                    return (
                      <div key={a.id ?? i} className="flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-[15px] font-bold text-slate-900">{a.doctorName || 'Dr. —'}</p>
                          <p className="text-[13px] font-medium text-slate-500 mt-1">{a.date} • {a.time}</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-[12px] text-[12px] font-bold ${colors[a.status] ?? 'bg-slate-100 text-slate-500'}`}>{a.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Payments ── */}
      {activeTab === 'payments' && (() => {
        const total = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
        return (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex items-center gap-8 animate-in slide-in-from-left duration-700">
              <img src="/payments-removebg-preview.png" alt="Payments" className="h-24 w-24 md:h-28 md:w-28 object-contain filter drop-shadow-2xl" />
              <div>
                <h1 className="text-[32px] md:text-[40px] font-black text-white tracking-tight leading-none uppercase">Payment History</h1>
                <p className="text-[14px] font-medium text-blue-100/60 mt-2 uppercase tracking-widest">Encrypted transaction ledger secure</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Total Spent', value: `$${total.toLocaleString()}`, icon: '💳', color: 'text-white', bg: 'bg-gradient-to-r from-slate-800 to-slate-900' },
                { label: 'Transactions', value: payments.length, icon: '🧾', color: 'text-blue-600', bg: 'bg-white' },
                { label: 'Pending Bills', value: payments.filter(p => (p.status as any) === 'PENDING' || p.status === 'pending').length, icon: '⏳', color: 'text-amber-600', bg: 'bg-white' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} rounded-[20px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex flex-col justify-center`}>
                  <span className="text-xl mb-3">{s.icon}</span>
                  <p className={`text-[24px] font-bold ${s.color} leading-none`}>{s.value}</p>
                  <p className={`text-[13px] font-medium mt-2 ${s.color === 'text-white' ? 'text-white/60' : 'text-slate-500'}`}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] overflow-hidden">
              <div className="p-6 border-b border-slate-50">
                <h2 className="text-[18px] font-bold text-slate-900">Transaction Ledger</h2>
              </div>
              {payments.length === 0 ? (
                <div className="p-16 text-center text-slate-400 font-semibold uppercase text-[12px] tracking-widest">No transactions yet</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {payments.map((p, i) => (
                    <div key={(p as any).id ?? i} className="flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-[15px] font-bold text-slate-900">{(p as any).description || (p as any).doctorName || `Transaction #${i + 1}`}</p>
                        <p className="text-[13px] font-medium text-slate-500 mt-1">{(p as any).date || 'Recent'}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className={`px-4 py-1.5 rounded-[12px] text-[12px] font-bold ${(p.status === 'PENDING' || p.status === 'pending') ? 'bg-amber-50 text-amber-600' : (p.status === 'FAILED' || p.status === 'failed') ? 'bg-rose-50 text-rose-600' : 'bg-green-50 text-green-600'}`}>
                          {p.status ?? 'Completed'}
                        </span>
                        <span className="text-[18px] font-bold text-slate-900">${(p.amount ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}


      {/* Body Scanner Modal */}
      {isBodyScanOpen && (
        <BodyScanner
          onCancel={() => setIsBodyScanOpen(false)}
          onConfirm={(areas) => {
            setActivePainMap(areas);
            setIsBodyScanOpen(false);
          }}
        />
      )}

      {/* AI Modals */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[3000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="max-w-md w-full h-[700px] bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className={`p-6 ${chatType === 'symptom' ? 'bg-slate-900' : 'bg-gradient-to-r from-blue-500 to-indigo-600'} text-white flex justify-between items-center`}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-[14px] flex items-center justify-center font-bold text-xl">✨</div>
                <div>
                  <p className="font-bold text-[16px] tracking-tight">{chatType === 'intake' ? 'Clinical Assistant' : 'AI Triage'}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80 mt-0.5">Secure AI Session</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all font-bold">✕</button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 scrollbar-hide">
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] p-4 rounded-[20px] text-[14px] leading-relaxed font-semibold shadow-sm ${m.role === 'user' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-tr-sm shadow-indigo-500/20' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isTyping && <div className="text-[11px] font-bold uppercase text-blue-500 animate-pulse tracking-widest ml-1">Cayr AI is analyzing input...</div>}
            </div>
            <div className="p-6 bg-white border-t border-slate-100 space-y-4">
              {reportReady && (
                <button
                  disabled={isGeneratingReport}
                  onClick={handleCreateReport}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-[14px] font-bold uppercase text-[12px] tracking-wider shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all"
                >
                  {isGeneratingReport ? 'Compiling Medical SOAP Note...' : 'Finalize Intake Report'}
                </button>
              )}
              <form onSubmit={handleSendMessage} className="flex space-x-3">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Provide clinical details..." className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-[16px] text-[14px] font-semibold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800" />
                <button type="submit" disabled={isTyping || !chatInput.trim()} className="w-14 h-auto bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-[16px] flex items-center justify-center shadow-lg hover:shadow-indigo-500/30 active:scale-95 transition-all group disabled:opacity-50 disabled:grayscale">
                  <span className="group-hover:translate-x-1 transition-transform font-bold">➜</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isBridgeOpen && <MultilingualBridge partnerName="Indian Clinical Network" onClose={() => setIsBridgeOpen(false)} />}
    </div>
  );
};

export default PatientDashboard;
