
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
  onBook: (doctorId: string, doctorName: string, date: string, time: string) => Promise<boolean>;
  onAddReport: (report: MedicalReport) => void;
  onOpenChat?: (appointmentId: string) => void;
  onUploadPrescription: (prescription: Prescription) => void;
  view: 'dashboard' | 'analytics' | 'payments' | 'reports' | 'reminders' | 'facilities' | 'booking' | 'pharmacy' | 'doctors' | 'chat';
  onSubViewChange?: (view: string) => void;
  doctors?: User[];
}

const PatientDashboard: React.FC<PatientDashboardProps> = ({
  user,
  appointments,
  medicalReports,
  prescriptions,
  payments,
  doctors = [],
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

  // Education Modal
  const [educationModalContent, setEducationModalContent] = useState<{ title: string, content: string } | null>(null);

  // State for Doctors view
  const [doctorsSearchTerm, setDoctorsSearchTerm] = useState('');
  const [doctorsPincodeTerm, setDoctorsPincodeTerm] = useState('');
  const [remoteDoctors, setRemoteDoctors] = useState<User[]>([]);

  // State for Reports view
  const [reportsSearchTerm, setReportsSearchTerm] = useState('');
  const [remoteReports, setRemoteReports] = useState<MedicalReport[] | null>(null);

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
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isPredictingSpeech, setIsPredictingSpeech] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  // Fetch doctors dynamically with search parameters
  useEffect(() => {
    if (activeTab === 'doctors' || activeTab === 'booking') {
      const queryParams = new URLSearchParams({ role: 'doctor' });
      if (doctorsSearchTerm) {
        queryParams.append('search', doctorsSearchTerm);
      }

      fetch(`/api/users?${queryParams.toString()}`, { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setRemoteDoctors(data);
          }
        })
        .catch(console.error);
    }
  }, [activeTab, doctorsSearchTerm]);

  // Fetch reports dynamically with search parameters
  useEffect(() => {
    if (activeTab === 'reports') {
      const queryParams = new URLSearchParams();
      if (reportsSearchTerm) {
        queryParams.append('search', reportsSearchTerm);

        fetch(`/api/reports/patient?${queryParams.toString()}`, { credentials: 'include' })
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) {
              setRemoteReports(data.map((r: any) => ({ ...r, id: r._id })));
            }
          })
          .catch(console.error);
      } else {
        setRemoteReports(null);
      }
    }
  }, [activeTab, reportsSearchTerm]);

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    onSubViewChange?.(tab);
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory, isTyping]);

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

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLocalMessages, chatSelectedId]);

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
        <h1 className="text-[28px] font-semibold text-[#1C2B39] tracking-tight">
          Hello, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-[14px] font-medium text-[#6B7C8F] mt-2">
          Your health overview is ready for review.
        </p>
      </div>

      {/* Active Pain Alert */}
      {activePainMap.length > 0 && (
        <div className="bg-[#FFFFFF] p-6 rounded-[16px] shadow-[0_8px_30px_rgba(15,42,67,0.12)] border border-[#E3EAF2] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4">
          <div className="flex items-center space-x-6">
            <div className="w-14 h-14 bg-[#F4F7FB] border border-[#D6E0EB] text-[#1F4E79] rounded-[12px] flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 20h9M12 4v16M16 16l-4 4-4-4M16 8l-4-4-4 4" /></svg>
            </div>
            <div>
              <h4 className="text-[18px] font-semibold text-[#1C2B39]">Active Anatomical Map</h4>
              <p className="text-[14px] font-medium text-[#6B7C8F] mt-1">{activePainMap.length} regions requiring assessment.</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => { setChatType('intake'); setChatHistory([{ role: 'ai', text: `I've analyzed your body scan. You reported intensity at ${activePainMap.map(a => a.label).join(', ')}. When did these sensations begin?` }]); chatSessionRef.current = createClinicalIntakeSession(); setIsChatOpen(true); }}
              className="px-6 py-3 bg-[#1F4E79] text-[#FFFFFF] rounded-[8px] text-[14px] font-semibold hover:bg-[#163A5C] transition-colors shadow-sm"
            >
              Start AI Intake
            </button>
            <button onClick={() => setActivePainMap([])} className="text-[14px] font-medium text-[#6B7C8F] hover:text-[#1C2B39] transition-colors px-4">Clear</button>
          </div>
        </div>
      )}

      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Body Mapping', img: '/card_body_scan-removebg-preview.png', sub: 'SPATIAL AI SCAN', buttonText: 'Start Scan', onClick: () => setIsBodyScanOpen(true) },
          { label: 'Clinical Intake', img: '/card_clinical_intake-removebg-preview.png', sub: 'SOAP NOTE PREP', buttonText: 'View Form', onClick: () => { setChatType('intake'); setChatHistory([{ role: 'ai', text: "Hello. I'll help gather clinical data for your doctor. What brings you in?" }]); chatSessionRef.current = createClinicalIntakeSession(); setIsChatOpen(true); } },
          { label: 'Symptom Triage', img: '/symptom-triage-removebg-preview.png', sub: 'RISK ANALYSIS', buttonText: 'Start Triage', onClick: () => { setChatType('symptom'); setChatHistory([{ role: 'ai', text: "I'm the Cayr AI Triage Bot. What symptoms are you experiencing?" }]); chatSessionRef.current = createSymptomCheckerSession(); setIsChatOpen(true); } },
          { label: 'Interpreter', img: '/interpreter-removebg-preview.png', sub: 'LANGUAGE BRIDGE', buttonText: 'Launch Bridge', onClick: () => setIsBridgeOpen(true) },
        ].map((item, i) => (
          <div key={i} className="bg-[#FFFFFF] p-6 rounded-[14px] shadow-[0_8px_30px_rgba(15,42,67,0.12)] border border-[#E3EAF2] text-left flex flex-col justify-between min-h-[300px] relative overflow-hidden group hover:shadow-[0_8px_30px_rgba(15,42,67,0.18)] transition-shadow">
            <div className="rounded-[14px] mb-4 h-40 flex items-center justify-center transition-all bg-[#F4F7FB] border border-[#E3EAF2] group-hover:bg-[#EAF1F8] overflow-hidden">
              <img src={item.img} alt={item.label} className="h-full scale-[1.2] object-contain translate-y-2 group-hover:scale-[1.2] group-hover:translate-y-0 transition-transform" />
            </div>

            <div className="z-10 relative">
              <p className="text-[20px] font-semibold tracking-tight leading-tight text-[#1C2B39]">{item.label}</p>
              <p className="text-[12px] font-medium tracking-wide mt-1 mb-6 uppercase text-[#6B7C8F]">{item.sub}</p>

              <button onClick={item.onClick} className="w-full py-3 rounded-[8px] flex items-center justify-between px-6 text-[14px] font-semibold transition-colors bg-[#F0F4F9] text-[#1F4E79] hover:bg-[#E3EAF2] border border-[#D6E0EB]">
                <span>{item.buttonText}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Health Vitals Analytics Chart */}
          <div className="bg-[#FFFFFF] rounded-[16px] p-8 shadow-[0_8px_30px_rgba(15,42,67,0.12)] border border-[#E3EAF2] overflow-hidden group">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
              <div>
                <h3 className="text-[20px] font-semibold text-[#1C2B39] tracking-tight">Health Calibration Vitals</h3>
                <p className="text-[14px] font-medium text-[#6B7C8F] mt-1">Today's Vitals Trends • Standard Analysis</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-[#F4F7FB] px-4 py-2 rounded-lg border border-[#D6E0EB] flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1F4E79]" />
                  <span className="text-[11px] font-semibold text-[#1C2B39] uppercase tracking-wide">SYS 123</span>
                </div>
                <div className="bg-[#F4F7FB] px-4 py-2 rounded-lg border border-[#D6E0EB] flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#5C6B7A]" />
                  <span className="text-[11px] font-semibold text-[#1C2B39] uppercase tracking-wide">DIA 82</span>
                </div>
              </div>
            </div>

            <div className="h-[280px] w-full mt-6 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={Array.from({ length: 14 }, (_, i) => ({ day: i + 1, sys: 120 + Math.random() * 20, dia: 80 + Math.random() * 10 }))} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1F4E79" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1F4E79" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5C6B7A" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#5C6B7A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EEF5" vertical={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #D6E0EB',
                      boxShadow: '0 4px 14px rgba(16, 42, 67, 0.06)',
                      padding: '12px 16px',
                    }}
                    itemStyle={{
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#1C2B39'
                    }}
                  />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#7A8B9C', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7A8B9C', fontSize: 12 }} dx={-10} />
                  <Area
                    type="monotone"
                    dataKey="sys"
                    stroke="#1F4E79"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorSys)"
                  />
                  <Area
                    type="monotone"
                    dataKey="dia"
                    stroke="#5C6B7A"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorDia)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8 flex items-center justify-between p-5 bg-[#F4F7FB] rounded-[12px] border border-[#E3EAF2]">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E8F1FA] flex items-center justify-center text-[#1F4E79]">💙</div>
                  <p className="text-[16px] font-semibold text-[#1C2B39]">123/82 <span className="text-[12px] font-normal text-[#6B7C8F] ml-1">mmHg</span></p>
                </div>
                <div className="h-6 w-[1px] bg-[#D6E0EB]" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E8F1FA] flex items-center justify-center text-[#1F4E79]">❤️</div>
                  <p className="text-[16px] font-semibold text-[#1C2B39]">78 <span className="text-[12px] font-normal text-[#6B7C8F] ml-1">bpm</span></p>
                </div>
              </div>
              <div className="h-2 w-32 bg-[#D6E0EB] rounded-full overflow-hidden flex items-center justify-center">
                <div className="w-full h-full bg-[#E8EEF5] relative">
                  <div className="absolute inset-y-0 left-0 w-[60%] bg-[#1F4E79] rounded-full" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] rounded-[16px] p-6 shadow-[0_8px_30px_rgba(15,42,67,0.12)] border border-[#E3EAF2]">
            <div className="flex items-center justify-between mb-6 px-1">
              <h3 className="text-[16px] font-semibold text-[#1C2B39]">Next Visit</h3>
              <button onClick={() => setActiveTab('booking')} className="text-[12px] font-medium text-[#1F4E79] hover:text-[#163A5C] transition-colors">Book New</button>
            </div>

            {appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).slice(0, 1).map(apt => {
              const doc = remoteDoctors.length > 0 ? remoteDoctors.find(d => d.id === apt.doctorId) : doctors.find(d => d.id === apt.doctorId);
              return (
                <div key={apt.id} className="p-4 bg-[#F4F7FB] rounded-[12px] border border-[#E3EAF2] mb-5 group/item hover:bg-[#FFFFFF] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[10px] overflow-hidden border border-[#D6E0EB]">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doc?.name || apt.doctorName}`}
                        alt={doc?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#1C2B39] truncate">Dr. {doc?.name || apt.doctorName}</p>
                      <p className="text-[12px] font-medium text-[#6B7C8F] mt-0.5">{apt.date} • {apt.time}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => setActiveTab('reports')}
              className="w-full py-3 bg-[#1F4E79] text-[#FFFFFF] rounded-[8px] text-[13px] font-semibold hover:bg-[#163A5C] transition-colors shadow-sm"
            >
              View Records
            </button>
          </div>

          <div className="bg-[#FFFFFF] rounded-[16px] p-6 shadow-[0_8px_30px_rgba(15,42,67,0.12)] border border-[#E3EAF2]">
            <div className="mb-6 px-1">
              <h3 className="text-[16px] font-semibold text-[#1C2B39]">Education</h3>
            </div>
            <div className="space-y-3">
              {[
                {
                  title: 'Diabetes Management',
                  icon: '📊',
                  content: 'Diabetes is a chronic condition that affects how your body turns food into energy. Management involves maintaining a healthy diet (focus on whole grains, vegetables, and lean proteins), regular physical activity, monitoring blood sugar levels, and taking prescribed medication like insulin or oral diabetes medicines. Regular check-ups are essential to prevent complications such as heart disease or vision problems.'
                },
                {
                  title: 'Healthy Heart Diet',
                  icon: '🥗',
                  content: 'A heart-healthy diet emphasizes fruits, vegetables, and whole grains while limiting saturated fats, sodium, and added sugars. Key recommendations include: eating fish rich in omega-3 fatty acids at least twice a week, choosing skinless poultry and lean meats, opting for fat-free or low-fat dairy products, and avoiding trans fats often found in processed foods. Controlling portion sizes is also crucial for maintaining a healthy weight.'
                },
              ].map((item, i) => (
                <div
                  key={i}
                  onClick={() => setEducationModalContent({ title: item.title, content: item.content })}
                  className="p-4 bg-[#FFFFFF] border border-[#E3EAF2] rounded-[12px] flex items-center justify-between group hover:border-[#D6E0EB] hover:bg-[#F4F7FB] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[8px] bg-[#E8F1FA] flex items-center justify-center text-lg">{item.icon}</div>
                    <span className="text-[13px] font-medium text-[#1C2B39]">{item.title}</span>
                  </div>
                  <svg className="w-4 h-4 text-[#9FB3C8] group-hover:text-[#1F4E79] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBooking = () => (
    <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-6 duration-500">
      <div className="text-center">
        <h2 className="text-[28px] font-semibold tracking-tight text-[#1C2B39]">Clinical Scheduling</h2>
        <p className="text-[14px] font-medium text-[#6B7C8F] mt-2">Verified Specialists Available</p>
      </div>

      {isBookingSuccessful ? (
        <div className="p-10 bg-[#FFFFFF] rounded-[16px] border border-[#E3EAF2] shadow-[0_8px_30px_rgba(15,42,67,0.12)] text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[#F4F7FB]/50" />
          <div className="relative z-10">
            <div className="w-16 h-16 bg-[#E8F1FA] rounded-[12px] flex items-center justify-center text-3xl mx-auto mb-6 text-[#1F4E79] shadow-sm border border-[#D6E0EB]">✅</div>
            <h3 className="text-[22px] font-semibold text-[#1C2B39] tracking-tight">Appointment Sync Requested</h3>
            <p className="text-[14px] font-medium text-[#6B7C8F] mt-2">Your physician will confirm the session shortly.</p>
            <button onClick={() => { setIsBookingSuccessful(false); handleTabChange('dashboard'); }} className="mt-8 px-8 py-3 bg-[#1F4E79] text-[#FFFFFF] rounded-[8px] font-semibold shadow-sm hover:bg-[#163A5C] transition-colors">Back to Home</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7C8F] ml-1">1. Choose Specialist</p>
            <div className="space-y-4">
              {(remoteDoctors.length > 0 ? remoteDoctors : doctors).map(doc => (
                <button key={doc.id} onClick={() => setSelectedDoctorId(doc.id)} className={`w-full p-4 rounded-[12px] border ${selectedDoctorId === doc.id ? 'bg-[#F0F4F9] border-[#1F4E79] shadow-sm' : 'bg-[#FFFFFF] border-[#E3EAF2] hover:bg-[#F4F7FB]'} transition-colors text-left flex items-center space-x-4 group`}>
                  <div className="w-12 h-12 bg-[#F4F7FB] rounded-[10px] overflow-hidden flex-shrink-0 border border-[#D6E0EB]"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.name}`} alt="" className="w-full h-full object-cover" /></div>
                  <div>
                    <p className={`text-[15px] font-semibold leading-tight transition-colors ${selectedDoctorId === doc.id ? 'text-[#1F4E79]' : 'text-[#1C2B39] group-hover:text-[#1F4E79]'}`}>{doc.name}</p>
                    <p className="text-[12px] font-medium text-[#6B7C8F] mt-0.5">{doc.profile?.specialization || doc.specialty || 'General'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-8">
            <div className="bg-[#FFFFFF] p-8 rounded-[16px] shadow-[0_8px_30px_rgba(15,42,67,0.12)] border border-[#E3EAF2] space-y-8">
              <div className="space-y-2">
                <label className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7C8F] ml-1">Visit Date</label>
                <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full p-4 bg-[#F4F7FB] border border-[#D6E0EB] rounded-[10px] text-[14px] font-medium outline-none focus:bg-[#FFFFFF] focus:border-[#1F4E79] transition-colors text-[#1C2B39]" />
                {selectedDoctorId && (remoteDoctors.length > 0 ? remoteDoctors : doctors).find(d => d.id === selectedDoctorId)?.profile?.availableDays?.length > 0 && (
                  <p className="text-[11px] font-medium text-[#1F4E79] ml-1 mt-1">
                    Available Days: {(remoteDoctors.length > 0 ? remoteDoctors : doctors).find(d => d.id === selectedDoctorId)?.profile?.availableDays.join(', ')}
                  </p>
                )}
              </div>
              <div className="space-y-4">
                <label className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7C8F] ml-1">Time Slot</label>
                <div className="grid grid-cols-2 gap-3">
                  {(() => {
                    const selectedDoc = (remoteDoctors.length > 0 ? remoteDoctors : doctors).find(d => d.id === selectedDoctorId);
                    const slots = selectedDoc?.profile?.availableTimeSlots?.length > 0
                      ? selectedDoc.profile.availableTimeSlots
                      : ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '14:00 - 15:00'];
                    return slots.map(t => (
                      <button key={t} onClick={() => setBookingTime(t)} className={`py-3 rounded-[8px] text-[13px] font-semibold transition-colors border ${bookingTime === t ? 'bg-[#1F4E79] text-[#FFFFFF] border-[#1F4E79] shadow-sm' : 'bg-[#FFFFFF] text-[#6B7C8F] border-[#E3EAF2] hover:border-[#D6E0EB] hover:bg-[#F4F7FB]'}`}>{t}</button>
                    ));
                  })()}
                </div>
              </div>
            </div>
            <button
              disabled={!selectedDoctorId || !bookingDate || !bookingTime}
              onClick={async () => {
                const docList = remoteDoctors.length > 0 ? remoteDoctors : doctors;
                const isSuccess = await onBook(selectedDoctorId!, docList.find(d => d.id === selectedDoctorId)!.name, bookingDate, bookingTime);
                if (isSuccess !== false) setIsBookingSuccessful(true);
              }}
              className="w-full py-4 bg-[#1F4E79] text-[#FFFFFF] rounded-[8px] font-semibold text-[15px] shadow-sm hover:bg-[#163A5C] transition-colors disabled:opacity-50 disabled:bg-[#D6E0EB] disabled:cursor-not-allowed disabled:text-[#6B7C8F] disabled:shadow-none"
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
    // Determine the source of doctors: remote API or mock fallback
    const sourceDoctors = remoteDoctors.length > 0 ? remoteDoctors : doctors;

    // Filter purely frontend for pincode since backend doesn't support it yet
    const filteredDoctors = sourceDoctors.filter(d => {
      const zip = d.profile?.address?.zip || d.addressDetails?.zip || '';
      const matchesPincode = String(zip).includes(doctorsPincodeTerm) || !doctorsPincodeTerm;
      return matchesPincode;
    });

    return (
      <div className="space-y-10 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-[28px] font-semibold text-[#1C2B39] tracking-tight">Find Specialists</h1>
            <p className="text-[14px] font-medium text-[#6B7C8F] mt-1">Search through our verified medical network</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#9FB3C8]">🔍</span>
              <input
                type="text"
                placeholder="Doctor or Specialty..."
                value={doctorsSearchTerm}
                onChange={(e) => setDoctorsSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-[#FFFFFF] border border-[#E3EAF2] rounded-[12px] text-[14px] font-medium text-[#1C2B39] outline-none focus:border-[#1F4E79] shadow-sm transition-colors"
              />
            </div>
            <div className="relative w-full md:w-48">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#9FB3C8]">📍</span>
              <input
                type="text"
                placeholder="Pincode..."
                value={doctorsPincodeTerm}
                onChange={(e) => setDoctorsPincodeTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-[#FFFFFF] border border-[#E3EAF2] rounded-[12px] text-[14px] font-medium text-[#1C2B39] outline-none focus:border-[#1F4E79] shadow-sm transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDoctors.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <div className="w-20 h-20 bg-[#F4F7FB] rounded-[16px] text-3xl mx-auto flex items-center justify-center border border-[#D6E0EB] mb-4 grayscale opacity-50">👨‍⚕️</div>
              <p className="text-[16px] font-semibold text-[#1C2B39]">No specialists found</p>
              <p className="text-[13px] font-medium text-[#6B7C8F] mt-1">Try adjusting your search criteria</p>
            </div>
          ) : filteredDoctors.map(doc => (
            <div key={doc.id} className="bg-[#FFFFFF] rounded-[16px] p-6 shadow-[0_8px_30px_rgba(15,42,67,0.12)] border border-[#E3EAF2] group hover:border-[#D6E0EB] transition-colors">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 rounded-[12px] overflow-hidden border border-[#D6E0EB]">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.name}`} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#1C2B39] leading-tight">Dr. {doc.name}</h3>
                  <p className="text-[12px] font-medium text-[#6B7C8F] mt-0.5">{doc.profile?.specialization || doc.specialty || 'General'}</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-[#1C2B39] font-medium text-[13px]">
                  <span>⭐ 4.9 <span className="text-[#6B7C8F]">(120+ reviews)</span></span>
                </div>
                <div className="flex items-center gap-3 text-[#6B7C8F] font-medium text-[13px]">
                  <span>📍 {doc.profile?.address?.city || 'Medical Center East'}</span>
                </div>
              </div>
              <button
                onClick={() => { setSelectedDoctorId(doc.id); setActiveTab('booking'); }}
                className="w-full py-3 bg-[#F0F4F9] text-[#1F4E79] rounded-[8px] text-[13px] font-semibold hover:bg-[#E3EAF2] border border-[#D6E0EB] transition-colors"
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
        // We let the interval or next render fetch it, or optimistically append
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
        setChatNewMessage(text); // revert
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-700 h-[calc(100vh-140px)]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-[24px] font-semibold text-[#1C2B39] tracking-tight">Messages</h1>
            <p className="text-[14px] font-medium text-[#6B7C8F] mt-1">Coordinate with your care team</p>
          </div>
        </div>

        <div className="bg-[#FFFFFF] rounded-[16px] shadow-[0_8px_30px_rgba(15,42,67,0.12)] border border-[#E3EAF2] overflow-hidden flex h-[calc(100%-80px)]">
          <div className="w-80 border-r border-[#E3EAF2] flex flex-col bg-[#F4F7FB]/50">
            <div className="p-5 border-b border-[#E3EAF2]">
              <h3 className="text-[12px] font-semibold text-[#6B7C8F] uppercase tracking-wide">Recent Chats</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).map(a => (
                <button
                  key={a.id}
                  onClick={() => setChatSelectedId(a.id)}
                  className={`w-full p-4 rounded-[12px] text-left border ${chatSelectedId === a.id ? 'bg-[#FFFFFF] border-[#1F4E79] shadow-sm' : 'bg-transparent border-transparent hover:bg-[#E3EAF2]/50'} transition-colors flex items-center gap-4`}
                >
                  <div className="w-12 h-12 rounded-[10px] bg-[#E8F1FA] overflow-hidden shrink-0 border border-[#D6E0EB]"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Dr_${a.doctorName}`} alt="" className="w-full h-full object-cover" /></div>
                  <div className="flex-1 min-w-0"><p className="text-[14px] font-semibold text-[#1C2B39] truncate">Dr. {a.doctorName}</p><p className="text-[12px] font-medium text-[#1F4E79] truncate mt-0.5">Tap to chat</p></div>
                </button>
              ))}
              {appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).length === 0 && (
                <div className="p-10 text-center opacity-60">
                  <p className="text-[12px] font-semibold text-[#6B7C8F]">No active sessions</p>
                </div>
              )}
            </div>
          </div>

          {chatSelectedId ? (
            <div className="flex-1 flex flex-col pt-0 bg-[#FFFFFF]">
              <div className="p-5 border-b border-[#E3EAF2] flex justify-between items-center bg-[#FFFFFF]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[10px] bg-[#F4F7FB] overflow-hidden border border-[#D6E0EB]">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Dr_${activeChat?.doctorName}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-semibold text-[#1C2B39] leading-tight">Dr. {activeChat?.doctorName}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                      <p className="text-[12px] font-medium text-[#6B7C8F]">Online</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      if (!chatSelectedId) return;
                      try {
                        const res = await fetch(`/api/chats/${chatSelectedId}/notify-video`, { method: 'POST', credentials: 'include' });
                        if (res.ok) alert(`Video consultation request sent to Dr. ${activeChat?.doctorName}`);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    title="Request Video Consultation"
                    className="p-2.5 bg-rose-50 text-rose-600 rounded-[8px] hover:bg-rose-100 transition-colors border border-rose-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>
                  <button
                    onClick={() => setIsBridgeOpen(true)}
                    title="Launch Voice Interpreter"
                    className="p-2.5 bg-[#F0F4F9] text-[#1F4E79] rounded-[8px] hover:bg-[#E3EAF2] transition-colors border border-[#D6E0EB]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F4F7FB]/30">
                <div className="flex justify-center mb-6">
                  <span className="px-3 py-1 bg-[#FFFFFF] rounded-full text-[11px] font-medium text-[#6B7C8F] border border-[#E3EAF2]">
                    Today
                  </span>
                </div>

                {/* Simulated default message if confirmed */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-[8px] bg-[#F4F7FB] overflow-hidden shrink-0 border border-[#D6E0EB]"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeChat?.doctorName}`} alt="" className="w-full h-full object-cover" /></div>
                  <div className="bg-[#FFFFFF] p-4 rounded-[12px] rounded-tl-sm shadow-sm border border-[#E3EAF2] max-w-[80%]">
                    <p className="text-[14px] font-medium text-[#1C2B39]">Hey, your appointment is successfully booked in this time ({activeChat?.time}) and date ({activeChat?.date}).</p>
                    <p className="text-[10px] font-medium text-[#6B7C8F] mt-2">10:00 AM</p>
                  </div>
                </div>

                {chatLocalMessages[chatSelectedId]?.map((msg) => (
                  <div key={msg._id || msg.id} className={`flex gap-4 ${msg.senderId === user.id ? 'justify-end' : ''}`}>
                    {msg.senderId !== user.id && (
                      <div className="w-8 h-8 rounded-[8px] bg-[#F4F7FB] overflow-hidden shrink-0 border border-[#D6E0EB]"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Dr_${activeChat?.doctorName}`} alt="" className="w-full h-full object-cover" /></div>
                    )}
                    <div className={`${msg.senderId === user.id ? 'bg-[#1F4E79] text-[#FFFFFF] rounded-tr-sm shadow-sm' : 'bg-[#FFFFFF] text-[#1C2B39] rounded-tl-sm border border-[#E3EAF2] shadow-sm'} p-4 rounded-[12px] max-w-[80%]`}>
                      {msg.type === 'voice' || msg.audioData ? (
                        <audio src={msg.audioData} controls className="max-w-[200px] h-8" />
                      ) : (
                        <p className="text-[14px] font-medium">{msg.text || msg.content}</p>
                      )}
                      <p className={`text-[10px] font-medium mt-2 ${msg.senderId === user.id ? 'text-[#9FB3C8]' : 'text-[#6B7C8F]'}`}>
                        {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatScrollRef} />
              </div>

              <div className="p-5 border-t border-[#E3EAF2] bg-[#FFFFFF]">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={chatNewMessage}
                    onChange={(e) => setChatNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 bg-[#F4F7FB] border border-[#D6E0EB] rounded-[8px] px-4 py-3 text-[14px] font-medium text-[#1C2B39] outline-none focus:bg-[#FFFFFF] focus:border-[#1F4E79] transition-colors placeholder:text-[#9FB3C8]"
                  />
                  <button
                    onClick={async () => {
                      if (isRecording && mediaRecorderRef.current) {
                        mediaRecorderRef.current.stop();
                        setIsRecording(false);
                      } else {
                        try {
                          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                          const recorder = new MediaRecorder(stream);
                          audioChunksRef.current = [];
                          recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
                          recorder.onstop = () => {
                            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                            const reader = new FileReader();
                            reader.readAsDataURL(blob);
                            reader.onloadend = async () => {
                              const audioData = reader.result as string;
                              try {
                                await fetch(`/api/chats/${chatSelectedId}/messages`, {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'voice', audioData })
                                });
                              } catch (e) { console.error('Voice note send failed', e); }
                            };
                            stream.getTracks().forEach(t => t.stop());
                          };
                          recorder.start();
                          mediaRecorderRef.current = recorder;
                          setIsRecording(true);
                        } catch (e) {
                          alert('Microphone access required for voice notes.');
                        }
                      }
                    }}
                    className={`p-3 rounded-[8px] flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/30' : 'bg-[#F0F4F9] text-[#1F4E79] border border-[#D6E0EB] hover:bg-[#E3EAF2]'}`}
                    title={isRecording ? "Stop Recording" : "Send Voice Note"}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </button>
                  <button
                    onClick={handleSendMessage}
                    className="px-6 py-3 bg-[#1F4E79] text-[#FFFFFF] rounded-[8px] hover:bg-[#163A5C] transition-colors shadow-sm font-medium text-[14px] flex items-center justify-center"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-[#F4F7FB]/50">
              <div className="w-20 h-20 bg-[#FFFFFF] rounded-[16px] flex items-center justify-center text-3xl shadow-sm mb-6 border border-[#E3EAF2]">💬</div>
              <h2 className="text-[18px] font-semibold text-[#1C2B39] tracking-tight">Select a Chat</h2>
              <p className="text-[13px] font-medium text-[#6B7C8F] mt-2 max-w-[200px]">Choose an active session from the left to start messaging</p>
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-in slide-in-from-left duration-700">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-[#FFFFFF] rounded-[12px] flex items-center justify-center text-3xl shadow-sm border border-[#E3EAF2]">🗄️</div>
              <div>
                <h1 className="text-[28px] font-semibold text-[#1C2B39] tracking-tight leading-none">Clinical Vault</h1>
                <p className="text-[14px] font-medium text-[#6B7C8F] mt-1 tracking-wide">Categorized clinical report network active</p>
              </div>
            </div>

            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#9FB3C8]">🔍</span>
              <input
                type="text"
                placeholder="Search reports or conditions..."
                value={reportsSearchTerm}
                onChange={(e) => setReportsSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-[#FFFFFF] border border-[#E3EAF2] rounded-[12px] text-[14px] font-medium text-[#1C2B39] outline-none focus:border-[#1F4E79] shadow-sm transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Doctor Consultations */}
            <div className="bg-[#FFFFFF] rounded-[16px] p-6 shadow-[0_8px_30px_rgba(15,42,67,0.12)] border border-[#E3EAF2] flex flex-col h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-[#F4F7FB] border border-[#D6E0EB] text-[#1F4E79] rounded-[10px] flex items-center justify-center text-xl">👨‍⚕️</div>
                <div>
                  <h3 className="text-[18px] font-semibold text-[#1C2B39] leading-tight">Doctor Consultations</h3>
                  <p className="text-[14px] font-medium text-[#6B7C8F] mt-1">Verified clinical summaries</p>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                {(() => {
                  const currentReports = remoteReports || medicalReports;
                  const doctorReports = currentReports.filter(r => r.reportType === 'doctor_consultation');

                  if (doctorReports.length === 0) {
                    return (
                      <div className="py-12 text-center opacity-60 select-none">
                        <div className="text-4xl mb-4 grayscale">📭</div>
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7C8F]">
                          {reportsSearchTerm ? "No reports match your search criteria" : "No verified reports received."}
                        </p>
                      </div>
                    );
                  }

                  return doctorReports.map(r => {
                    const rAny = r as any;
                    return (
                      <div key={r.id} className="p-4 bg-[#F4F7FB] border border-[#E3EAF2] rounded-[12px] hover:border-[#D6E0EB] hover:bg-[#FFFFFF] transition-colors group list-none">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-[#1C2B39] group-hover:text-[#1F4E79] transition-colors truncate">{r.title}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <p className="text-[12px] font-medium text-[#6B7C8F]">
                                Dr. {rAny.doctorId?.name || r.doctorName || 'Doctor'} •{' '}
                                {new Date(rAny.createdAt || r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            {rAny.diagnosis && (
                              <p className="text-[12px] text-[#1F4E79] font-medium mt-2">
                                🩺 {rAny.diagnosis}
                              </p>
                            )}
                            {rAny.prescriptions?.length > 0 && (
                              <div className="mt-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7C8F] mb-1.5">Prescription</p>
                                <div className="space-y-1">
                                  {rAny.prescriptions.map((med: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-[12px]">
                                      <span className="w-4 h-4 rounded-full bg-[#E8F1FA] text-[#1F4E79] flex items-center justify-center text-[9px] font-semibold shrink-0">{i + 1}</span>
                                      <span className="font-medium text-[#1C2B39]">{med.name}</span>
                                      {med.dose && <span className="text-[#6B7C8F]">— {med.dose}</span>}
                                      {med.daysCount && <span className="text-[#9FB3C8] text-[11px]">× {med.daysCount} day{med.daysCount > 1 ? 's' : ''}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDownloadReport(rAny.fileData || r.fileData, rAny.fileName || r.fileName)}
                            className="w-10 h-10 shrink-0 bg-[#F0F4F9] border border-[#D6E0EB] rounded-[8px] flex items-center justify-center text-[#1F4E79] hover:bg-[#E3EAF2] hover:border-[#1F4E79] transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>


            {/* AI Pre-Assessments */}
            <div className="bg-[#FFFFFF] rounded-[16px] p-6 shadow-[0_8px_30px_rgba(15,42,67,0.12)] border border-[#E3EAF2] flex flex-col h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-[#F4F7FB] border border-[#D6E0EB] text-[#1F4E79] rounded-[10px] flex items-center justify-center text-xl">✨</div>
                <div>
                  <h3 className="text-[18px] font-semibold text-[#1C2B39] leading-tight">AI Pre-Assessments</h3>
                  <p className="text-[14px] font-medium text-[#6B7C8F] mt-1">Automated intake notes</p>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                {(() => {
                  const currentReports = remoteReports || medicalReports;
                  const aiReports = currentReports.filter(r => r.reportType === 'ai_intake');

                  if (aiReports.length === 0) {
                    return (
                      <div className="py-12 text-center opacity-60 select-none">
                        <div className="text-4xl mb-4 grayscale">🛸</div>
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7C8F]">
                          {reportsSearchTerm ? "No reports match your search criteria" : "Initialize an AI intake session to generate reports."}
                        </p>
                      </div>
                    );
                  }

                  return aiReports.map(r => (
                    <div key={r.id} className="p-4 bg-[#F4F7FB] border border-[#E3EAF2] rounded-[12px] hover:border-[#D6E0EB] hover:bg-[#FFFFFF] transition-colors group list-none">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-[14px] font-semibold text-[#1C2B39] group-hover:text-[#1F4E79] transition-colors truncate">{r.title}</p>
                          <p className="text-[12px] font-medium text-[#6B7C8F] mt-1 truncate">AI Clinical Scribe • {r.date}</p>
                        </div>
                        <button
                          onClick={() => handleDownloadReport(r.fileData, r.fileName)}
                          className="w-10 h-10 shrink-0 bg-[#F0F4F9] border border-[#D6E0EB] rounded-[8px] flex items-center justify-center text-[#1F4E79] hover:bg-[#E3EAF2] hover:border-[#1F4E79] transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                      </div>
                    </div>
                  ));
                })()}
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
            <div className="flex items-center gap-6 animate-in slide-in-from-left duration-700">
              <div className="w-16 h-16 bg-[#FFFFFF] rounded-[12px] flex items-center justify-center text-3xl shadow-sm border border-[#E3EAF2]">📊</div>
              <div>
                <h1 className="text-[28px] font-semibold text-[#1C2B39] tracking-tight leading-none">Health Analytics</h1>
                <p className="text-[14px] font-medium text-[#6B7C8F] mt-1 tracking-wide">Deep longitudinal data mining active</p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { label: 'Total Visits', value: appointments.length, icon: '📅', color: 'text-[#1F4E79]' },
                { label: 'Confirmed', value: confirmedAppts.length, icon: '✅', color: 'text-[#10B981]' },
                { label: 'Pending', value: pendingAppts.length, icon: '⏳', color: 'text-[#F59E0B]' },
                { label: 'Cancelled', value: cancelledAppts.length, icon: '❌', color: 'text-[#EF4444]' },
              ].map((s, i) => (
                <div key={i} className="bg-[#FFFFFF] border border-[#E3EAF2] rounded-[16px] p-6 shadow-[0_8px_30px_rgba(15,42,67,0.12)] flex flex-col">
                  <span className="text-xl mb-3">{s.icon}</span>
                  <p className={`text-[24px] font-semibold ${s.color} leading-none`}>{s.value}</p>
                  <p className="text-[13px] font-medium text-[#6B7C8F] mt-2">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
              <div className="bg-[#FFFFFF] border border-[#E3EAF2] rounded-[16px] p-6 shadow-[0_8px_30px_rgba(15,42,67,0.12)] flex flex-col h-full">
                <h3 className="text-[16px] font-semibold text-[#1C2B39] mb-1">Visit Frequency</h3>
                <p className="text-[12px] font-medium text-[#6B7C8F] uppercase tracking-wide mb-6">Last 6 months</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="vf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1F4E79" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#1F4E79" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8EEF5" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 500, fill: '#6B7C8F' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#6B7C8F' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E3EAF2', boxShadow: '0 8px 30px rgba(15,42,67,0.12)', backgroundColor: '#FFFFFF' }} />
                      <Area type="monotone" dataKey="visits" stroke="#1F4E79" strokeWidth={2.5} fill="url(#vf)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E3EAF2] rounded-[16px] p-6 shadow-[0_8px_30px_rgba(15,42,67,0.12)] flex flex-col h-full">
                <h3 className="text-[16px] font-semibold text-[#1C2B39] mb-1">Blood Pressure Trend</h3>
                <p className="text-[12px] font-medium text-[#6B7C8F] uppercase tracking-wide mb-6">Systolic (mmHg)</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="bp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F2A43" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#0F2A43" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8EEF5" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 500, fill: '#6B7C8F' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#6B7C8F' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E3EAF2', boxShadow: '0 8px 30px rgba(15,42,67,0.12)', backgroundColor: '#FFFFFF' }} />
                      <Area type="monotone" dataKey="bp" stroke="#0F2A43" strokeWidth={2.5} fill="url(#bp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Appointment list */}
            <div className="bg-[#FFFFFF] border border-[#E3EAF2] rounded-[16px] shadow-[0_8px_30px_rgba(15,42,67,0.12)] overflow-hidden">
              <div className="p-6 border-b border-[#E3EAF2]">
                <h2 className="text-[16px] font-semibold text-[#1C2B39]">Appointment History</h2>
              </div>
              {appointments.length === 0 ? (
                <div className="p-16 text-center text-[#6B7C8F] font-medium uppercase text-[12px] tracking-wide">No appointments recorded</div>
              ) : (
                <div className="divide-y divide-[#E3EAF2]">
                  {appointments.map((a, i) => {
                    const colors: Record<string, string> = {
                      [AppointmentStatus.CONFIRMED]: 'bg-[#ecfdf5] text-[#10B981]',
                      [AppointmentStatus.PENDING]: 'bg-[#fffbeb] text-[#F59E0B]',
                      [AppointmentStatus.CANCELLED]: 'bg-[#fef2f2] text-[#EF4444]',
                      [AppointmentStatus.COMPLETED]: 'bg-[#F4F7FB] text-[#6B7C8F]',
                    };
                    return (
                      <div key={a.id ?? i} className="flex items-center justify-between px-6 py-5 hover:bg-[#F4F7FB] transition-colors">
                        <div>
                          <p className="text-[15px] font-semibold text-[#1C2B39]">{a.doctorName || 'Dr. —'}</p>
                          <p className="text-[13px] font-medium text-[#6B7C8F] mt-1">{a.date} • {a.time}</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-[8px] text-[12px] font-semibold ${colors[a.status] ?? 'bg-[#F0F4F9] text-[#6B7C8F]'}`}>{a.status}</span>
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
            <div className="flex items-center gap-6 animate-in slide-in-from-left duration-700">
              <div className="w-16 h-16 bg-[#FFFFFF] rounded-[12px] flex items-center justify-center text-3xl shadow-sm border border-[#E3EAF2]">💳</div>
              <div>
                <h1 className="text-[28px] font-semibold text-[#1C2B39] tracking-tight leading-none">Payment History</h1>
                <p className="text-[14px] font-medium text-[#6B7C8F] mt-1 tracking-wide">Encrypted transaction ledger secure</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Total Spent', value: `$${total.toLocaleString()}`, icon: '💳', color: 'text-[#1F4E79]', bg: 'bg-[#F4F7FB] border-[#E3EAF2]' },
                { label: 'Transactions', value: payments.length, icon: '🧾', color: 'text-[#1C2B39]', bg: 'bg-[#FFFFFF] border-[#E3EAF2]' },
                { label: 'Pending Bills', value: payments.filter(p => (p.status as any) === 'PENDING' || p.status === 'pending').length, icon: '⏳', color: 'text-[#F59E0B]', bg: 'bg-[#FFFFFF] border-[#E3EAF2]' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} border rounded-[16px] p-6 shadow-[0_8px_30px_rgba(15,42,67,0.12)] flex flex-col justify-center`}>
                  <span className="text-xl mb-3">{s.icon}</span>
                  <p className={`text-[24px] font-semibold ${s.color} leading-none`}>{s.value}</p>
                  <p className={`text-[13px] font-medium mt-2 ${s.color === 'text-[#1F4E79]' ? 'text-[#1F4E79]' : 'text-[#6B7C8F]'}`}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#FFFFFF] border border-[#E3EAF2] rounded-[16px] shadow-[0_8px_30px_rgba(15,42,67,0.12)] overflow-hidden">
              <div className="p-6 border-b border-[#E3EAF2]">
                <h2 className="text-[16px] font-semibold text-[#1C2B39]">Transaction Ledger</h2>
              </div>
              {payments.length === 0 ? (
                <div className="p-16 text-center text-[#6B7C8F] font-medium uppercase text-[12px] tracking-wide">No transactions yet</div>
              ) : (
                <div className="divide-y divide-[#E3EAF2]">
                  {payments.map((p, i) => (
                    <div key={(p as any).id ?? i} className="flex items-center justify-between px-6 py-5 hover:bg-[#F4F7FB] transition-colors">
                      <div>
                        <p className="text-[15px] font-semibold text-[#1C2B39]">{(p as any).description || (p as any).doctorName || `Transaction #${i + 1}`}</p>
                        <p className="text-[13px] font-medium text-[#6B7C8F] mt-1">{(p as any).date || 'Recent'}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className={`px-4 py-1.5 rounded-[8px] text-[12px] font-semibold ${(p.status === 'PENDING' || p.status === 'pending') ? 'bg-[#fffbeb] text-[#F59E0B]' : (p.status === 'FAILED' || p.status === 'failed') ? 'bg-[#fef2f2] text-[#EF4444]' : 'bg-[#ecfdf5] text-[#10B981]'}`}>
                          {p.status ?? 'Completed'}
                        </span>
                        <span className="text-[16px] font-semibold text-[#1C2B39]">${(p.amount ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}


      {/* ── Settings ── */}
      {activeTab === 'settings' && (
        <div className="space-y-10 animate-in fade-in duration-700">
          <div className="flex items-center gap-6 animate-in slide-in-from-left duration-700">
            <div className="w-16 h-16 bg-[#FFFFFF] rounded-[12px] flex items-center justify-center text-3xl shadow-sm border border-[#E3EAF2]">⚙️</div>
            <div>
              <h1 className="text-[28px] font-semibold text-[#1C2B39] tracking-tight leading-none">Settings</h1>
              <p className="text-[14px] font-medium text-[#6B7C8F] mt-1 tracking-wide">Manage your account preferences and security</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Account Settings */}
            <div className="bg-[#FFFFFF] border border-[#E3EAF2] rounded-[16px] p-8 shadow-[0_8px_30px_rgba(15,42,67,0.12)] space-y-6">
              <h3 className="text-[18px] font-semibold text-[#1C2B39] flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#E8F1FA] text-[#1F4E79] flex items-center justify-center text-[14px]">👤</span>
                Profile Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7C8F] mb-1.5 block">Full Name</label>
                  <input type="text" defaultValue={user.name} className="w-full p-3.5 bg-[#F4F7FB] border border-[#D6E0EB] rounded-[10px] text-[14px] font-medium text-[#1C2B39] outline-none focus:bg-[#FFFFFF] focus:border-[#1F4E79] transition-colors" />
                </div>
                <div>
                  <label className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7C8F] mb-1.5 block">Email Address</label>
                  <input type="email" defaultValue={user.email} className="w-full p-3.5 bg-[#F4F7FB] border border-[#D6E0EB] rounded-[10px] text-[14px] font-medium text-[#1C2B39] outline-none focus:bg-[#FFFFFF] focus:border-[#1F4E79] transition-colors" />
                </div>
                <div>
                  <label className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7C8F] mb-1.5 block">Phone Number</label>
                  <input type="tel" defaultValue={intakeData?.contactInfo?.phone || '+1 (555) 000-0000'} className="w-full p-3.5 bg-[#F4F7FB] border border-[#D6E0EB] rounded-[10px] text-[14px] font-medium text-[#1C2B39] outline-none focus:bg-[#FFFFFF] focus:border-[#1F4E79] transition-colors" />
                </div>
                <button className="w-full py-4 bg-[#1F4E79] text-[#FFFFFF] rounded-[10px] font-semibold text-[14px] shadow-sm hover:bg-[#163A5C] transition-colors mt-2">
                  Save Profile Changes
                </button>
              </div>
            </div>

            {/* Notification & Security */}
            <div className="space-y-8">
              <div className="bg-[#FFFFFF] border border-[#E3EAF2] rounded-[16px] p-8 shadow-[0_8px_30px_rgba(15,42,67,0.12)] space-y-6">
                <h3 className="text-[18px] font-semibold text-[#1C2B39] flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#E8F1FA] text-[#1F4E79] flex items-center justify-center text-[14px]">🔔</span>
                  Notifications
                </h3>
                <div className="space-y-4">
                  {[
                    { title: 'Email Alerts', desc: 'Receive updates about appointments' },
                    { title: 'SMS Notifications', desc: 'Get text messages for reminders' },
                    { title: 'Medical Reports', desc: 'Notify when new reports are available' }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-row items-center justify-between p-4 border border-[#E3EAF2] rounded-[10px] hover:border-[#D6E0EB] transition-colors">
                      <div>
                        <p className="font-semibold text-[#1C2B39] text-[14px]">{item.title}</p>
                        <p className="text-[12px] text-[#6B7C8F] mt-0.5">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked={i !== 1} />
                        <div className="w-11 h-6 bg-[#D6E0EB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E3EAF2] rounded-[16px] p-8 shadow-[0_8px_30px_rgba(15,42,67,0.12)] space-y-6">
                <h3 className="text-[18px] font-semibold text-[#1C2B39] flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#E8F1FA] text-[#1F4E79] flex items-center justify-center text-[14px]">🔒</span>
                  Security
                </h3>
                <div className="space-y-4">
                  <button className="w-full py-4 bg-[#F4F7FB] border border-[#D6E0EB] text-[#1F4E79] rounded-[10px] font-semibold text-[14px] hover:bg-[#E3EAF2] transition-colors text-left px-5 flex justify-between items-center">
                    Change Password
                    <span className="text-[16px]">→</span>
                  </button>
                  <button className="w-full py-4 bg-[#F4F7FB] border border-[#D6E0EB] text-[#1F4E79] rounded-[10px] font-semibold text-[14px] hover:bg-[#E3EAF2] transition-colors text-left px-5 flex justify-between items-center">
                    Two-Factor Authentication
                    <span className="text-[11px] bg-[#10B981] text-white px-2 py-0.5 rounded-full uppercase tracking-wide">Enabled</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 z-[3000] bg-[#0F2A43]/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="max-w-md w-full h-[700px] bg-[#FFFFFF] rounded-[16px] shadow-[0_8px_30px_rgba(15,42,67,0.12)] flex flex-col overflow-hidden border border-[#E3EAF2] animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-[#FFFFFF] border-b border-[#E3EAF2] flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#F4F7FB] border border-[#D6E0EB] text-[#1F4E79] rounded-[10px] flex items-center justify-center font-bold text-xl">✨</div>
                <div>
                  <p className="font-semibold text-[16px] text-[#1C2B39] tracking-tight">{chatType === 'intake' ? 'Clinical Assistant' : 'AI Triage'}</p>
                  <p className="text-[11px] font-medium text-[#6B7C8F] uppercase tracking-wide mt-0.5">Secure AI Session</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="w-10 h-10 bg-[#F0F4F9] text-[#1C2B39] rounded-full flex items-center justify-center hover:bg-[#E3EAF2] transition-colors font-semibold border border-[#D6E0EB]">✕</button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F4F7FB]/30 scrollbar-hide">
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] p-4 rounded-[12px] text-[14px] leading-relaxed font-medium shadow-sm ${m.role === 'user' ? 'bg-[#1F4E79] text-[#FFFFFF] rounded-tr-sm' : 'bg-[#FFFFFF] text-[#1C2B39] border border-[#E3EAF2] rounded-tl-sm'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isTyping && <div className="text-[11px] font-semibold uppercase text-[#1F4E79] animate-pulse tracking-wide ml-1">Cayr AI is analyzing input...</div>}
            </div>
            <div className="p-6 bg-[#FFFFFF] border-t border-[#E3EAF2] space-y-4">
              {reportReady && (
                <button
                  disabled={isGeneratingReport}
                  onClick={handleCreateReport}
                  className="w-full bg-[#1F4E79] text-[#FFFFFF] py-4 rounded-[12px] font-semibold text-[14px] shadow-sm hover:shadow-md hover:bg-[#163A5C] transition-colors"
                >
                  {isGeneratingReport ? 'Compiling Medical SOAP Note...' : 'Finalize Intake Report'}
                </button>
              )}
              <form onSubmit={handleSendMessage} className="flex space-x-3">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Provide clinical details..." className="flex-1 px-4 py-3 bg-[#F4F7FB] border border-[#D6E0EB] rounded-[12px] text-[14px] font-medium text-[#1C2B39] outline-none focus:bg-[#FFFFFF] focus:border-[#1F4E79] transition-colors placeholder:text-[#9FB3C8]" />
                <button
                  type="button"
                  onClick={() => {
                    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    if (!SpeechRecognition) return alert('Speech recognition not supported in this browser.');
                    if (isPredictingSpeech && recognitionRef.current) {
                      recognitionRef.current.stop();
                      setIsPredictingSpeech(false);
                      return;
                    }
                    const recognition = new SpeechRecognition();
                    recognition.continuous = false;
                    recognition.interimResults = false;
                    recognition.onresult = (event: any) => {
                      const transcript = event.results[0][0].transcript;
                      setChatInput(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + transcript);
                      setIsPredictingSpeech(false);
                    };
                    recognition.onerror = () => setIsPredictingSpeech(false);
                    recognition.onend = () => setIsPredictingSpeech(false);
                    recognition.start();
                    recognitionRef.current = recognition;
                    setIsPredictingSpeech(true);
                  }}
                  className={`w-14 h-auto rounded-[12px] flex items-center justify-center transition-all shrink-0 ${isPredictingSpeech ? 'bg-rose-500 text-white animate-pulse' : 'bg-[#F0F4F9] border border-[#D6E0EB] text-[#1F4E79] hover:bg-[#E3EAF2]'}`}
                  title="Voice Typing"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
                <button type="submit" disabled={isTyping || !chatInput.trim()} className="w-14 h-auto bg-[#1F4E79] text-[#FFFFFF] rounded-[12px] flex items-center justify-center shadow-sm hover:bg-[#163A5C] active:scale-95 transition-all group disabled:opacity-50 disabled:bg-[#D6E0EB] disabled:text-[#6B7C8F]">
                  <span className="group-hover:translate-x-1 transition-transform font-bold">➜</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Education Modal */}
      {educationModalContent && (
        <div className="fixed inset-0 z-[4000] bg-[#0F2A43]/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-[#FFFFFF] rounded-[16px] shadow-[0_8px_30px_rgba(15,42,67,0.12)] flex flex-col overflow-hidden border border-[#E3EAF2] animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-[#FFFFFF] border-b border-[#E3EAF2] flex justify-between items-center">
              <h3 className="font-semibold text-[18px] text-[#1C2B39] tracking-tight">{educationModalContent.title}</h3>
              <button onClick={() => setEducationModalContent(null)} className="w-8 h-8 bg-[#F0F4F9] text-[#1C2B39] rounded-full flex items-center justify-center hover:bg-[#E3EAF2] transition-colors font-semibold border border-[#D6E0EB]">✕</button>
            </div>
            <div className="p-6 text-[14px] text-[#6B7C8F] leading-relaxed">
              {educationModalContent.content}
            </div>
            <div className="p-6 border-t border-[#E3EAF2] flex justify-end">
              <button
                onClick={() => setEducationModalContent(null)}
                className="px-6 py-2.5 bg-[#1F4E79] text-[#FFFFFF] rounded-[8px] font-semibold text-[13px] shadow-sm hover:bg-[#163A5C] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isBridgeOpen && <MultilingualBridge partnerName="Indian Clinical Network" onClose={() => setIsBridgeOpen(false)} />}
    </div>
  );
};

export default PatientDashboard;
