
import React, { useState, useMemo, useEffect } from 'react';
import { User, Appointment, AppointmentStatus, PatientRecord, Payment, PaymentStatus } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, AreaChart, Area, Legend, ComposedChart 
} from 'recharts';
import { searchNearbyClinics } from '../services/geminiService';

interface DoctorDashboardProps {
  user: User;
  appointments: Appointment[];
  payments: Payment[];
  updateStatus: (id: string, status: AppointmentStatus) => void;
  patients: PatientRecord[];
  onUpdatePatient: (patient: PatientRecord) => void;
  onStartCall?: (patientName: string) => void;
  initialView?: string;
}

const GENDER_DATA = [
  { name: 'Male', value: 45, color: '#8e85ff' },
  { name: 'Female', value: 30, color: '#ff5c6c' },
  { name: 'Child', value: 25, color: '#35baf3' },
];

const REVENUE_DATA = [
  { month: 'Jan', revenue: 4200 },
  { month: 'Feb', revenue: 3800 },
  { month: 'Mar', revenue: 5600 },
  { month: 'Apr', revenue: 6100 },
  { month: 'May', revenue: 7400 },
  { month: 'Jun', revenue: 8200 },
];

const VitalsLegend = (props: any) => {
  const { payload } = props;
  const getNormalRange = (label: string) => {
    if (label.includes('Pressure')) return 'Norm: 120/80';
    if (label.includes('Glucose')) return 'Norm: 70-140';
    if (label.includes('Heart Rate')) return 'Norm: 60-100';
    return '';
  };

  return (
    <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mt-8 pt-6 border-t border-slate-50">
      {payload.map((entry: any, index: number) => (
        <div key={`item-${index}`} className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none mb-1">{entry.value}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none">{getNormalRange(entry.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const PatientCardSkeleton = () => (
  <div className="bg-white p-10 rounded-[48px] shadow-sm border border-[#eff2f6] animate-pulse">
    <div className="w-24 h-24 bg-slate-100 rounded-[36px] mb-8 mx-auto"></div>
    <div className="h-6 bg-slate-100 rounded-lg w-3/4 mx-auto mb-4"></div>
    <div className="h-3 bg-slate-100 rounded-lg w-1/2 mx-auto mb-8"></div>
    <div className="w-full h-px bg-slate-50 mb-8"></div>
    <div className="space-y-4 mb-8">
      <div className="h-12 bg-slate-50 rounded-2xl w-full"></div>
      <div className="h-12 bg-slate-50 rounded-2xl w-full"></div>
    </div>
    <div className="h-14 bg-slate-100 rounded-2xl w-full"></div>
  </div>
);

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ user, appointments, payments, updateStatus, patients, onUpdatePatient, onStartCall, initialView = 'Overview' }) => {
  const [activeView, setActiveView] = useState(initialView);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(patients[0]?.id || null);
  const [isPatientsLoading, setIsPatientsLoading] = useState(false);

  useEffect(() => {
    if (activeView === 'Patients') {
      setIsPatientsLoading(true);
      const timer = setTimeout(() => setIsPatientsLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [activeView]);

  const activePatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  const vitalsTrend = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
    day: `Day ${i + 1}`,
    systolic: 115 + Math.floor(Math.random() * 20),
    diastolic: 75 + Math.floor(Math.random() * 10),
    glucose: 90 + Math.floor(Math.random() * 60),
    heartRate: 68 + Math.floor(Math.random() * 15),
  })), []);

  const myAppointments = appointments.filter(a => a.doctorId === user.id);
  const myPayments = payments.filter(p => p.doctorId === user.id);
  const pendingRequests = myAppointments.filter(a => a.status === AppointmentStatus.PENDING);
  const confirmedAppointments = myAppointments.filter(a => a.status === AppointmentStatus.CONFIRMED);

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="mb-4">
        <h1 className="text-3xl font-black text-[#1a1d1f] tracking-tight">Welcome, {user.name}</h1>
        <p className="text-sm font-semibold text-[#94a3b8] mt-1">Have a nice day at great work</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Appointments', value: confirmedAppointments.length.toString(), gradient: 'from-[#8e85ff] to-[#7367f0]', icon: '📅' },
          { label: 'Total Patients', value: patients.length.toString(), gradient: 'from-[#ff5c6c] to-[#ff8e98]', icon: '👤' },
          { label: 'Clinic Consulting', value: '53.5k', gradient: 'from-[#ffa927] to-[#ffc163]', icon: '💼' },
          { label: 'Monthly Earnings', value: `$${myPayments.reduce((acc, p) => acc + (p.status === PaymentStatus.COMPLETED ? p.amount : 0), 0)}`, gradient: 'from-[#35baf3] to-[#71d3f8]', icon: '💰' },
        ].map((stat, i) => (
          <div key={i} className={`bg-gradient-to-br ${stat.gradient} p-8 rounded-[40px] text-white shadow-[0_20px_40px_rgba(0,0,0,0.08)] relative overflow-hidden group transition-all hover:scale-[1.02] cursor-default border border-white/10`}>
            <div className="absolute inset-1 rounded-[36px] bg-white/5 backdrop-blur-[1px] border border-white/10"></div>
            <div className="flex items-center space-x-6 relative z-10">
               <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center text-2xl backdrop-blur-lg border border-white/20 shadow-inner">
                 {stat.icon}
               </div>
               <div>
                 <p className="text-4xl font-black tracking-tighter leading-none">{stat.value}</p>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mt-2">{stat.label}</p>
               </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[40px] p-10 shadow-sm border border-[#eff2f6]">
            <div className="flex items-center justify-between mb-10">
              <h3 className="font-black text-xl text-[#1a1d1f] tracking-tight flex items-center">
                Appointment Requests
                {pendingRequests.length > 0 && (
                  <span className="ml-4 px-3 py-1 bg-rose-500 text-white text-[10px] rounded-full font-black animate-pulse uppercase tracking-widest">
                    {pendingRequests.length} New
                  </span>
                )}
              </h3>
            </div>
            
            <div className="space-y-6">
              {pendingRequests.length === 0 ? (
                <div className="py-24 text-center border-2 border-dashed border-[#eff2f6] rounded-[40px] bg-[#f8fafc]">
                   <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.25em]">No pending visit requests from patients.</p>
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <div key={req.id} className="flex flex-col sm:flex-row items-center justify-between p-6 bg-[#f8fafc] rounded-[32px] border border-[#eff2f6] hover:border-[#3b5bfd]/30 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all group">
                     <div className="flex items-center space-x-6 mb-4 sm:mb-0">
                        <div className="w-16 h-16 bg-white rounded-3xl overflow-hidden border border-[#eff2f6] shadow-sm group-hover:scale-105 transition-transform duration-500">
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.patientName}`} alt="" />
                        </div>
                        <div>
                           <p className="text-lg font-black text-[#1a1d1f] leading-tight">{req.patientName}</p>
                           <p className="text-[10px] font-bold text-[#94a3b8] mt-2 uppercase tracking-widest">{req.date} • {req.time}</p>
                        </div>
                     </div>
                     <div className="flex items-center space-x-4 w-full sm:w-auto">
                        <button onClick={() => updateStatus(req.id, AppointmentStatus.CANCELLED)} className="flex-1 sm:flex-none px-8 py-4 bg-white border border-rose-100 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all">Decline</button>
                        <button onClick={() => updateStatus(req.id, AppointmentStatus.CONFIRMED)} className="flex-1 sm:flex-none px-8 py-4 bg-[#3b5bfd] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-[#2d46e5] transition-all">Confirm</button>
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white rounded-[40px] p-10 shadow-sm border border-[#eff2f6]">
              <h3 className="font-black text-xl text-[#1a1d1f] tracking-tight mb-10">Confirmed Schedule</h3>
              <div className="space-y-8">
                 {confirmedAppointments.length === 0 ? (
                    <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] text-center py-12">No confirmed sessions</p>
                 ) : (
                   confirmedAppointments.slice(0, 4).map((app) => (
                     <div key={app.id} className="flex items-center justify-between group cursor-default p-4 hover:bg-[#f8fafc] rounded-[24px] transition-all border border-transparent hover:border-[#eff2f6]">
                        <div className="flex items-center space-x-4">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#eff2f6] shadow-sm group-hover:scale-105 transition-transform">
                             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${app.patientName}`} alt="" />
                          </div>
                          <div>
                             <p className="text-sm font-black text-[#1a1d1f] leading-tight">{app.patientName}</p>
                             <p className="text-[10px] font-bold text-[#94a3b8] mt-1 uppercase tracking-widest">Visit Scheduled</p>
                          </div>
                        </div>
                        <div className="text-right">
                           <span className="text-[11px] font-black text-[#3b5bfd] bg-blue-50 px-3 py-1.5 rounded-xl">{app.time}</span>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-[#1a1d1f] tracking-tight">Financial & Clinical Analytics</h2>
        <div className="flex space-x-4">
           <select className="bg-white border border-[#eff2f6] px-5 py-3 rounded-2xl text-xs font-black outline-none shadow-sm cursor-pointer hover:border-[#3b5bfd]/30 transition-all uppercase tracking-widest">
              <option>Last 6 Months</option>
              <option>Last Year</option>
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[40px] p-10 shadow-sm border border-[#eff2f6]">
           <h3 className="font-black text-lg text-[#1a1d1f] mb-8 flex items-center">
             <span className="w-2 h-6 bg-[#3b5bfd] rounded-full mr-4 shadow-lg shadow-blue-500/20"></span>
             Revenue Growth
           </h3>
           <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={REVENUE_DATA}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b5bfd" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3b5bfd" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} dy={15} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                    <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 800, fontSize: '12px', padding: '16px'}} cursor={{stroke: '#3b5bfd', strokeWidth: 1}} />
                    <Area type="monotone" dataKey="revenue" stroke="#3b5bfd" strokeWidth={5} fillOpacity={1} fill="url(#colorRev)" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white rounded-[40px] p-10 shadow-sm border border-[#eff2f6]">
           <h3 className="font-black text-lg text-[#1a1d1f] mb-10 flex items-center">
             <span className="w-2 h-6 bg-rose-500 rounded-full mr-4 shadow-lg shadow-rose-500/20"></span>
             Patient Demographics
           </h3>
           <div className="h-64 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={GENDER_DATA} innerRadius={75} outerRadius={95} paddingAngle={10} dataKey="value" stroke="none">
                       {GENDER_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)'}} />
                 </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                 <p className="text-3xl font-black text-[#1a1d1f]">100%</p>
                 <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] mt-1">Scale</p>
              </div>
           </div>
           <div className="mt-10 space-y-5">
              {GENDER_DATA.map((d, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-2xl hover:bg-[#f8fafc] transition-all">
                   <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{backgroundColor: d.color}}></div>
                      <span className="text-xs font-black text-[#94a3b8] uppercase tracking-widest">{d.name}</span>
                   </div>
                   <span className="text-sm font-black text-[#1a1d1f]">{d.value}%</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );

  const renderPatients = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-[#1a1d1f] tracking-tight">Patient Directory</h2>
        <div className="flex bg-white px-6 py-3.5 rounded-full border border-[#eff2f6] items-center space-x-4 shadow-sm focus-within:border-[#3b5bfd]/30 transition-all">
           <svg className="w-5 h-5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
           <input placeholder="Search records..." className="text-sm font-black outline-none w-64 bg-transparent placeholder-[#94a3b8]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         {isPatientsLoading ? (
           Array.from({ length: 8 }).map((_, i) => <PatientCardSkeleton key={i} />)
         ) : (
           patients.map((p, i) => (
            <div key={p.id} className="bg-white p-10 rounded-[48px] shadow-sm border border-[#eff2f6] hover:border-[#3b5bfd]/30 hover:shadow-2xl hover:shadow-blue-500/5 transition-all group flex flex-col items-center relative overflow-hidden">
               <div className="w-24 h-24 bg-[#f8fafc] rounded-[36px] overflow-hidden mb-8 border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-700">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" />
               </div>
               <h4 className="font-black text-[#1a1d1f] text-xl leading-tight text-center">{p.name}</h4>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-3">{p.age} Years • {p.gender}</p>
               
               <div className="w-full h-px bg-[#eff2f6] my-8"></div>
               
               <div className="w-full space-y-4 mb-10">
                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-[#eff2f6] flex items-center justify-between group-hover:bg-blue-50 transition-colors">
                     <div className="text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Primary Condition</p>
                        <p className="text-xs font-black text-[#1a1d1f] truncate max-w-[120px]">{p.primaryCondition || 'General Review'}</p>
                     </div>
                     <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm text-xs" aria-hidden="true">🩺</div>
                  </div>
                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-[#eff2f6] flex items-center justify-between group-hover:bg-blue-50 transition-colors">
                     <div className="text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Interaction</p>
                        <p className="text-xs font-black text-[#3b5bfd]">{p.lastVisit || 'No Record'}</p>
                     </div>
                     <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm text-xs" aria-hidden="true">🗓️</div>
                  </div>
               </div>

               <button onClick={() => { setActiveView('My Patients'); setSelectedPatientId(p.id); }} className="w-full py-5 bg-[#1a1d1f] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#3b5bfd] hover:shadow-xl hover:shadow-blue-500/20 transition-all active:scale-95">Open Medical Chart</button>
            </div>
           ))
         )}
      </div>
    </div>
  );

  const renderPayments = () => (
     <div className="space-y-8 animate-in fade-in duration-500">
        <h2 className="text-2xl font-black text-[#1a1d1f] tracking-tight">Transaction History & Earnings</h2>
        
        <div className="bg-white rounded-[40px] p-0 shadow-sm border border-[#eff2f6] overflow-hidden">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-[#f8fafc] border-b border-[#eff2f6]">
                    <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-[#94a3b8]">Reference ID</th>
                    <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-[#94a3b8]">Patient Identity</th>
                    <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-[#94a3b8]">Date</th>
                    <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-[#94a3b8]">Gross Amount</th>
                    <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-[#94a3b8]">Clearance</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-[#eff2f6]">
                 {myPayments.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="py-24 text-center text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.25em]">Financial vault is currently empty</td>
                    </tr>
                 ) : (
                    myPayments.map((pay) => (
                       <tr key={pay.id} className="hover:bg-[#f8fafc]/50 transition-colors">
                          <td className="px-10 py-8 font-mono text-xs font-bold text-[#94a3b8] uppercase tracking-widest">{pay.id}</td>
                          <td className="px-10 py-8">
                             <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-2xl overflow-hidden bg-[#f8fafc] border border-[#eff2f6]">
                                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${pay.patientName}`} alt="" />
                                </div>
                                <span className="text-sm font-black text-[#1a1d1f]">{pay.patientName}</span>
                             </div>
                          </td>
                          <td className="px-10 py-8 text-sm font-bold text-[#94a3b8]">{pay.date}</td>
                          <td className="px-10 py-8 text-lg font-black text-[#1a1d1f]">${pay.amount}</td>
                          <td className="px-10 py-8">
                             <span className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] ${pay.status === PaymentStatus.COMPLETED ? 'bg-[#e8f7f0] text-[#22c55e] border border-[#22c55e]/10' : 'bg-amber-50 text-amber-600 border border-amber-200/20'}`}>
                                {pay.status}
                             </span>
                          </td>
                       </tr>
                    ))
                 )}
              </tbody>
           </table>
        </div>
     </div>
  );

  return (
    <div className="max-w-[1440px] mx-auto pb-20">
      {activeView === 'Overview' && renderOverview()}
      {activeView === 'Analytics' && renderAnalytics()}
      {activeView === 'My Patients' && renderRecords()}
      {activeView === 'Appointment' && renderRecords()}
      {activeView === 'Patients' && renderPatients()}
      {activeView === 'Payments' && renderPayments()}
    </div>
  );

  function renderRecords() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 animate-in slide-in-from-right-4 duration-500">
        <div className="lg:col-span-1 p-8 h-fit bg-white border border-[#eff2f6] rounded-[40px] shadow-sm">
          <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-[#94a3b8] mb-10 text-center">Active Queue</h3>
          <div className="space-y-4">
            {patients.map(p => (
              <button key={p.id} onClick={() => setSelectedPatientId(p.id)} className={`w-full p-6 rounded-[32px] border transition-all text-left flex items-center space-x-5 ${selectedPatientId === p.id ? 'border-[#3b5bfd] bg-[#f0f3ff] text-[#3b5bfd] shadow-xl shadow-blue-500/10' : 'border-[#f8fafc] bg-[#f8fafc] text-[#94a3b8] hover:border-[#eff2f6] hover:bg-white'}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black border transition-colors text-xl ${selectedPatientId === p.id ? 'bg-white border-[#3b5bfd]/10 shadow-sm' : 'bg-white border-[#eff2f6]'}`}>{p.name.charAt(0)}</div>
                <div>
                  <p className={`font-black text-base tracking-tight leading-none ${selectedPatientId === p.id ? 'text-[#3b5bfd]' : 'text-[#1a1d1f]'}`}>{p.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-60 mt-2">{p.age}y • {p.bloodType}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white border border-[#eff2f6] rounded-[48px] p-12 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
              <div>
                <h2 className="text-4xl font-black text-[#1a1d1f] tracking-tighter leading-none">{activePatient?.name}</h2>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#3b5bfd] mt-4 flex items-center">
                  <span className="w-1.5 h-1.5 bg-[#3b5bfd] rounded-full mr-3 animate-pulse"></span>
                  Clinical Chart • {activePatient?.id.toUpperCase()}
                </p>
              </div>
              <div className="flex space-x-4">
                <button onClick={() => onStartCall?.(activePatient.name)} className="px-8 py-5 bg-[#e8f7f0] text-[#22c55e] rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] border border-[#22c55e]/10 flex items-center space-x-4 shadow-sm hover:bg-[#dcfce7] hover:scale-105 transition-all">
                  <span className="text-xl">📹</span>
                  <span>Video Consult</span>
                </button>
                <button className="px-8 py-5 bg-[#3b5bfd] text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/20 hover:bg-[#2d46e5] hover:scale-105 transition-all">New Clinical Entry</button>
              </div>
            </div>
            
            <div className="mb-12 bg-[#f8fafc] rounded-[40px] p-10 border border-[#eff2f6]">
               <div className="flex items-center justify-between mb-10">
                  <h4 className="font-black text-[#1a1d1f] uppercase tracking-[0.2em] text-xs flex items-center">
                    <span className="w-2 h-5 bg-rose-500 rounded-full mr-4 shadow-lg shadow-rose-500/20"></span>
                    Biometric Vitals Monitoring (7-Day Period)
                  </h4>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Units: mmHg, mg/dL, bpm</span>
               </div>
               
               <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={vitalsTrend} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 800, fontSize: '11px'}}
                      />
                      <Legend content={<VitalsLegend />} />
                      <Area yAxisId="left" type="monotone" dataKey="systolic" name="Blood Pressure (Systolic) - mmHg" fill="#f43f5e" fillOpacity={0.05} stroke="#f43f5e" strokeWidth={3} />
                      <Area yAxisId="left" type="monotone" dataKey="diastolic" name="Blood Pressure (Diastolic) - mmHg" fill="#3b5bfd" fillOpacity={0.05} stroke="#3b5bfd" strokeWidth={3} />
                      <Line yAxisId="right" type="stepAfter" dataKey="glucose" name="Blood Glucose - mg/dL" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: 'white'}} />
                      <Line yAxisId="right" type="monotone" dataKey="heartRate" name="Heart Rate - bpm" stroke="#ffa927" strokeWidth={3} strokeDasharray="5 5" />
                    </ComposedChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="p-10 bg-[#f8fafc] rounded-[40px] border border-[#eff2f6]">
                  <h4 className="font-black text-[#1a1d1f] uppercase tracking-[0.2em] text-xs mb-10 flex items-center">
                    <span className="w-1.5 h-5 bg-[#3b5bfd] rounded-full mr-4 shadow-lg shadow-blue-500/20"></span>
                    Patient Timeline
                  </h4>
                  <div className="space-y-8">
                     {activePatient.history.map((h, i) => (
                        <div key={i} className="flex space-x-6">
                           <div className="flex flex-col items-center">
                              <div className="w-3 h-3 bg-[#3b5bfd] rounded-full ring-8 ring-blue-50"></div>
                              {i < activePatient.history.length - 1 && <div className="w-0.5 flex-1 bg-[#eff2f6] my-2"></div>}
                           </div>
                           <div className="pb-4">
                              <p className="text-base font-black text-[#1a1d1f] leading-tight">{h.condition}</p>
                              <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.15em] mt-2">{h.date} • {h.doctorName}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="space-y-8">
                  <div className="p-10 bg-blue-50/50 rounded-[40px] border border-blue-100/30">
                     <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#3b5bfd] mb-6">Current Pharma Protocol</p>
                     <div className="space-y-3">
                        {activePatient.currentMedications.map((m, i) => (
                           <div key={i} className="bg-white px-6 py-4 rounded-2xl border border-blue-100/50 flex items-center justify-between shadow-sm">
                              <span className="text-sm font-black text-blue-900">{m}</span>
                              <div className="w-2.5 h-2.5 bg-[#3b5bfd] rounded-full shadow-[0_0_10px_rgba(59,91,253,0.3)]"></div>
                           </div>
                        ))}
                     </div>
                  </div>
                  
                  <div className="p-10 bg-rose-50/50 rounded-[40px] border border-rose-100/30">
                     <p className="text-[11px] font-black uppercase tracking-[0.25em] text-rose-500 mb-6">Allergic Reactions</p>
                     <div className="flex flex-wrap gap-3">
                        {activePatient.allergies.map((a, i) => (
                           <span key={i} className="px-5 py-2.5 bg-white text-rose-500 rounded-xl border border-rose-100/50 text-[10px] font-black uppercase tracking-widest shadow-sm">{a}</span>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default DoctorDashboard;
