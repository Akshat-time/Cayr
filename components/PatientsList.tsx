
import React, { useState, useMemo, memo } from 'react';
import { PatientRecord, PatientStatus } from '../types';

interface PatientsListProps {
  patients: PatientRecord[];
  onViewDetails: (patient: PatientRecord) => void;
  onSendMessage: (patientName: string) => void;
  onSchedule: (patientName: string) => void;
  isLoading?: boolean;
}

const TableSkeleton = () => (
  <>
    {Array.from({ length: 6 }).map((_, i) => (
      <tr key={`skeleton-${i}`} className="animate-pulse">
        <td className="px-10 py-8">
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-slate-100 rounded-[20px]"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-100 rounded w-24"></div>
              <div className="h-2 bg-slate-50 rounded w-16"></div>
            </div>
          </div>
        </td>
        <td className="px-10 py-8">
          <div className="h-4 bg-slate-100 rounded w-20 mb-2"></div>
          <div className="h-2 bg-slate-50 rounded w-12"></div>
        </td>
        <td className="px-10 py-8">
          <div className="h-4 bg-slate-100 rounded w-28"></div>
        </td>
        <td className="px-10 py-8">
          <div className="h-4 bg-slate-50 rounded w-20"></div>
        </td>
        <td className="px-10 py-8">
          <div className="h-8 bg-slate-50 rounded-xl w-16"></div>
        </td>
        <td className="px-10 py-8">
          <div className="flex space-x-2">
            <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
            <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
            <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
          </div>
        </td>
      </tr>
    ))}
  </>
);

