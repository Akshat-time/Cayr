
import React, { useState, useEffect, useRef } from 'react';
import { PatientRecord, AppointmentStatus, PatientStatus } from '../types';

interface PatientDetailModalProps {
  patient: PatientRecord;
  onClose: () => void;
  onStartConsult: (name: string) => void;
  onNewEntry: (patientId: string) => void;
  onSchedule: (patientId: string) => void;
  isLoading?: boolean;
}

type TabType = 'Overview' | 'History' | 'Records' | 'Entries' | 'Results';

const ModalSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-pulse">
    <div className="md:col-span-1 space-y-8">
      <div className="flex flex-col items-center p-8 bg-slate-50/50 rounded-[40px] border border-slate-100">
        <div className="w-32 h-32 rounded-[40px] bg-slate-100 mb-6"></div>
        <div className="h-6 bg-slate-100 rounded-lg w-2/3 mb-3"></div>
        <div className="h-3 bg-slate-100 rounded-lg w-1/2"></div>
      </div>
      <div className="space-y-4">
        <div className="h-3 bg-slate-100 rounded w-20 ml-1"></div>
        <div className="p-6 bg-white rounded-3xl border border-slate-100 space-y-4">
          <div className="h-4 bg-slate-50 rounded w-full"></div>
          <div className="h-4 bg-slate-50 rounded w-full"></div>
          <div className="h-4 bg-slate-50 rounded w-full"></div>
        </div>
      </div>
    </div>
    <div className="md:col-span-2 space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="h-32 bg-slate-50 rounded-[32px]"></div>
        <div className="h-32 bg-slate-50 rounded-[32px]"></div>
      </div>
      <div className="h-48 bg-white border border-slate-100 rounded-[32px]"></div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-20 bg-slate-50 rounded-[24px]"></div>
        <div className="h-20 bg-slate-50 rounded-[24px]"></div>
      </div>
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

  const tabs: TabType[] = ['Overview', 'History', 'Records', 'Entries', 'Results'];

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
                 <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 text-xs" aria-hidden="true">📧</div>
                 <span className="text-sm font-bold text-slate-600" aria-label={`Email: ${patient.email || 'N/A'}`}>{patient.email || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-3">
                 <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 text-xs" aria-hidden="true">📞</div>
                 <span className="text-sm font-bold text-slate-600" aria-label={`Phone: ${patient.phone || 'N/A'}`}>{patient.phone || 'N/A'}</span>
              </div>
              <div className="flex items-start space-x-3">
                 <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 text-xs flex-shrink-0" aria-hidden="true">📍</div>
                 <span className="text-sm font-bold text-slate-600 leading-relaxed" aria-label={`Address: ${patient.address || 'San Francisco, CA'}`}>{patient.address || 'San Francisco, CA'}</span>
              </div>
           </div>
        </section>
      </div>

      <div className="md:col-span-2 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl" role="region" aria-label="Known Allergies">
             <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-3 flex items-center">
                <span className="mr-2" aria-hidden="true">⚠️</span> Known Allergies
             </p>
             <div className="flex flex-wrap gap-2">
                {patient.allergies.length > 0 ? patient.allergies.map(a => (
                  <span key={a} className="px-3 py-1 bg-white text-rose-600 text-[10px] font-black rounded-lg border border-rose-200">{a}</span>
                )) : <span className="text-xs text-rose-400 font-bold">No known allergies</span>}
             </div>
          </div>
          <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl" role="region" aria-label="Medications">
             <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3 flex items-center">
                <span className="mr-2" aria-hidden="true">💊</span> Active Medications
             </p>
             <ul className="space-y-2">
                {patient.currentMedications.length > 0 ? patient.currentMedications.slice(0, 3).map(m => (
                  <li key={m} className="text-xs font-bold text-blue-900 flex items-center">
                     <div className="w-1 h-1 bg-blue-400 rounded-full mr-2" aria-hidden="true"></div> {m}
                  </li>
                )) : <li className="text-xs text-blue-400 font-bold">No active protocol</li>}
             </ul>
          </div>
        </div>

        <section className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm" aria-labelledby="admin-heading">
           <h5 id="admin-heading" className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center">
              Administrative & Emergency
           </h5>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <div className="space-y-4">
                 <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Insurance Provider</p>
                    <p className="text-sm font-black text-slate-800">{patient.insurance?.provider || 'Blue Shield California'}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Policy / ID</p>
                    <p className="text-sm font-bold text-slate-600">{patient.insurance?.policyNumber || 'BS-99201-CA'}</p>
                 </div>
              </div>
              <div className="space-y-4">
                 <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Emergency Contact</p>
                    <p className="text-sm font-black text-slate-800">{patient.emergencyContact?.name || 'Alice Anderson'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{patient.emergencyContact?.relation || 'Spouse'}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-[#3b5bfd]" aria-label="Emergency Contact Phone">{patient.emergencyContact?.phone || '555-0199'}</p>
                 </div>
              </div>
           </div>
        </section>

        <div className="grid grid-cols-2 gap-6">
           <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center">
              <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Last Interaction</p>
              <p className="text-base font-black text-slate-800">{patient.lastVisit || 'May 10, 2024'}</p>
           </div>
           <div className="p-6 bg-[#3b5bfd]/5 border border-[#3b5bfd]/10 rounded-3xl text-center">
              <p className="text-[9px] font-black uppercase text-[#3b5bfd] mb-1">Next Appointment</p>
              <p className="text-base font-black text-[#3b5bfd]">June 04, 2024</p>
           </div>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="animate-in fade-in duration-300">
       <div className="flex items-center justify-between mb-8">
          <h4 className="text-lg font-black text-slate-800 tracking-tight">Consultation History</h4>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400" aria-label={`${patient.history.length} sessions total`}>{patient.history.length} Sessions Total</span>
       </div>
       <div className="overflow-hidden bg-white border border-slate-100 rounded-[32px] shadow-sm">
          <table className="w-full text-left">
             <thead className="bg-slate-50">
                <tr>
                   <th scope="col" className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Date</th>
                   <th scope="col" className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Physician</th>
                   <th scope="col" className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Type</th>
                   <th scope="col" className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Status</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {patient.history.map((h, i) => (
                   <tr key={i} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" tabIndex={0}>
                      <td className="px-8 py-6 text-sm font-bold text-slate-700">{h.date}</td>
                      <td className="px-8 py-6 text-sm font-black text-slate-900">{h.doctorName}</td>
                      <td className="px-8 py-6 text-xs font-bold text-slate-500 uppercase tracking-widest">{h.type || 'General Review'}</td>
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
       <div className="flex items-center justify-between">
          <h4 className="text-lg font-black text-slate-800 tracking-tight">Clinical Documentation</h4>
          <button className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all" aria-label="Upload new medical record">+ Upload File</button>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(patient.documents || [
            { id: '1', name: 'BloodPanel_May2024.pdf', type: 'Lab Report', date: '2024-05-15', uploadedBy: 'Quest Diagnostics' },
            { id: '2', name: 'Chest_XRay_Result.jpg', type: 'Imaging', date: '2024-04-20', uploadedBy: 'City Hospital' },
            { id: '3', name: 'Prescription_Lisinopril.pdf', type: 'Pharma', date: '2024-05-10', uploadedBy: 'Dr. Sarah Wilson' }
          ]).map(doc => (
            <div key={doc.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between group hover:border-[#3b5bfd]/30 transition-all shadow-sm">
               <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 text-[#3b5bfd] rounded-2xl flex items-center justify-center text-xl" aria-hidden="true">📄</div>
                  <div>
                     <p className="text-sm font-black text-slate-800 group-hover:text-[#3b5bfd] transition-colors">{doc.name}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{doc.type} • {doc.date}</p>
                  </div>
               </div>
               <div className="flex space-x-2">
                  <button className="p-2 text-slate-400 hover:text-[#3b5bfd] transition-colors" aria-label={`Download ${doc.name}`}>⬇️</button>
                  <button className="p-2 text-slate-400 hover:text-[#3b5bfd] transition-colors" aria-label={`Preview ${doc.name}`}>👁️</button>
               </div>
            </div>
          ))}
       </div>
    </div>
  );

  const renderEntries = () => (
    <div className="animate-in fade-in duration-300 space-y-10">
       <div className="flex items-center justify-between">
          <h4 className="text-lg font-black text-slate-800 tracking-tight">Physician Journal</h4>
          <button onClick={() => onNewEntry(patient.id)} className="px-6 py-3 bg-[#3b5bfd] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-[#2d46e5] transition-all">New Entry</button>
       </div>
       <div className="space-y-10" role="list">
          {(patient.clinicalEntries || [
            {
               id: 'e1',
               date: 'May 10, 2024',
               doctorName: 'Dr. Sarah Wilson',
               vitals: { bp: '130/85', heartRate: 72, temp: '98.6', o2: '98%' },
               observations: 'Patient reports mild fatigue after exercise. Cardiovascular sounds are normal.',
               treatment: 'Maintained current dosage of Lisinopril 10mg.',
               recommendations: 'Continue lifestyle modifications and monitor salt intake.'
            }
          ]).map(entry => (
            <article key={entry.id} className="relative pl-10 border-l-2 border-slate-100 space-y-6" role="listitem">
               <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-[#3b5bfd] rounded-full" aria-hidden="true"></div>
               <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-slate-900">{entry.date} • {entry.doctorName}</p>
               </div>
               <div className="grid grid-cols-4 gap-4" aria-label="Vitals recorded in this entry">
                  {[
                    { l: 'BP', v: entry.vitals.bp },
                    { l: 'HR', v: `${entry.vitals.heartRate} bpm` },
                    { l: 'TEMP', v: `${entry.vitals.temp} °F` },
                    { l: 'O2', v: entry.vitals.o2 }
                  ].map((v, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                       <p className="text-[9px] font-black text-slate-400 uppercase">{v.l}</p>
                       <p className="text-xs font-black text-slate-800 mt-1">{v.v}</p>
                    </div>
                  ))}
               </div>
               <div className="p-6 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm">
                  <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-[#3b5bfd] mb-2">Observations</p>
                     <p className="text-sm text-slate-600 leading-relaxed font-medium">{entry.observations}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-50">
                     <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-2">Plan & Recommendations</p>
                     <p className="text-sm text-slate-600 leading-relaxed font-medium">{entry.recommendations}</p>
                  </div>
               </div>
            </article>
          ))}
       </div>
    </div>
  );

  const renderResults = () => (
    <div className="animate-in fade-in duration-300 space-y-8">
       <h4 className="text-lg font-black text-slate-800 tracking-tight">Lab & Diagnostics Results</h4>
       <div className="space-y-4">
          {(patient.testResults || [
            { id: 'tr1', name: 'Comprehensive Metabolic Panel', date: '2024-05-12', status: 'Completed', value: '110 mg/dL', normalRange: '70-99 mg/dL', interpretation: 'Slightly elevated fasting glucose.' },
            { id: 'tr2', name: 'Lipid Profile', date: '2024-05-12', status: 'Abnormal', value: '220 mg/dL', normalRange: '< 200 mg/dL', interpretation: 'Elevated total cholesterol. Dietary adjustment suggested.' }
          ]).map(tr => (
            <section key={tr.id} className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm space-y-6" aria-label={`Test result for ${tr.name}`}>
               <div className="flex items-center justify-between">
                  <div>
                     <h5 className="text-base font-black text-slate-800">{tr.name}</h5>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Requested on {tr.date}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusColor(tr.status)}`}>{tr.status}</span>
               </div>
               <div className="grid grid-cols-2 gap-8 py-6 border-y border-slate-50">
                  <div>
                     <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Result Value</p>
                     <p className={`text-xl font-black ${tr.status === 'Abnormal' ? 'text-rose-500' : 'text-slate-800'}`}>{tr.value}</p>
                  </div>
                  <div>
                     <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Standard Range</p>
                     <p className="text-xl font-black text-slate-400">{tr.normalRange}</p>
                  </div>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-[#3b5bfd] mb-2">Doctor's Interpretation</p>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{tr.interpretation}</p>
               </div>
               <div className="flex justify-end">
                  <button className="text-[10px] font-black uppercase text-[#3b5bfd] hover:underline" aria-label={`Download PDF for ${tr.name}`}>Download Lab PDF</button>
               </div>
            </section>
          ))}
       </div>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-patient-name"
      tabIndex={-1}
      ref={modalRef}
    >
      <div className="max-w-6xl w-full h-full max-h-[90vh] bg-white rounded-[48px] shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-[#1a1d1f] p-8 md:px-12 text-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-6">
             <div className="hidden sm:block w-16 h-16 bg-white/10 rounded-[24px] overflow-hidden border border-white/10">
                {isLoading ? (
                  <div className="w-full h-full bg-white/20 animate-pulse"></div>
                ) : (
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.name}`} alt={`Avatar of ${patient.name}`} />
                )}
             </div>
             <div>
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-8 bg-white/20 rounded-lg w-48 animate-pulse"></div>
                    <div className="h-3 bg-white/10 rounded-lg w-32 animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <h2 id="modal-patient-name" className="text-2xl md:text-3xl font-black tracking-tight">{patient.name}</h2>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                       <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400">ID: {patient.id}</p>
                       <span className="w-1.5 h-1.5 bg-white/20 rounded-full hidden sm:block" aria-hidden="true"></span>
                       <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">{patient.age}y • {patient.gender} • {patient.bloodType}</p>
                    </div>
                  </>
                )}
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-xl outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Close patient details modal"
          >✕</button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-50 flex items-center px-12 overflow-x-auto whitespace-nowrap scrollbar-hide flex-shrink-0" role="tablist">
           {tabs.map(tab => (
             <button 
               key={tab}
               role="tab"
               aria-selected={activeTab === tab}
               aria-controls={`panel-${tab}`}
               id={`tab-${tab}`}
               disabled={isLoading}
               onClick={() => setActiveTab(tab)}
               className={`py-6 px-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative border-b-2 outline-none focus:text-[#3b5bfd] ${activeTab === tab ? 'text-[#3b5bfd] border-[#3b5bfd]' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
             >
               {isLoading ? (
                 <span className="inline-block h-3 bg-slate-100 rounded w-16 animate-pulse"></span>
               ) : tab}
             </button>
           ))}
        </div>

        {/* Content Area */}
        <div 
          className="flex-1 overflow-y-auto p-8 md:p-12 bg-[#f8fafc]/50"
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
        >
           {isLoading ? (
             <ModalSkeleton />
           ) : (
             <>
               {activeTab === 'Overview' && renderOverview()}
               {activeTab === 'History' && renderHistory()}
               {activeTab === 'Records' && renderRecords()}
               {activeTab === 'Entries' && renderEntries()}
               {activeTab === 'Results' && renderResults()}
             </>
           )}
        </div>

        {/* Footer Actions */}
        {!isLoading && (
          <div className="p-8 md:px-12 border-t border-slate-50 bg-white flex flex-col sm:flex-row justify-between items-center gap-6 flex-shrink-0" role="group" aria-label="Modal actions">
             <div className="flex items-center space-x-4">
                <button 
                  onClick={() => onStartConsult(patient.name)}
                  className="px-8 py-4 bg-[#e8f7f0] text-[#22c55e] rounded-2xl text-[10px] font-black uppercase tracking-widest border border-[#22c55e]/10 flex items-center space-x-3 hover:bg-[#dcfce7] transition-all outline-none focus:ring-2 focus:ring-green-500"
                >
                   <span className="text-lg" aria-hidden="true">📹</span>
                   <span>Video Consultation</span>
                </button>
                <button 
                  onClick={() => onNewEntry(patient.id)}
                  className="px-8 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all outline-none focus:ring-2 focus:ring-blue-500"
                >
                   New Clinical Entry
                </button>
             </div>
             <div className="flex items-center space-x-4">
                <button 
                  onClick={() => onSchedule(patient.id)}
                  className="px-8 py-4 bg-[#1a1d1f] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all outline-none focus:ring-2 focus:ring-slate-500"
                >
                   Schedule Next Visit
                </button>
                <button onClick={onClose} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 outline-none focus:underline">Close</button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDetailModal;
