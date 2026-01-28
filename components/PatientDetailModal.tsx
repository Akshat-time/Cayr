
import React, { useState, useEffect, useRef } from 'react';
import { PatientRecord, AppointmentStatus, PatientStatus, PainArea } from '../types';
import BodyScanner from './BodyScanner';

interface PatientDetailModalProps {
  patient: PatientRecord;
  onClose: () => void;
  onStartConsult: (name: string) => void;
  onNewEntry: (patientId: string) => void;
  onSchedule: (patientId: string) => void;
  isLoading?: boolean;
}

type TabType = 'Overview' | 'History' | 'Pain Map' | 'Records' | 'Entries' | 'Results';

const ModalSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-pulse">
    <div className="md:col-span-1 space-y-8">
      <div className="flex flex-col items-center p-8 bg-slate-50/50 rounded-[40px] border border-slate-100">
        <div className="w-32 h-32 rounded-[40px] bg-slate-100 mb-6"></div>
        <div className="h-6 bg-slate-100 rounded-lg w-2/3 mb-3"></div>
        <div className="h-3 bg-slate-100 rounded-lg w-1/2"></div>
      </div>
    </div>
    <div className="md:col-span-2 space-y-8">
      <div className="h-48 bg-white border border-slate-100 rounded-[32px]"></div>
    </div>
  </div>
);

