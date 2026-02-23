
import React, { useState, useEffect, useRef } from 'react';
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
import Pharmacy from './Pharmacy';
import ClinicLabFinder from './ClinicLabFinder';

interface ChatMessage { role: 'user' | 'ai'; text: string; }
interface LiveFacility {
  name: string;
  uri: string;
  type: string;
  address?: string;
  clinicalContext?: string;
  latOffset?: number;
  lngOffset?: number;
}

interface PatientDashboardProps {
  user: User;
  appointments: Appointment[];
  medicalReports: MedicalReport[];
  prescriptions: Prescription[];
  payments: Payment[];
  onBook: (doctorId: string, doctorName: string, date: string, time: string) => void;
  onAddReport: (report: MedicalReport) => void;
  onUploadPrescription: (prescription: Prescription) => void;
  view: 'dashboard' | 'analytics' | 'payments' | 'reports' | 'reminders' | 'facilities' | 'booking' | 'pharmacy';
  onSubViewChange?: (view: string) => void;
}

const PatientDashboard: React.FC<PatientDashboardProps> = ({
  user, appointments, medicalReports, prescriptions, payments, onBook, onAddReport, view: initialView = 'dashboard', onSubViewChange
}) => {
  const [activeTab, setActiveTab] = useState(initialView);
  const [isBridgeOpen, setIsBridgeOpen] = useState(false);
  const [isBodyScanOpen, setIsBodyScanOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatType, setChatType] = useState<'intake' | 'symptom'>('intake');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
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

  const handleCreateReport = async () => {
    setIsGeneratingReport(true);
    const history = chatHistory.map(m => `${m.role}: ${m.text}`).join('\n');
    const painContext = activePainMap.length > 0
      ? `\nPain Map Data: ${activePainMap.map(a => `${a.label} (${a.side}) intensity ${a.intensity}/10`).join(', ')}`
      : "";

    const summary = await generateSOAPNote(history + painContext);
    const report: MedicalReport = {
      id: `SOAP-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      doctorName: "AI Clinical Scribe",
      patientId: user.id,
      findings: summary,
      type: "Pre-Assessment Note",
      demographics: { dob: user.dob || '', address: user.address || '', height: user.height || 0, weight: user.weight || 0, age: 30 },
      painMap: activePainMap
    };
    onAddReport(report);
    setIsGeneratingReport(false);
    setIsChatOpen(false);
    setReportReady(false);
    setChatHistory([]);
    setActivePainMap([]);
  };

  const renderHome = () => (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Active Pain Alert */}
      {activePainMap.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 p-8 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4">
          <div className="flex items-center space-x-6">
            <div className="w-14 h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-rose-200 animate-pulse">🌡️</div>
            <div>
              <h4 className="text-lg font-black text-rose-900 tracking-tight">Active Anatomical Map Detected</h4>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mt-1">{activePainMap.length} Areas of high intensity reported. AI Intake recommended.</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => { setChatType('intake'); setChatHistory([{ role: 'ai', text: `I've analyzed your body scan. You reported intensity at ${activePainMap.map(a => a.label).join(', ')}. When did these sensations begin?` }]); chatSessionRef.current = createClinicalIntakeSession(); setIsChatOpen(true); }}
              className="px-8 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-200"
            >
              Launch AI Intake
            </button>
            <button onClick={() => setActivePainMap([])} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600">Clear Map</button>
          </div>
        </div>
      )}

      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Body Mapping', icon: '📍', color: 'bg-indigo-600 text-white', sub: 'Spatial AR Scan', onClick: () => setIsBodyScanOpen(true) },
          { label: 'Clinical Intake', icon: '📋', color: 'bg-blue-50 text-blue-500', sub: 'SOAP Note Prep', onClick: () => { setChatType('intake'); setChatHistory([{ role: 'ai', text: "Hello. I'll help gather clinical data for your doctor. What brings you in?" }]); chatSessionRef.current = createClinicalIntakeSession(); setIsChatOpen(true); } },
          { label: 'Symptom Triage', icon: '🌡️', color: 'bg-rose-50 text-rose-500', sub: 'Risk Analysis', onClick: () => { setChatType('symptom'); setChatHistory([{ role: 'ai', text: "I'm the Cayr AI Triage Bot. What symptoms are you experiencing?" }]); chatSessionRef.current = createSymptomCheckerSession(); setIsChatOpen(true); } },
          { label: 'Interpreter', icon: '🇮🇳', color: 'bg-white border border-slate-100', sub: 'Indian Language Bridge', onClick: () => setIsBridgeOpen(true) },
        ].map((item, i) => (
          <button key={i} onClick={item.onClick} className={`p-8 rounded-[40px] ${item.color} shadow-sm text-left group transition-all hover:scale-[1.02] hover:shadow-xl`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 ${item.color === 'bg-indigo-600 text-white' ? 'bg-white/10' : item.color}`}>{item.icon}</div>
            <p className="font-black text-lg tracking-tight">{item.label}</p>
            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 opacity-60`}>{item.sub}</p>
          </button>
        ))}
      </div>

      {/* Health Profile Summary (from intake) */}
      {intakeData && intakeData.submittedAt && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[40px] p-8 border border-blue-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3b5bfd] rounded-2xl flex items-center justify-center text-white text-lg">🩺</div>
              <h3 className="text-lg font-black tracking-tight text-slate-900">Health Profile</h3>
            </div>
            <button
              onClick={() => { window.location.href = '/patient-intake'; }}
              className="text-xs font-bold text-[#3b5bfd] hover:underline">
              Update Info →
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Height', value: intakeData.height ? `${intakeData.height} cm` : '—' },
              { label: 'Weight', value: intakeData.weight ? `${intakeData.weight} kg` : '—' },
              { label: 'BMI', value: (intakeData.height && intakeData.weight) ? ((intakeData.weight / Math.pow(intakeData.height / 100, 2)).toFixed(1)) : '—' },
              { label: 'Blood Type', value: intakeData.bloodType || '—' },
              { label: 'Blood Pressure', value: intakeData.bloodPressure || '—' },
              { label: 'Heart Rate', value: intakeData.heartRate ? `${intakeData.heartRate} bpm` : '—' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                <p className="text-lg font-black text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>
          {/* Allergies + Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {intakeData.allergies?.length > 0 && (
              <div className="bg-white rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Allergies</p>
                <div className="flex flex-wrap gap-1.5">
                  {intakeData.allergies.map((a: string) => (
                    <span key={a} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {intakeData.conditions?.length > 0 && (
              <div className="bg-white rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Conditions</p>
                <div className="flex flex-wrap gap-1.5">
                  {intakeData.conditions.map((c: string) => (
                    <span key={c} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Uploaded documents */}
          {intakeData.uploadedFiles?.length > 0 && (
            <div className="bg-white rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Uploaded Documents</p>
              <div className="space-y-2">
                {intakeData.uploadedFiles.map((f: any) => (
                  <div key={f._id} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 font-medium truncate">{f.fileName || f.title}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${f.extractionStatus === 'done' ? 'bg-green-50 text-green-600' :
                      f.extractionStatus === 'processing' ? 'bg-blue-50 text-blue-600 animate-pulse' :
                        f.extractionStatus === 'failed' ? 'bg-red-50 text-red-500' :
                          'bg-slate-50 text-slate-400'
                      }`}>{f.extractionStatus === 'processing' ? '⚙ Processing' : f.extractionStatus === 'done' ? '✓ Ready' : f.extractionStatus === 'failed' ? '✗ Failed' : '⏳ Pending'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black tracking-tight text-slate-900">Health Calibration Vitals</h3>
            <div className="flex space-x-2">
              <div className="px-3 py-1 bg-blue-50 text-blue-500 rounded-lg text-[10px] font-black uppercase tracking-widest">Sys/Dia Sync</div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={Array.from({ length: 14 }, (_, i) => ({ day: i + 1, sys: 120 + Math.random() * 20, dia: 80 + Math.random() * 10 }))}>
                <defs>
                  <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b5bfd" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b5bfd" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontWeight: 800 }} />
                <Area type="monotone" dataKey="sys" stroke="#3b5bfd" strokeWidth={4} fillOpacity={1} fill="url(#colorSys)" />
                <Area type="monotone" dataKey="dia" stroke="#ff5c6c" strokeWidth={4} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black tracking-tight text-slate-900 mb-8">Clinical Roadmap</h3>
          <div className="space-y-6">
            {appointments.filter(a => a.status !== 'CANCELLED').length === 0 ? (
              <div className="py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">No visits booked.</div>
            ) : (
              appointments.filter(a => a.status !== 'CANCELLED').slice(0, 3).map(app => (
                <div key={app.id} className="p-5 bg-slate-50/50 rounded-3xl border border-transparent hover:border-slate-200 transition-all flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-lg shadow-sm">🩺</div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-800">{app.doctorName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{app.date} • {app.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <button onClick={() => handleTabChange('booking')} className="w-full mt-8 py-4 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all text-slate-500">View All Sessions</button>
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
        <div className="p-16 bg-green-50 rounded-[48px] border-4 border-white shadow-2xl text-center">
          <div className="text-5xl mb-6 text-green-500">✅</div>
          <h3 className="text-2xl font-black text-green-900 tracking-tight">Appointment Sync Requested</h3>
          <p className="text-green-600 font-bold mt-2">Your physician will confirm the session shortly.</p>
          <button onClick={() => { setIsBookingSuccessful(false); handleTabChange('dashboard'); }} className="mt-8 px-10 py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-green-200 hover:bg-green-700 transition-all">Back to Home</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">1. Choose Specialist</p>
            <div className="space-y-4">
              {MOCK_DOCTORS.map(doc => (
                <button key={doc.id} onClick={() => setSelectedDoctorId(doc.id)} className={`w-full p-6 rounded-[32px] border-2 transition-all text-left flex items-center space-x-5 ${selectedDoctorId === doc.id ? 'bg-white border-[#3b5bfd] shadow-2xl shadow-blue-500/10' : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}>
                  <div className="w-14 h-14 bg-white rounded-2xl overflow-hidden border border-slate-100"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.name}`} alt="" /></div>
                  <div>
                    <p className="text-base font-black text-slate-800 tracking-tight">{doc.name}</p>
                    <p className="text-[10px] font-black text-[#3b5bfd] uppercase tracking-widest mt-1">{doc.specialty}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-10">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Visit Date</label>
                <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:bg-white focus:border-[#3b5bfd] transition-all text-slate-700" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Time Slot</label>
                <div className="grid grid-cols-2 gap-3">
                  {['09:00 AM', '11:00 AM', '02:00 PM', '04:30 PM'].map(t => (
                    <button key={t} onClick={() => setBookingTime(t)} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${bookingTime === t ? 'bg-[#3b5bfd] text-white border-[#3b5bfd]' : 'bg-slate-50 text-slate-500 border-transparent hover:border-slate-200'}`}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
            <button
              disabled={!selectedDoctorId || !bookingDate || !bookingTime}
              onClick={() => { onBook(selectedDoctorId!, MOCK_DOCTORS.find(d => d.id === selectedDoctorId)!.name, bookingDate, bookingTime); setIsBookingSuccessful(true); }}
              className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black text-sm uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all disabled:opacity-30 disabled:grayscale"
            >
              Book Session
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderFacilities = () => (
    <ClinicLabFinder />
  );

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {/* View Switcher */}
      <nav className="flex space-x-2 bg-white/50 backdrop-blur-md p-1.5 rounded-[28px] border border-white/50 mb-10 w-fit">
        {[
          { id: 'dashboard', label: 'Overview', icon: '🏠' },
          { id: 'booking', label: 'Visits', icon: '📅' },
          { id: 'facilities', label: 'Facility Explorer', icon: '📍' },
          { id: 'reports', label: 'Clinical Vault', icon: '📄' },
          { id: 'pharmacy', label: 'Pharmacy', icon: '💊' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id as any)}
            className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center space-x-3 ${activeTab === t.id ? 'bg-white text-[#3b5bfd] shadow-xl shadow-blue-500/5' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </nav>

      {activeTab === 'dashboard' && renderHome()}
      {activeTab === 'booking' && renderBooking()}
      {activeTab === 'facilities' && renderFacilities()}
      {activeTab === 'reports' && <div className="p-20 text-center text-slate-300 font-black uppercase text-[11px] tracking-widest bg-white rounded-[48px] border border-slate-100">Medical Repository Syncing...</div>}
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
          <div className="space-y-8 animate-in fade-in duration-700">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-800">Health Analytics</h1>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-2">Personal clinical insights</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {[
                { label: 'Total Visits', value: appointments.length, icon: '📅', bg: 'bg-blue-50', text: 'text-blue-600' },
                { label: 'Confirmed', value: confirmedAppts.length, icon: '✅', bg: 'bg-green-50', text: 'text-green-600' },
                { label: 'Pending', value: pendingAppts.length, icon: '⏳', bg: 'bg-amber-50', text: 'text-amber-600' },
                { label: 'Cancelled', value: cancelledAppts.length, icon: '❌', bg: 'bg-rose-50', text: 'text-rose-600' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} rounded-[32px] p-7 flex items-center gap-5`}>
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <p className={`text-3xl font-black ${s.text}`}>{s.value}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
              <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 mb-1">Visit Frequency</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Last 6 months</p>
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

              <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 mb-1">Blood Pressure Trend</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Systolic (mmHg)</p>
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
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-800">Appointment History</h2>
              </div>
              {appointments.length === 0 ? (
                <div className="p-16 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">No appointments recorded</div>
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
                      <div key={a.id ?? i} className="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-black text-slate-800">{a.doctorName || 'Dr. —'}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{a.date} • {a.time}</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${colors[a.status] ?? 'bg-slate-100 text-slate-500'}`}>{a.status}</span>
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
          <div className="space-y-8 animate-in fade-in duration-700">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-800">Payment History</h1>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-2">Billing &amp; transaction records</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Total Spent', value: `$${total.toLocaleString()}`, icon: '💳', bg: 'bg-slate-900 text-white' },
                { label: 'Transactions', value: payments.length, icon: '🧾', bg: 'bg-blue-50 text-blue-700' },
                { label: 'Pending Bills', value: payments.filter(p => (p.status as any) === 'PENDING' || p.status === 'pending').length, icon: '⏳', bg: 'bg-amber-50 text-amber-700' },
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
              <div className="p-8 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-800">Transaction Ledger</h2>
              </div>
              {payments.length === 0 ? (
                <div className="p-16 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">No transactions yet</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {payments.map((p, i) => (
                    <div key={(p as any).id ?? i} className="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-black text-slate-800">{(p as any).description || (p as any).doctorName || `Transaction #${i + 1}`}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{(p as any).date || 'Recent'}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${(p.status === 'PENDING' || p.status === 'pending') ? 'bg-amber-100 text-amber-700' : (p.status === 'FAILED' || p.status === 'failed') ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>
                          {p.status ?? 'Completed'}
                        </span>
                        <span className="font-black text-slate-800 text-lg">${(p.amount ?? 0).toLocaleString()}</span>
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
        <div className="fixed inset-0 z-[3000] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="max-w-md w-full h-[700px] bg-white rounded-[48px] shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className={`p-8 ${chatType === 'symptom' ? 'bg-[#1a1d1f]' : 'bg-[#3b5bfd]'} text-white flex justify-between items-center`}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black">✨</div>
                <div>
                  <p className="font-black text-sm tracking-tight">{chatType === 'intake' ? 'Clinical Intake Assistant' : 'AI Symptom Triage'}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Session Encrypted</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all">✕</button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50 scrollbar-hide">
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] p-5 rounded-[28px] text-sm leading-relaxed font-medium shadow-sm ${m.role === 'user' ? 'bg-[#3b5bfd] text-white rounded-tr-none shadow-blue-500/20' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isTyping && <div className="text-[9px] font-black uppercase text-blue-500 animate-pulse tracking-widest ml-1">Cayr AI is analyzing input...</div>}
            </div>
            <div className="p-8 bg-white border-t border-slate-100 space-y-6">
              {reportReady && (
                <button
                  disabled={isGeneratingReport}
                  onClick={handleCreateReport}
                  className="w-full bg-emerald-500 text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                >
                  {isGeneratingReport ? 'Compiling Medical SOAP Note...' : 'Finalize Intake Report'}
                </button>
              )}
              <form onSubmit={handleSendMessage} className="flex space-x-3">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Provide clinical details..." className="flex-1 p-5 bg-slate-100 border border-slate-200 rounded-3xl text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all text-slate-800" />
                <button type="submit" disabled={isTyping || !chatInput.trim()} className="w-16 h-16 bg-[#3b5bfd] text-white rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20 active:scale-90 transition-all group">
                  <span className="group-hover:translate-x-1 transition-transform">➜</span>
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
