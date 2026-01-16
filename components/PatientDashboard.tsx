
import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { User, Appointment, AppointmentStatus, MedicalReport, Prescription, Payment, PaymentStatus, Vitals } from '../types';
import { MOCK_DOCTORS } from '../constants';
import { createClinicalIntakeSession, createSymptomCheckerSession, extractClinicalSummary, searchNearbyClinics } from '../services/geminiService';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';

interface ChatMessage { role: 'user' | 'ai'; text: string; }
interface ClinicResult { name: string; uri: string; description?: string; snippet?: string; rating?: string; distance?: string; type: 'Clinic' | 'Lab' | 'Hospital'; address: string; }

interface PatientDashboardProps {
  user: User;
  appointments: Appointment[];
  medicalReports: MedicalReport[];
  prescriptions: Prescription[];
  payments: Payment[];
  onBook: (doctorId: string, doctorName: string, date: string, time: string) => void;
  onAddReport: (report: MedicalReport) => void;
  onUploadPrescription: (prescription: Prescription) => void;
  onJoinCall?: (doctorName: string) => void;
  view?: 'dashboard' | 'analytics' | 'payments' | 'reports' | 'reminders' | 'facilities';
}

const PatientDashboard: React.FC<PatientDashboardProps> = ({ 
  user, appointments, medicalReports, prescriptions, payments, onBook, onAddReport, onUploadPrescription, onJoinCall, view: initialView = 'dashboard' 
}) => {
  const [activeTab, setActiveTab] = useState(initialView);
  const [dietPreference, setDietPreference] = useState<'Vegan' | 'Vegetarian' | 'Non-Vegetarian'>('Vegetarian');
  const [waterIntake, setWaterIntake] = useState(1250); // in ml
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  const [reportTab, setReportTab] = useState<'Uploaded' | 'AI'>('Uploaded');
  const [facilityFilter, setFacilityFilter] = useState<'ALL' | 'Clinic' | 'Lab' | 'Hospital'>('ALL');

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatType, setChatType] = useState<'intake' | 'symptom'>('intake');
  const [chatInput, setChatInput] = useState('');
  const [symptomSeverity, setSymptomSeverity] = useState(1);
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [reportReady, setReportReady] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const demographics = useMemo(() => ({
    dob: user.dob || '1990-05-15',
    address: user.address || '123 Healthway Dr, SF',
    height: user.height || 178,
    weight: user.weight || 75,
    age: user.dob ? (new Date().getFullYear() - new Date(user.dob).getFullYear()) : 34
  }), [user.dob, user.address, user.height, user.weight]);
  
  const chatSessionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialView);
  }, [initialView]);

  const bpData = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    systolic: 110 + Math.floor(Math.random() * 30),
    diastolic: 70 + Math.floor(Math.random() * 20),
  })), []);

  const sugarData = useMemo(() => Array.from({ length: 15 }, (_, i) => ({
    day: i + 1,
    fasting: 85 + Math.floor(Math.random() * 20),
    postMeal: 120 + Math.floor(Math.random() * 40),
  })), []);

  const facilityList = useMemo((): ClinicResult[] => [
    { name: 'City Central Hospital', type: 'Hospital', address: '456 Healthcare Blvd', distance: '1.2 miles', rating: '4.9', uri: '#' },
    { name: 'Blue Sky Clinic', type: 'Clinic', address: '789 Wellness St', distance: '0.8 miles', rating: '4.7', uri: '#' },
    { name: 'Quest Diagnostics Lab', type: 'Lab', address: '101 Bio Ave', distance: '2.5 miles', rating: '4.5', uri: '#' },
    { name: 'Green Valley Medical', type: 'Clinic', address: '202 Leafy Dr', distance: '3.1 miles', rating: '4.3', uri: '#' },
    { name: 'Mercy Emergency Care', type: 'Hospital', address: '303 Urgent Pl', distance: '4.0 miles', rating: '4.8', uri: '#' },
    { name: 'LabCorp Center', type: 'Lab', address: '404 Sample Rd', distance: '1.9 miles', rating: '4.6', uri: '#' },
    { name: 'Pacific Pediatrics', type: 'Clinic', address: '505 Kid Way', distance: '2.2 miles', rating: '4.9', uri: '#' },
    { name: 'St. Jude Heart Center', type: 'Hospital', address: '606 Valve Ln', distance: '5.5 miles', rating: '5.0', uri: '#' },
    { name: 'North Pathological Lab', type: 'Lab', address: '707 Cell Blvd', distance: '3.8 miles', rating: '4.2', uri: '#' },
    { name: 'Sunset General', type: 'Clinic', address: '808 Twilight Ct', distance: '1.5 miles', rating: '4.4', uri: '#' },
  ], []);

  const filteredFacilities = useMemo(() => 
    facilityList.filter(f => facilityFilter === 'ALL' || f.type === facilityFilter),
  [facilityList, facilityFilter]);

  const mealSuggestions = useMemo(() => ({
    Vegan: ['Quinoa Salad with Chickpeas', 'Lentil Soup with Whole Grain Bread', 'Tofu Stir-fry with Brown Rice'],
    Vegetarian: ['Greek Yogurt with Berries', 'Spinach & Feta Omelette', 'Pasta Primavera with Parmesan'],
    'Non-Vegetarian': ['Grilled Salmon with Asparagus', 'Chicken Breast with Roasted Roots', 'Turkey Wrap with Avocado']
  }), []);

  const handleSendMessage = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawMessage = chatInput.trim();
    if (!rawMessage || isTyping) return;

    // Structured message if severity is provided
    const messageToSend = chatType === 'symptom' 
      ? `Severity Level: ${symptomSeverity}/10. Patient Message: ${rawMessage}`
      : rawMessage;

    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: rawMessage }]); // Display raw text to user
    setIsTyping(true);
    try {
      const response = await chatSessionRef.current.sendMessage({ message: messageToSend });
      const aiText = response.text || "I'm sorry, I couldn't process that.";
      setChatHistory(prev => [...prev, { role: 'ai', text: aiText }]);
      if (chatType === 'intake' && aiText.toLowerCase().includes("report is ready")) setReportReady(true);
    } catch (e) { 
      setChatHistory(prev => [...prev, { role: 'ai', text: "Error connecting to service." }]);
    } finally { setIsTyping(false); }
  };

  const handleGenerateAndSaveReport = async () => {
    setIsGeneratingReport(true);
    const historyText = chatHistory.map(m => `${m.role === 'user' ? 'Patient' : 'AI'}: ${m.text}`).join('\n');
    try {
      const summary = await extractClinicalSummary(historyText);
      const newReport: MedicalReport = { id: Math.random().toString(36).substr(2, 9), date: new Date().toLocaleDateString(), doctorName: 'AI Clinical Assistant', patientId: user.id, findings: summary, type: 'AI Pre-Assessment', demographics: demographics };
      onAddReport(newReport);
      setIsChatOpen(false);
      setChatHistory([]);
      setReportReady(false);
    } finally { setIsGeneratingReport(false); }
  };

  const myPayments = useMemo(() => payments.filter(p => p.patientId === user.id), [payments, user.id]);

  const renderDashboard = () => (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button 
          onClick={() => { setChatType('symptom'); setSymptomSeverity(1); setChatHistory([{ role: 'ai', text: "Describe your symptoms. You can use the slider below to indicate pain or discomfort severity." }]); chatSessionRef.current = createSymptomCheckerSession(); setIsChatOpen(true); }} 
          className="shadow-card p-6 bg-white flex items-center space-x-5 border border-slate-100 group hover:border-blue-300 transition-all text-left outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Open Symptom Checker Triage"
        >
           <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-2xl" aria-hidden="true">🌡️</div>
           <div><p className="text-[10px] font-black uppercase text-slate-400">Triage</p><p className="text-lg font-bold text-slate-800">Symptom Checker</p></div>
        </button>
        <div className="shadow-card p-6 bg-white flex items-center space-x-5 border border-slate-100" role="status" aria-label="Care Status">
           <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-2xl" aria-hidden="true">🥗</div>
           <div><p className="text-[10px] font-black uppercase text-slate-400">Status</p><p className="text-lg font-bold text-green-600">Active Care</p></div>
        </div>
        <div className="shadow-card p-6 bg-white flex items-center space-x-5 border border-slate-100" aria-label="Billing status">
           <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl" aria-hidden="true">💰</div>
           <div><p className="text-[10px] font-black uppercase text-slate-400">Billing</p><p className="text-lg font-bold text-slate-800">${myPayments.reduce((acc, p) => acc + (p.status === PaymentStatus.PENDING ? p.amount : 0), 0)} Pending</p></div>
        </div>
        <button 
          onClick={() => { setChatType('intake'); setChatHistory([{ role: 'ai', text: "Hello! Ready for your checkup?" }]); chatSessionRef.current = createClinicalIntakeSession(); setIsChatOpen(true); }} 
          className="btn-primary p-6 rounded-[24px] shadow-lg text-left overflow-hidden group outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
          aria-label="Open clinical intake portal"
        >
           <div className="relative z-10"><p className="text-[10px] font-black uppercase text-blue-200">Intake Portal</p><p className="text-lg font-bold">Clinical Pre-Check</p></div>
           <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-125 transition-transform" aria-hidden="true">🤖</div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="shadow-card p-10 bg-white border border-slate-100" aria-labelledby="vitals-summary-heading">
             <div className="flex items-center justify-between mb-10">
                <h3 id="vitals-summary-heading" className="text-2xl font-black text-slate-800 tracking-tight">Daily Vitals Summary</h3>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest" aria-live="polite">Last updated: Just Now</span>
             </div>
             <div className="grid grid-cols-3 gap-8 text-center">
                <div>
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Blood Pressure</p>
                   <p className="text-3xl font-black text-slate-800 tracking-tighter">120/80</p>
                   <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Optimal</span>
                </div>
                <div className="border-x border-slate-100">
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Heart Rate</p>
                   <p className="text-3xl font-black text-slate-800 tracking-tighter">72<span className="text-sm font-bold text-slate-300 ml-1">bpm</span></p>
                   <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Resting</span>
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Blood Sugar</p>
                   <p className="text-3xl font-black text-slate-800 tracking-tighter">98<span className="text-sm font-bold text-slate-300 ml-1">mg/dl</span></p>
                   <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Normal</span>
                </div>
             </div>
          </section>

          <section className="shadow-card p-10 bg-white border border-slate-100 relative overflow-hidden" aria-labelledby="help-explorer-heading">
             <div className="relative z-10">
                <h3 id="help-explorer-heading" className="text-2xl font-black text-slate-800 tracking-tight mb-4">Finding clinical help?</h3>
                <p className="text-sm text-slate-500 max-w-[400px] leading-relaxed mb-8">Search for verified laboratories, hospitals, and pharmacies in your immediate vicinity.</p>
                <button onClick={() => setActiveTab('facilities')} className="px-8 py-4 bg-[#3b5bfd] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#2d46e5] shadow-xl shadow-blue-500/20 transition-all outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600">Explore Facilities Map</button>
             </div>
             <div className="absolute right-[-20px] top-[-20px] w-64 h-64 opacity-5 pointer-events-none" aria-hidden="true">
                <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
             </div>
          </section>
        </div>

        <aside className="space-y-8" aria-label="Upcoming Schedule">
          <div className="shadow-card p-8 bg-[#1a1d1f] text-white rounded-[40px] relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 text-5xl" aria-hidden="true">📅</div>
             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-8">Upcoming Consult</h4>
             {appointments.length > 0 ? (
               <div className="space-y-6">
                 <div>
                    <p className="text-2xl font-black tracking-tight">{appointments[0].doctorName}</p>
                    <p className="text-sm text-slate-400 mt-1">Specialist Consultation</p>
                 </div>
                 <div className="flex items-center space-x-4">
                    <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</p>
                       <p className="text-sm font-bold">{appointments[0].date}</p>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time</p>
                       <p className="text-sm font-bold">{appointments[0].time}</p>
                    </div>
                 </div>
                 <button className="w-full py-4 bg-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all outline-none focus:ring-2 focus:ring-blue-400">Add to Calendar</button>
               </div>
             ) : (
               <p className="text-sm text-slate-400 font-medium">No appointments scheduled.</p>
             )}
          </div>

          <div className="shadow-card p-8 bg-white border border-slate-100 rounded-[40px]">
             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Request Specialist</h4>
             <div className="space-y-4">
                <label htmlFor="select-doctor" className="sr-only">Choose Specialist</label>
                <select id="select-doctor" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}>
                   <option value="">Choose Specialist</option>
                   {MOCK_DOCTORS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <label htmlFor="select-date" className="sr-only">Choose Date</label>
                <input id="select-date" type="date" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500" value={date} onChange={e => setDate(e.target.value)} />
                <button onClick={() => onBook(selectedDoctor, '', date, '10:00 AM')} disabled={!selectedDoctor || !date} className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50">Request Slot</button>
             </div>
          </div>
        </aside>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-10 animate-in fade-in duration-500">
       <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Clinical Records</h2>
          <button className="px-8 py-4 bg-[#3b5bfd] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-[#2d46e5] transition-all flex items-center space-x-3 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
             <span>Upload New Report</span>
          </button>
       </div>

       <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden" role="region" aria-label="Reports Management">
          <div className="flex border-b border-slate-50 px-10" role="tablist">
             <button role="tab" aria-selected={reportTab === 'Uploaded'} aria-controls="uploaded-reports-panel" onClick={() => setReportTab('Uploaded')} className={`py-6 px-6 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all outline-none focus:text-blue-600 ${reportTab === 'Uploaded' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400'}`}>Medical Files</button>
             <button role="tab" aria-selected={reportTab === 'AI'} aria-controls="ai-reports-panel" onClick={() => setReportTab('AI')} className={`py-6 px-6 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all outline-none focus:text-blue-600 ${reportTab === 'AI' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400'}`}>AI Intake Reports</button>
          </div>

          <div className="p-10" id={`${reportTab === 'Uploaded' ? 'uploaded' : 'ai'}-reports-panel`} role="tabpanel">
             {reportTab === 'Uploaded' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {medicalReports.map((r, i) => (
                      <div key={i} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                         <div className="flex items-center space-x-5">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm" aria-hidden="true">📄</div>
                            <div>
                               <p className="text-sm font-black text-slate-800">{r.type || 'Clinical Report'}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{r.date} • {r.doctorName}</p>
                            </div>
                         </div>
                         <div className="flex items-center space-x-3">
                            <button className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all outline-none focus:ring-2 focus:ring-blue-400" aria-label={`Download ${r.type}`}>⬇️</button>
                            <button className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all outline-none focus:ring-2 focus:ring-rose-400" aria-label={`Delete ${r.type}`}>🗑️</button>
                         </div>
                      </div>
                   ))}
                </div>
             ) : (
                <div className="space-y-6">
                   {medicalReports.filter(r => r.doctorName === 'AI Clinical Assistant').map((r, i) => (
                      <article key={i} className="p-8 bg-blue-50/30 rounded-[32px] border border-blue-100/50 space-y-4">
                         <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                               <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center font-black" aria-hidden="true">🤖</div>
                               <div>
                                  <p className="text-sm font-black text-slate-800">Pre-Check Record</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.date}</p>
                               </div>
                            </div>
                            <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Verified</span>
                         </div>
                         <div className="text-sm text-slate-600 leading-relaxed font-medium bg-white p-6 rounded-2xl border border-blue-50">
                            {r.findings}
                         </div>
                      </article>
                   ))}
                </div>
             )}
          </div>
       </div>
    </div>
  );

  const renderReminders = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-500">
       <div className="lg:col-span-8 space-y-10">
          <section className="shadow-card p-10 bg-white border border-slate-100 rounded-[40px]" aria-labelledby="medication-schedule-heading">
             <h3 id="medication-schedule-heading" className="text-2xl font-black text-slate-800 tracking-tight mb-8">Medication Schedule</h3>
             <div className="space-y-4">
                {prescriptions.map((p, i) => (
                   <div key={i} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:border-blue-200 transition-all group">
                      <div className="flex items-center space-x-6">
                         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform" aria-hidden="true">💊</div>
                         <div>
                            <p className="text-base font-black text-slate-800 leading-tight">{p.medicationName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-2">{p.dosage} • {p.date}</p>
                         </div>
                      </div>
                      <div className="flex items-center space-x-8">
                         <div className="text-right hidden sm:block">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Next Dose</p>
                            <p className="text-sm font-black text-slate-800 mt-1">In 3h 15m</p>
                         </div>
                         <input type="checkbox" className="w-6 h-6 rounded-lg accent-green-500 border-slate-200" aria-label={`Mark ${p.medicationName} as taken`} />
                      </div>
                   </div>
                ))}
             </div>
          </section>

          <section className="shadow-card p-10 bg-white border border-slate-100 rounded-[40px]" aria-labelledby="nutrition-heading">
             <div className="flex items-center justify-between mb-10">
                <h3 id="nutrition-heading" className="text-2xl font-black text-slate-800 tracking-tight">Clinical Nutrition</h3>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl" role="radiogroup" aria-label="Dietary preference">
                   {['Vegan', 'Vegetarian', 'Non-Vegetarian'].map(diet => (
                      <button 
                        key={diet} 
                        role="radio"
                        aria-checked={dietPreference === diet}
                        onClick={() => setDietPreference(diet as any)}
                        className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all outline-none focus:ring-1 focus:ring-blue-400 ${dietPreference === diet ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      >
                         {diet}
                      </button>
                   ))}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {mealSuggestions[dietPreference].map((meal, i) => (
                   <div key={i} className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 space-y-4 flex flex-col justify-between">
                      <div>
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm mb-4" aria-hidden="true">🥗</div>
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Meal {i+1}</p>
                         <p className="text-sm font-black text-slate-800 leading-tight">{meal}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-center">
                         <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase">Cal</p>
                            <p className="text-[10px] font-black text-slate-700">{400 + i*50}</p>
                         </div>
                         <div className="border-x border-slate-100">
                            <p className="text-[8px] font-black text-slate-400 uppercase">Prot</p>
                            <p className="text-[10px] font-black text-slate-700">{15 + i*2}g</p>
                         </div>
                         <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase">Carb</p>
                            <p className="text-[10px] font-black text-slate-700">{45 + i*5}g</p>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </section>
       </div>

       <div className="lg:col-span-4 space-y-10">
          <section className="shadow-card p-10 bg-blue-50/30 border border-blue-100 rounded-[40px] flex flex-col items-center text-center" aria-labelledby="hydration-heading">
             <div className="w-20 h-20 bg-blue-500 text-white rounded-[28px] flex items-center justify-center text-3xl shadow-xl shadow-blue-500/20 mb-8" aria-hidden="true">💧</div>
             <h3 id="hydration-heading" className="text-2xl font-black text-blue-900 tracking-tight leading-none mb-4">Hydration</h3>
             <p className="text-xs font-bold text-blue-600/60 uppercase tracking-[0.2em] mb-8">Goal: 2.5 Liters / Day</p>
             
             <div className="w-full h-3 bg-white/50 rounded-full overflow-hidden mb-6 border border-blue-100" role="progressbar" aria-valuenow={waterIntake} aria-valuemin={0} aria-valuemax={2500}>
                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(waterIntake / 2500) * 100}%` }}></div>
             </div>
             
             <p className="text-4xl font-black text-blue-900 tracking-tighter mb-10">{waterIntake}<span className="text-sm font-bold text-blue-400 ml-1">ml</span></p>
             
             <button 
                onClick={() => setWaterIntake(prev => Math.min(2500, prev + 250))}
                className="w-full py-5 bg-white text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm hover:shadow-lg transition-all outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Log 250ml water intake"
             >
                Log 250ml Glass
             </button>
          </section>
       </div>
    </div>
  );

  const renderFacilities = () => (
    <div className="space-y-10 animate-in fade-in duration-500">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
             <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Facility Explorer</h2>
             <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-4">Verified Clinical Labs, Hospitals & Pharmacies</p>
          </div>
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm" role="group" aria-label="Facility filter categories">
             {['ALL', 'Clinic', 'Lab', 'Hospital'].map(f => (
                <button 
                  key={f} 
                  onClick={() => setFacilityFilter(f as any)}
                  aria-pressed={facilityFilter === f}
                  className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all outline-none focus:ring-2 focus:ring-blue-500 ${facilityFilter === f ? 'bg-[#3b5bfd] text-white shadow-lg shadow-blue-500/10' : 'text-slate-400'}`}
                >
                   {f}s
                </button>
             ))}
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden h-[600px] relative" role="application" aria-label="Facility location map">
             <div className="absolute inset-0 bg-slate-100 map-container"></div>
             {filteredFacilities.map((f, i) => (
                <div key={i} className={`absolute w-4 h-4 rounded-full border-4 border-white shadow-lg animate-pulse`} 
                  style={{ 
                    top: `${20 + Math.random() * 60}%`, 
                    left: `${20 + Math.random() * 60}%`,
                    backgroundColor: f.type === 'Hospital' ? '#f43f5e' : f.type === 'Lab' ? '#22c55e' : '#3b5bfd' 
                  }}
                  title={`${f.name} (${f.type})`}
                  aria-hidden="true"
                ></div>
             ))}
             <div className="absolute bottom-10 left-10 p-6 bg-white/80 backdrop-blur-md rounded-[32px] border border-white flex flex-col items-center shadow-lg">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">My Location</p>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-50" aria-hidden="true">📍</div>
             </div>
          </div>

          <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
             <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Nearby Facilities</h4>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-4" role="list">
                {filteredFacilities.map((f, i) => (
                   <article key={i} className="p-6 bg-slate-50/50 border border-slate-100 rounded-3xl hover:bg-white hover:border-blue-100 transition-all group" role="listitem">
                      <div className="flex items-center justify-between mb-4">
                         <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${f.type === 'Hospital' ? 'bg-rose-50 text-rose-500 border-rose-100' : f.type === 'Lab' ? 'bg-green-50 text-green-500 border-green-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
                            {f.type}
                         </span>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest" aria-label={`Rating ${f.rating}`}>⭐ {f.rating}</span>
                      </div>
                      <h5 className="text-base font-black text-slate-800 group-hover:text-blue-600 transition-colors">{f.name}</h5>
                      <p className="text-[11px] font-bold text-slate-400 mt-2 leading-relaxed">{f.address}</p>
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100/50">
                         <span className="text-point-blue text-[9px] font-black text-slate-300 uppercase tracking-widest">{f.distance} away</span>
                         <a href={f.uri} className="text-[9px] font-black text-blue-500 uppercase tracking-widest outline-none focus:underline">Get Directions ➜</a>
                      </div>
                   </article>
                ))}
             </div>
          </div>
       </div>
    </div>
  );

  const renderAnalytics = () => {
    const recentCheckups = [
      { date: 'May 22, 2024', doctor: 'Dr. Sarah Wilson', complaint: 'Routine Cardiology Audit', status: 'Cleared', time: '10:00 AM' },
      { date: 'May 15, 2024', doctor: 'Dr. James Chen', complaint: 'Seasonal Allergy Review', status: 'Follow-up', time: '02:30 PM' },
      { date: 'April 28, 2024', doctor: 'Dr. Emily Blunt', complaint: 'Migraine Assessment', status: 'Cleared', time: '11:15 AM' },
      { date: 'April 10, 2024', doctor: 'Dr. Sarah Wilson', complaint: 'BP Medication Adjustment', status: 'In Review', time: '09:45 AM' },
      { date: 'March 25, 2024', doctor: 'Dr. Emily Blunt', complaint: 'General Wellness Exam', status: 'Cleared', time: '04:00 PM' },
    ];

    return (
      <div className="space-y-10 animate-in fade-in duration-500">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6" role="list" aria-label="Key Health Metrics">
            {[
              { l: 'Latest BP', v: '118/78', s: 'Optimal', c: 'text-green-500' },
              { l: 'Avg Heart Rate', v: '74 bpm', s: 'Standard', c: 'text-blue-500' },
              { l: 'Blood Glucose', v: '95 mg/dl', s: 'Optimal', c: 'text-green-500' },
              { l: 'Health Score', v: '88/100', s: 'Excellent', c: 'text-purple-500' }
            ].map((s, i) => (
              <div key={i} className="shadow-card p-8 bg-white border border-slate-100 flex flex-col items-center text-center" role="listitem">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{s.l}</p>
                 <p className="text-3xl font-black text-slate-800 tracking-tighter mb-2">{s.v}</p>
                 <span className={`text-[9px] font-black uppercase tracking-widest ${s.c}`}>{s.s}</span>
              </div>
            ))}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <section className="shadow-card p-10 bg-white border border-slate-100 rounded-[48px]" aria-labelledby="bp-chart-heading">
               <h3 id="bp-chart-heading" className="text-xl font-black text-slate-800 tracking-tight mb-10 flex items-center">
                  <span className="w-1.5 h-6 bg-rose-500 rounded-full mr-4" aria-hidden="true"></span> BP Monitoring (30 Days)
               </h3>
               <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={bpData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorDia" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b5bfd" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b5bfd" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#cbd5e1'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#cbd5e1'}} domain={[60, 160]} />
                        <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 800, fontSize: '12px'}} />
                        <Area type="monotone" dataKey="systolic" stroke="#f43f5e" strokeWidth={4} fill="url(#colorSys)" name="Systolic" />
                        <Area type="monotone" dataKey="diastolic" stroke="#3b5bfd" strokeWidth={4} fill="url(#colorDia)" name="Diastolic" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </section>

            <section className="shadow-card p-10 bg-white border border-slate-100 rounded-[48px]" aria-labelledby="sugar-chart-heading">
               <h3 id="sugar-chart-heading" className="text-xl font-black text-slate-800 tracking-tight mb-10 flex items-center">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full mr-4" aria-hidden="true"></span> Blood Sugar Audit
               </h3>
               <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={sugarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#cbd5e1'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#cbd5e1'}} domain={[60, 200]} />
                        <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 800, fontSize: '12px'}} />
                        <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px'}} />
                        <Line type="stepAfter" dataKey="fasting" stroke="#3b5bfd" strokeWidth={4} dot={{r: 4, strokeWidth: 2, fill: 'white'}} name="Fasting" />
                        <Line type="stepAfter" dataKey="postMeal" stroke="#10b981" strokeWidth={4} dot={{r: 4, strokeWidth: 2, fill: 'white'}} name="Post-Meal" />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </section>
         </div>

         {/* RECENT CHECKUPS TIMELINE */}
         <section className="shadow-card p-10 bg-white border border-slate-100 rounded-[48px]" aria-labelledby="timeline-heading">
            <div className="flex items-center justify-between mb-12">
               <h3 id="timeline-heading" className="text-xl font-black text-slate-800 tracking-tight flex items-center">
                  <span className="w-2 h-6 bg-[#3b5bfd] rounded-full mr-4 shadow-lg shadow-blue-500/20"></span>
                  Recent Checkups Timeline
               </h3>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical History Audit</span>
            </div>
            
            <div className="relative pl-12 space-y-12">
               {/* Vertical Connector Line */}
               <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-slate-100" aria-hidden="true"></div>
               
               {recentCheckups.map((checkup, i) => (
                  <article key={i} className="relative flex flex-col md:flex-row md:items-center justify-between group">
                     {/* Timeline Node */}
                     <div className="absolute -left-[54px] top-1.5 w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm z-10 transition-all group-hover:border-blue-500 group-hover:scale-110">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 group-hover:animate-pulse"></div>
                     </div>
                     
                     <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                           <p className="text-sm font-black text-slate-800">{checkup.date}</p>
                           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                           <p className="text-xs font-bold text-[#3b5bfd] uppercase tracking-widest">{checkup.time}</p>
                        </div>
                        <h4 className="text-lg font-black text-slate-900 leading-tight mb-1">{checkup.doctor}</h4>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">
                           <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mr-2">Chief Complaint:</span> 
                           {checkup.complaint}
                        </p>
                     </div>
                     
                     <div className="mt-4 md:mt-0 md:ml-8 flex items-center space-x-4">
                        <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-colors ${
                           checkup.status === 'Cleared' ? 'bg-green-50 text-green-600 border-green-100' : 
                           checkup.status === 'Follow-up' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                           'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                           {checkup.status}
                        </span>
                        <button className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-sm">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                     </div>
                  </article>
               ))}
            </div>
         </section>
      </div>
    );
  };

  const getSeverityColor = (val: number) => {
    if (val <= 3) return 'bg-green-500';
    if (val <= 7) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getSeverityLabel = (val: number) => {
    if (val <= 2) return 'Mild / Nuisance';
    if (val <= 4) return 'Nagging / Uncomfortable';
    if (val <= 6) return 'Moderate / Distressing';
    if (val <= 8) return 'Severe / Intense';
    return 'Unbearable / Emergency';
  };

  return (
    <div className="pb-20">
      {/* Navigation Tabs - Landmark: navigation */}
      <nav className="flex items-center space-x-2 bg-white/50 backdrop-blur-md p-1.5 rounded-[24px] border border-white/50 mb-10 w-fit" aria-label="Dashboard views">
         {[
           { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
           { id: 'reminders', label: 'Reminders', icon: '⏰' },
           { id: 'reports', label: 'Reports', icon: '📄' },
           { id: 'facilities', label: 'Nearby Labs', icon: '📍' },
           { id: 'analytics', label: 'Analytics', icon: '📊' },
         ].map(t => (
           <button 
              key={t.id} 
              onClick={() => setActiveTab(t.id as any)}
              aria-current={activeTab === t.id ? 'true' : undefined}
              className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 outline-none focus:ring-2 focus:ring-blue-500 ${activeTab === t.id ? 'bg-white text-[#3b5bfd] shadow-xl shadow-blue-500/5' : 'text-slate-400 hover:text-slate-600'}`}
           >
              <span aria-hidden="true">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
           </button>
         ))}
      </nav>

      {/* Dynamic Content Panels */}
      <div id="dashboard-content" aria-live="polite">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'reminders' && renderReminders()}
        {activeTab === 'facilities' && renderFacilities()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'payments' && <div className="p-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">Payment History Portal Coming Soon</div>}
      </div>
      
      {/* Modal - Landmark: dialog */}
      {isChatOpen && (
        <div 
          className="fixed inset-0 z-[500] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-heading"
        >
           <div className="max-w-md w-full shadow-card h-[680px] flex flex-col overflow-hidden bg-white shadow-2xl rounded-[40px]">
              <div className={`p-8 ${chatType === 'symptom' ? 'bg-[#1a1d1f]' : 'bg-[#3b5bfd]'} text-white flex justify-between items-center`}>
                 <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black" aria-hidden="true">🤖</div>
                    <div><p id="chat-heading" className="font-bold text-sm">Cayr AI</p><p className="text-[9px] font-black uppercase opacity-60">{chatType === 'symptom' ? 'Triage Assistant' : 'Clinical Analysis'}</p></div>
                 </div>
                 <button 
                  onClick={() => setIsChatOpen(false)} 
                  className="text-white/60 hover:text-white p-2 text-xl outline-none focus:ring-2 focus:ring-white rounded-lg"
                  aria-label="Close Chat"
                 >✕</button>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-4 bg-slate-50/50" aria-live="polite">
                 {chatHistory.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[85%] p-5 rounded-[24px] text-[13px] leading-relaxed font-medium ${m.role === 'user' ? 'bg-[#3b5bfd] text-white rounded-tr-none' : 'bg-white text-slate-700 border rounded-tl-none shadow-sm'}`}>{m.text}</div>
                    </div>
                 ))}
                 {isTyping && <div className="text-[10px] text-blue-500 font-black uppercase animate-pulse">Analyzing Clinical Data...</div>}
              </div>
              <div className="p-8 border-t bg-white space-y-6">
                 {reportReady && <button onClick={handleGenerateAndSaveReport} disabled={isGeneratingReport} className="w-full bg-[#e8f7f0] text-green-600 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest mb-4 outline-none focus:ring-2 focus:ring-green-400">Complete Pre-Assessment</button>}
                 
                 {/* Distinct Severity Input Field */}
                 {chatType === 'symptom' && (
                    <div className="animate-in slide-in-from-bottom-2 duration-500">
                       <div className="flex items-center justify-between mb-3">
                          <label htmlFor="severity-slider" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Severity Scale</label>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black text-white ${getSeverityColor(symptomSeverity)} transition-colors`}>{symptomSeverity}/10</span>
                       </div>
                       <input 
                          id="severity-slider"
                          type="range" 
                          min="1" 
                          max="10" 
                          value={symptomSeverity} 
                          onChange={(e) => setSymptomSeverity(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#3b5bfd]"
                       />
                       <p className="text-[10px] font-bold text-slate-400 mt-2 text-center italic">{getSeverityLabel(symptomSeverity)}</p>
                    </div>
                 )}

                 <form onSubmit={handleSendMessage} className="flex space-x-3">
                    <input 
                      value={chatInput} 
                      onChange={e => setChatInput(e.target.value)} 
                      className="flex-1 bg-slate-50 border p-4 rounded-2xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                      placeholder={chatType === 'symptom' ? "Describe your feeling..." : "Type your message..."}
                      aria-label="Chat input message"
                    />
                    <button className="bg-[#3b5bfd] text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600" aria-label="Send message">➜</button>
                 </form>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