const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ 
  patient, onClose, onStartConsult, onNewEntry, onSchedule, isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    modalRef.current?.focus();
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const tabs: TabType[] = ['Overview', 'History', 'Pain Map', 'Records', 'Entries', 'Results'];

  const getStatusColor = (status: AppointmentStatus | PatientStatus | string) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
      case PatientStatus.ACTIVE:
      case 'Completed':
        return 'bg-green-50 text-green-600 border-green-100';
      case AppointmentStatus.PENDING:
      case 'Pending':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case AppointmentStatus.CANCELLED:
      case PatientStatus.RISK:
      case 'Abnormal':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-in fade-in duration-300">
      <div className="md:col-span-1 space-y-8">
        <div className="flex flex-col items-center text-center p-8 bg-slate-50/50 rounded-[40px] border border-slate-100">
          <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-white shadow-xl mb-6">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.name}`} alt={`Portrait of ${patient.name}`} />
          </div>
          <h4 className="text-xl font-black text-slate-800 leading-tight">{patient.name}</h4>
          <p className="text-[10px] font-black text-[#3b5bfd] uppercase tracking-[0.2em] mt-2">{patient.primaryCondition || 'General Care'}</p>
        </div>

        <section className="space-y-4" aria-labelledby="contact-heading">
           <h5 id="contact-heading" className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Secure Contact</h5>
           <div className="p-6 bg-white rounded-3xl border border-slate-100 space-y-4 shadow-sm">
              <div className="flex items-center space-x-3">
                 <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 text-xs">📧</div>
                 <span className="text-sm font-bold text-slate-600">{patient.email || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-3">
                 <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 text-xs">📞</div>
                 <span className="text-sm font-bold text-slate-600">{patient.phone || 'N/A'}</span>
              </div>
           </div>
        </section>
      </div>

      <div className="md:col-span-2 space-y-8">
        {patient.activePainMap && patient.activePainMap.length > 0 && (
           <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[32px] flex items-center justify-between">
              <div>
                 <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1">Active Distress Signals</p>
                 <h4 className="text-lg font-black text-indigo-900">{patient.activePainMap.length} Anatomical Hotspots Reported</h4>
              </div>
              <button onClick={() => setActiveTab('Pain Map')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20">Open Heat Map</button>
           </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl">
             <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-3 flex items-center">
                <span className="mr-2">⚠️</span> Known Allergies
             </p>
             <div className="flex flex-wrap gap-2">
                {patient.allergies.length > 0 ? patient.allergies.map(a => (
                  <span key={a} className="px-3 py-1 bg-white text-rose-600 text-[10px] font-black rounded-lg border border-rose-200">{a}</span>
                )) : <span className="text-xs text-rose-400 font-bold">No known allergies</span>}
             </div>
          </div>
          <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl">
             <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3 flex items-center">
                <span className="mr-2">💊</span> Medications
             </p>
             <ul className="space-y-2">
                {patient.currentMedications.length > 0 ? patient.currentMedications.slice(0, 3).map(m => (
                  <li key={m} className="text-xs font-bold text-blue-900 flex items-center">
                     <div className="w-1 h-1 bg-blue-400 rounded-full mr-2"></div> {m}
                  </li>
                )) : <li className="text-xs text-blue-400 font-bold">No active protocol</li>}
             </ul>
          </div>
        </div>

        <section className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm">
           <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center">
              Insurance & Emergency
           </h5>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <div className="space-y-4">
                 <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Provider</p>
                    <p className="text-sm font-black text-slate-800">{patient.insurance?.provider || 'Standard Clinical'}</p>
                 </div>
              </div>
              <div className="space-y-4">
                 <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Emergency Contact</p>
                    <p className="text-sm font-black text-slate-800">{patient.emergencyContact?.name || 'Primary Contact'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{patient.emergencyContact?.phone || 'N/A'}</p>
                 </div>
              </div>
           </div>
        </section>
      </div>
    </div>
  );

  const renderPainMap = () => (
    <div className="h-full animate-in fade-in duration-300">
      <BodyScanner 
        isDoctorView 
        initialAreas={patient.activePainMap || []} 
        onCancel={() => setActiveTab('Overview')} 
        onConfirm={() => {}} 
      />
    </div>
  );

  const renderHistory = () => (
    <div className="animate-in fade-in duration-300">
       <div className="flex items-center justify-between mb-8">
          <h4 className="text-lg font-black text-slate-800 tracking-tight">Consultation History</h4>
       </div>
       <div className="overflow-hidden bg-white border border-slate-100 rounded-[32px] shadow-sm">
          <table className="w-full text-left">
             <thead className="bg-slate-50">
                <tr>
                   <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Date</th>
                   <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Physician</th>
                   <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Status</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {patient.history.map((h, i) => (
                   <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 text-sm font-bold text-slate-700">{h.date}</td>
                      <td className="px-8 py-6 text-sm font-black text-slate-900">{h.doctorName}</td>
                      <td className="px-8 py-6">
                         <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusColor(h.status || AppointmentStatus.COMPLETED)}`}>
                            {h.status || 'COMPLETED'}
                         </span>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );

  const renderRecords = () => (
    <div className="animate-in fade-in duration-300 space-y-8">
       <h4 className="text-lg font-black text-slate-800 tracking-tight">Clinical Documentation</h4>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(patient.documents || [
            { id: '1', name: 'Standard_Report.pdf', type: 'Lab Report', date: '2024-05-15', uploadedBy: 'Quest Diagnostics' },
          ]).map(doc => (
            <div key={doc.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between group hover:border-[#3b5bfd]/30 transition-all shadow-sm">
               <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 text-[#3b5bfd] rounded-2xl flex items-center justify-center text-xl">📄</div>
                  <div>
                     <p className="text-sm font-black text-slate-800">{doc.name}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{doc.type} • {doc.date}</p>
                  </div>
               </div>
            </div>
          ))}
       </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      <div className="max-w-6xl w-full h-full max-h-[90vh] bg-white rounded-[48px] shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
        
        <div className="bg-[#1a1d1f] p-8 md:px-12 text-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-6">
             <div className="hidden sm:block w-16 h-16 bg-white/10 rounded-[24px] overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.name}`} alt="" />
             </div>
             <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">{patient.name}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                   <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400">ID: {patient.id}</p>
                   <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">{patient.age}y • {patient.gender}</p>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-xl">✕</button>
        </div>

        <div className="bg-white border-b border-slate-50 flex items-center px-12 overflow-x-auto whitespace-nowrap scrollbar-hide flex-shrink-0">
           {tabs.map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`py-6 px-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative border-b-2 ${activeTab === tab ? 'text-[#3b5bfd] border-[#3b5bfd]' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
             >
               {tab}
             </button>
           ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-[#f8fafc]/50">
           {isLoading ? (
             <ModalSkeleton />
           ) : (
             <>
               {activeTab === 'Overview' && renderOverview()}
               {activeTab === 'History' && renderHistory()}
               {activeTab === 'Pain Map' && renderPainMap()}
               {activeTab === 'Records' && renderRecords()}
               {activeTab === 'Entries' && <div className="py-20 text-center text-slate-300 font-black uppercase text-[10px]">Clinical Journal Syncing...</div>}
               {activeTab === 'Results' && <div className="py-20 text-center text-slate-300 font-black uppercase text-[10px]">Lab Database Syncing...</div>}
             </>
           )}
        </div>

        <div className="p-8 md:px-12 border-t border-slate-50 bg-white flex flex-col sm:flex-row justify-between items-center gap-6 flex-shrink-0">
             <div className="flex items-center space-x-4">
                <button onClick={() => onStartConsult(patient.name)} className="px-8 py-4 bg-[#e8f7f0] text-[#22c55e] rounded-2xl text-[10px] font-black uppercase tracking-widest border border-[#22c55e]/10 flex items-center space-x-3 hover:bg-[#dcfce7] transition-all">
                   <span className="text-lg">📹</span>
                   <span>Start Call</span>
                </button>
                <button onClick={() => onNewEntry(patient.id)} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500">Record Entry</button>
             </div>
             <div className="flex items-center space-x-4">
                <button onClick={onClose} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Dismiss</button>
             </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailModal;
