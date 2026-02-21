
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
  const [activePainMap, setActivePainMap] = useState<PainArea[]>(() => {
    const saved = sessionStorage.getItem('cayr_pain_map');
    return saved ? JSON.parse(saved) : [];
  });

  const [liveFacilities, setLiveFacilities] = useState<LiveFacility[]>([]);
  const [isSearchingFacilities, setIsSearchingFacilities] = useState(false);
  const [facilityCategory, setFacilityCategory] = useState('Clinics');
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [isBookingSuccessful, setIsBookingSuccessful] = useState(false);

  const chatSessionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialView);
    if (initialView === 'facilities' && liveFacilities.length === 0) {
      handleFetchLiveFacilities('medical clinics');
    }
  }, [initialView]);

  useEffect(() => {
    sessionStorage.setItem('cayr_pain_map', JSON.stringify(activePainMap));
  }, [activePainMap]);

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    onSubViewChange?.(tab);
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory, isTyping]);

  const handleFetchLiveFacilities = async (categoryQuery: string) => {
    setIsSearchingFacilities(true);
    if (!navigator.geolocation) {
      alert("Geolocation required to find facilities.");
      setIsSearchingFacilities(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setUserLocation({ lat: latitude, lng: longitude });

      try {
        const result = await searchNearbyClinics(latitude, longitude, categoryQuery);
        // Process Gemini grounding chunks into usable facility objects
        const mapped = (result.grounding || [])
          .filter(c => c.maps)
          .map((c, idx) => ({
            name: c.maps!.title || "Healthcare Facility",
            uri: c.maps!.uri || "#",
            type: categoryQuery,
            // Random offsets for visual map representation
            latOffset: (Math.random() - 0.5) * 0.05,
            lngOffset: (Math.random() - 0.5) * 0.05,
            clinicalContext: result.text.split('\n').find(l => l.includes(c.maps!.title || '')) || "Primary Healthcare Service",
            address: "Located nearby " + (idx + 1) * 0.5 + " miles away"
          }));
        setLiveFacilities(mapped);
      } catch (e) {
        console.error("Map fetch error:", e);
      } finally {
        setIsSearchingFacilities(false);
      }
    }, (err) => {
      console.error("Geo error:", err);
      setIsSearchingFacilities(false);
    });
  };

  const handleCategoryFilter = (cat: string) => {
    setFacilityCategory(cat);
    handleFetchLiveFacilities(`top-rated ${cat.toLowerCase()}`);
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
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center text-slate-900">Clinic & Labs Finder {isSearchingFacilities && <div className="ml-4 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>}</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Real-time Verified Healthcare Network</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide">
          {['Clinics', 'Labs', 'Hospitals', 'Emergency'].map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryFilter(cat)}
              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${facilityCategory === cat ? 'bg-[#3b5bfd] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden h-[600px] relative group">
          {/* Digital Map Representation */}
          <div className="absolute inset-0 bg-[#f8fafc] opacity-50 pointer-events-none bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]"></div>

          {/* Interactive Area */}
          <div className="w-full h-full relative p-10 flex items-center justify-center">
            {/* Simulated User Location Marker */}
            <div className="absolute w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse border-2 border-blue-400/30">
              <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
              <div className="absolute -top-8 bg-slate-900 text-white text-[8px] font-black uppercase px-2 py-1 rounded">You</div>
            </div>

            {/* Satellite Scanning HUD */}
            <div className="absolute top-8 left-8 p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm z-10 pointer-events-none">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Satellite Status</p>
              <p className={`text-[10px] font-black uppercase mt-1 ${isSearchingFacilities ? 'text-blue-500' : 'text-green-500'}`}>
                {isSearchingFacilities ? "Scanning Frequencies..." : "Linked • Active Grid"}
              </p>
            </div>

            {/* Facility Markers */}
            {!isSearchingFacilities && liveFacilities.map((f, i) => (
              <div
                key={i}
                className="absolute cursor-pointer hover:scale-110 transition-transform group/marker"
                style={{
                  top: `${50 + (f.latOffset || 0) * 1000}%`,
                  left: `${50 + (f.lngOffset || 0) * 1000}%`
                }}
                onClick={() => window.open(f.uri, '_blank')}
              >
                <div className="w-10 h-10 bg-white rounded-2xl border-2 border-[#3b5bfd] shadow-xl flex items-center justify-center text-lg relative z-10">
                  {facilityCategory === 'Labs' ? '🧪' : facilityCategory === 'Hospitals' ? '🏥' : '🩺'}
                </div>
                <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover/marker:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-2xl">
                  {f.name}
                </div>
                <div className="absolute inset-0 bg-[#3b5bfd] rounded-2xl animate-ping opacity-10"></div>
              </div>
            ))}

            {isSearchingFacilities && (
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 border-4 border-[#3b5bfd] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Spatial Data...</p>
              </div>
            )}
          </div>

          <div className="absolute bottom-6 right-6 flex space-x-2">
            <div className="px-4 py-2 bg-white/80 backdrop-blur-md rounded-xl text-[8px] font-black text-slate-400 uppercase border border-slate-100">Zoom: Adaptive</div>
            <div className="px-4 py-2 bg-white/80 backdrop-blur-md rounded-xl text-[8px] font-black text-slate-400 uppercase border border-slate-100">Layer: Bio-Clinical</div>
          </div>
        </div>

        <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Results for {facilityCategory}</span>
              <p className="text-[9px] font-bold text-slate-400 mt-1">Found in your immediate vicinity</p>
            </div>
            {liveFacilities.length > 0 && <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black">{liveFacilities.length} Results</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
            {isSearchingFacilities ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-6 bg-slate-50/50 rounded-3xl border border-transparent animate-pulse space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                </div>
              ))
            ) : liveFacilities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30 p-10">
                <div className="text-6xl mb-6">🛰️</div>
                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">System Ready • Select category or update location to begin scanning verified clinical endpoints.</p>
              </div>
            ) : (
              liveFacilities.map((f, i) => (
                <article key={i} className="p-6 bg-white border border-slate-100 rounded-3xl hover:border-[#3b5bfd] hover:shadow-lg transition-all group cursor-pointer" onClick={() => window.open(f.uri, '_blank')}>
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-black text-slate-800 text-base leading-tight tracking-tight group-hover:text-[#3b5bfd] transition-colors">{f.name}</h4>
                    <span className="text-[8px] font-black text-slate-300 uppercase bg-slate-50 px-2 py-1 rounded">#{i + 1}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-bold mb-4">
                    <span className="flex items-center"><span className="mr-1">📍</span> {f.address}</span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-400 italic line-clamp-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">"{f.clinicalContext}"</p>
                  <div className="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-[9px] font-black text-[#3b5bfd] uppercase tracking-widest group-hover:translate-x-1 transition-transform">Visit Profile ➜</span>
                    <div className="flex space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-xs">📞</div>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-xs">✉️</div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
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