const PatientRow = memo(({ 
  p, 
  onViewDetails, 
  onSendMessage, 
  onSchedule, 
  getStatusStyle 
}: { 
  p: PatientRecord, 
  onViewDetails: (p: PatientRecord) => void, 
  onSendMessage: (n: string) => void, 
  onSchedule: (n: string) => void,
  getStatusStyle: (s: PatientStatus) => string
}) => (
  <tr className="group hover:bg-slate-50/30 transition-colors">
    <td className="px-10 py-8">
       <div className="flex items-center space-x-5">
          <div className="w-14 h-14 bg-slate-50 rounded-[20px] overflow-hidden border border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-500">
             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt={`Avatar for ${p.name}`} />
          </div>
          <div>
             <p className="text-base font-black text-slate-900 leading-tight">{p.name}</p>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5" aria-label={`Patient ID: ${p.id}`}>{p.id}</p>
          </div>
       </div>
    </td>
    <td className="px-10 py-8">
       <p className="text-sm font-bold text-slate-600">{p.age} Years • {p.gender}</p>
       <p className="text-[10px] font-black text-[#3b5bfd] uppercase tracking-widest mt-1.5" aria-label={`Blood type: ${p.bloodType}`}>{p.bloodType}</p>
    </td>
    <td className="px-10 py-8">
       <span className="text-sm font-black text-slate-800">{p.primaryCondition || 'General Wellness'}</span>
    </td>
    <td className="px-10 py-8 text-sm font-bold text-slate-400">
       {p.lastVisit || 'No recorded visits'}
    </td>
    <td className="px-10 py-8">
       <span className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border ${getStatusStyle(p.status || PatientStatus.ACTIVE)}`}>
          {p.status || 'ACTIVE'}
       </span>
    </td>
    <td className="px-10 py-8">
       <div className="flex items-center space-x-2">
          <button onClick={() => onViewDetails(p)} className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-[#3b5bfd] hover:border-[#3b5bfd]/30 transition-all shadow-sm outline-none focus:ring-2 focus:ring-blue-500" aria-label={`View clinical file for ${p.name}`}>
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </button>
          <button onClick={() => onSendMessage(p.name)} className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-[#3b5bfd] hover:border-[#3b5bfd]/30 transition-all shadow-sm outline-none focus:ring-2 focus:ring-blue-500" aria-label={`Send secure message to ${p.name}`}>
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
          </button>
          <button onClick={() => onSchedule(p.name)} className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-[#3b5bfd] hover:border-[#3b5bfd]/30 transition-all shadow-sm outline-none focus:ring-2 focus:ring-blue-500" aria-label={`Schedule appointment with ${p.name}`}>
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </button>
       </div>
    </td>
  </tr>
));

const PatientsList: React.FC<PatientsListProps> = ({ patients, onViewDetails, onSendMessage, onSchedule, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatus | 'ALL'>('ALL');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');
  const [visitFilter, setVisitFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NAME' | 'DATE' | 'STATUS'>('NAME');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const conditions = useMemo(() => ['ALL', 'Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Other'], []);
  const visitOptions = useMemo(() => [
    { label: 'All Time', value: 'ALL' },
    { label: 'Today', value: 'TODAY' },
    { label: 'This Week', value: 'WEEK' },
    { label: 'This Month', value: 'MONTH' },
    { label: 'Older', value: 'OLDER' }
  ], []);

  const filteredPatients = useMemo(() => {
    let result = [...patients];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(lower) || 
        p.id.toLowerCase().includes(lower) || 
        (p.email && p.email.toLowerCase().includes(lower))
      );
    }

    if (statusFilter !== 'ALL') result = result.filter(p => p.status === statusFilter);
    if (conditionFilter !== 'ALL') result = result.filter(p => p.primaryCondition === conditionFilter);

    if (visitFilter !== 'ALL') {
      const now = new Date();
      result = result.filter(p => {
        if (!p.lastVisit) return false;
        const visitDate = new Date(p.lastVisit);
        const diffDays = Math.floor((now.getTime() - visitDate.getTime()) / (1000 * 3600 * 24));
        if (visitFilter === 'TODAY') return diffDays === 0;
        if (visitFilter === 'WEEK') return diffDays <= 7;
        if (visitFilter === 'MONTH') return diffDays <= 30;
        if (visitFilter === 'OLDER') return diffDays > 30;
        return true;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'NAME') return a.name.localeCompare(b.name);
      if (sortBy === 'DATE') return new Date(b.lastVisit || 0).getTime() - new Date(a.lastVisit || 0).getTime();
      if (sortBy === 'STATUS') {
        const priority = { [PatientStatus.RISK]: 0, [PatientStatus.ACTIVE]: 1, [PatientStatus.INACTIVE]: 2 };
        return (priority[a.status!] || 0) - (priority[b.status!] || 0);
      }
      return 0;
    });

    return result;
  }, [patients, searchTerm, statusFilter, conditionFilter, visitFilter, sortBy]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusStyle = (status: PatientStatus) => {
    switch (status) {
      case PatientStatus.ACTIVE: return 'bg-green-50 text-green-600 border-green-100';
      case PatientStatus.INACTIVE: return 'bg-slate-50 text-slate-400 border-slate-100';
      case PatientStatus.RISK: return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setConditionFilter('ALL');
    setVisitFilter('ALL');
    setSortBy('NAME');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Filters Section */}
      <section className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-8" aria-label="Filters and Search">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex-1 relative group">
            <svg className="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#3b5bfd]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name, email or patient ID..." 
              className="w-full pl-16 pr-8 py-5 bg-slate-50 border border-slate-100 rounded-[28px] text-sm font-bold outline-none focus:bg-white focus:border-[#3b5bfd] transition-all shadow-inner"
              aria-label="Search patients"
            />
          </div>
          <div className="flex items-center space-x-4">
            <label htmlFor="sort-patients" className="sr-only">Sort by</label>
            <select 
              id="sort-patients"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-8 py-5 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none focus:border-[#3b5bfd] transition-all shadow-sm"
            >
              <option value="NAME">Sort by Name (A-Z)</option>
              <option value="DATE">Sort by Last Visit</option>
              <option value="STATUS">Sort by Risk Status</option>
            </select>
            <button onClick={handleClearFilters} className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#3b5bfd] hover:bg-blue-50 rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500">Reset Filters</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-4 border-t border-slate-50">
          <div className="space-y-4">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-1">Account Status</h4>
             <div className="flex flex-wrap gap-2" role="group" aria-label="Status Filters">
                {['ALL', ...Object.values(PatientStatus)].map(s => (
                  <button 
                    key={s} 
                    onClick={() => { setStatusFilter(s as any); setCurrentPage(1); }}
                    aria-pressed={statusFilter === s}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${statusFilter === s ? 'bg-[#3b5bfd] text-white border-[#3b5bfd] shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                  >
                    {s}
                  </button>
                ))}
             </div>
          </div>
          <div className="space-y-4">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-1">Clinical Condition</h4>
             <div className="flex flex-wrap gap-2" role="group" aria-label="Condition Filters">
                {conditions.map(c => (
                  <button 
                    key={c} 
                    onClick={() => { setConditionFilter(c); setCurrentPage(1); }}
                    aria-pressed={conditionFilter === c}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${conditionFilter === c ? 'bg-[#3b5bfd] text-white border-[#3b5bfd] shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                  >
                    {c}
                  </button>
                ))}
             </div>
          </div>
          <div className="space-y-4">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-1">Visit Frequency</h4>
             <div className="flex flex-wrap gap-2" role="group" aria-label="Visit Frequency Filters">
                {visitOptions.map(v => (
                  <button 
                    key={v.value} 
                    onClick={() => { setVisitFilter(v.value); setCurrentPage(1); }}
                    aria-pressed={visitFilter === v.value}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${visitFilter === v.value ? 'bg-[#3b5bfd] text-white border-[#3b5bfd] shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                  >
                    {v.label}
                  </button>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* Table Section */}
      <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden" aria-labelledby="registry-heading">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
           <div className="flex items-center space-x-3">
              <h3 id="registry-heading" className="text-xl font-black text-slate-800 tracking-tight">Clinical Registry</h3>
              <span className="bg-blue-50 text-[#3b5bfd] px-3 py-1 rounded-full text-[10px] font-black" aria-live="polite">
                {isLoading ? '...' : `${filteredPatients.length} Patients Found`}
              </span>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th scope="col" className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Patient</th>
                <th scope="col" className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Demographics</th>
                <th scope="col" className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Condition</th>
                <th scope="col" className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Last Visit</th>
                <th scope="col" className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Risk Level</th>
                <th scope="col" className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <TableSkeleton />
              ) : paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No patient records found matching current filters</p>
                  </td>
                </tr>
              ) : (
                paginatedPatients.map((p) => (
                  <PatientRow 
                    key={p.id} 
                    p={p} 
                    onViewDetails={onViewDetails} 
                    onSendMessage={onSendMessage} 
                    onSchedule={onSchedule} 
                    getStatusStyle={getStatusStyle}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && !isLoading && (
          <nav className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between" aria-label="Pagination">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Displaying {(currentPage-1)*itemsPerPage + 1} to {Math.min(currentPage*itemsPerPage, filteredPatients.length)} of {filteredPatients.length} patients</p>
             <div className="flex space-x-3">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="px-6 py-3 rounded-xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#3b5bfd] disabled:opacity-30 transition-all shadow-sm flex items-center space-x-3 outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Go to previous page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                  <span>Previous</span>
                </button>
                <div className="flex items-center space-x-2">
                   {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                     <button 
                       key={num} 
                       onClick={() => setCurrentPage(num)}
                       aria-current={currentPage === num ? 'page' : undefined}
                       className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === num ? 'bg-[#3b5bfd] text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                       aria-label={`Go to page ${num}`}
                     >
                       {num}
                     </button>
                   ))}
                </div>
                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-6 py-3 rounded-xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#3b5bfd] disabled:opacity-30 transition-all shadow-sm flex items-center space-x-3 outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Go to next page"
                >
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                </button>
             </div>
          </nav>
        )}
      </section>
    </div>
  );
};

export default PatientsList;
