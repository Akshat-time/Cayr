
import React, { useState, useMemo } from 'react';
import { Payment, PaymentStatus, UserRole, User } from '../types';

interface TransactionHistoryProps {
  payments: Payment[];
  user: User;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ payments, user }) => {
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'AMOUNT_DESC'>('NEWEST');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const itemsPerPage = 10;

  // Filter and sort logic
  const filteredPayments = useMemo(() => {
    let result = [...payments];

    if (filterStatus !== 'ALL') {
      result = result.filter(p => p.status === filterStatus);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.id.toLowerCase().includes(lowerSearch) || 
        p.service.toLowerCase().includes(lowerSearch) ||
        p.patientName.toLowerCase().includes(lowerSearch) ||
        p.doctorName.toLowerCase().includes(lowerSearch) ||
        p.amount.toString().includes(lowerSearch)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'NEWEST') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'OLDEST') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'AMOUNT_DESC') return b.amount - a.amount;
      return 0;
    });

    return result;
  }, [payments, filterStatus, searchTerm, sortBy]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Summary stats
  const stats = useMemo(() => {
    const total = payments.reduce((acc, p) => acc + p.amount, 0);
    const paid = payments.filter(p => p.status === PaymentStatus.COMPLETED).reduce((acc, p) => acc + p.amount, 0);
    const pending = payments.filter(p => p.status === PaymentStatus.PENDING || p.status === PaymentStatus.OVERDUE).reduce((acc, p) => acc + p.amount, 0);
    return { total, paid, pending };
  }, [payments]);

  const getStatusStyle = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.COMPLETED: return 'bg-green-50 text-green-600 border-green-100';
      case PaymentStatus.PENDING: return 'bg-amber-50 text-amber-600 border-amber-100';
      case PaymentStatus.FAILED: return 'bg-rose-50 text-rose-600 border-rose-100';
      case PaymentStatus.OVERDUE: return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      {/* Transaction Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-10 grayscale">💰</div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Total Amount</p>
           <h3 className="text-4xl font-black text-slate-800 tracking-tighter">${stats.total.toLocaleString()}</h3>
           <div className="mt-6 w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
              <div className="h-full bg-slate-300 w-full"></div>
           </div>
        </div>
        <div className="bg-white p-10 rounded-[40px] border border-green-50 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-10 grayscale">✅</div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400 mb-2">Total Paid</p>
           <h3 className="text-4xl font-black text-green-600 tracking-tighter">${stats.paid.toLocaleString()}</h3>
           <div className="mt-6 w-full h-1.5 bg-green-50 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${(stats.paid / stats.total) * 100}%` }}></div>
           </div>
        </div>
        <div className="bg-white p-10 rounded-[40px] border border-amber-50 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-10 grayscale">⏳</div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 mb-2">Pending Balance</p>
           <h3 className="text-4xl font-black text-amber-600 tracking-tighter">${stats.pending.toLocaleString()}</h3>
           <div className="mt-6 w-full h-1.5 bg-amber-50 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${(stats.pending / stats.total) * 100}%` }}></div>
           </div>
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1 relative group">
            <svg className="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#3b5bfd]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search by ID, Service or Provider..." 
              className="w-full pl-16 pr-8 py-4 bg-slate-50 border border-slate-100 rounded-[24px] text-sm font-bold outline-none focus:bg-white focus:border-[#3b5bfd] transition-all"
            />
          </div>
          <div className="flex items-center space-x-3">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-6 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none focus:border-[#3b5bfd] transition-all"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="AMOUNT_DESC">Highest Amount</option>
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-50">
          {['ALL', ...Object.values(PaymentStatus)].map(s => (
            <button 
              key={s} 
              onClick={() => { setFilterStatus(s as any); setCurrentPage(1); }}
              className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${filterStatus === s ? 'bg-[#3b5bfd] text-white border-[#3b5bfd] shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
           <h3 className="text-xl font-black text-slate-800 tracking-tight">Ledger Records</h3>
           <span className="bg-blue-50 text-[#3b5bfd] px-3 py-1 rounded-full text-[10px] font-black">{filteredPayments.length} Items</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Transaction ID</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Description</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Clinical Entity</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Amount</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No matching transaction records</p>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50/30 transition-colors">
                    <td className="px-10 py-8 font-mono text-[11px] text-slate-400 font-bold uppercase tracking-widest">#{p.id}</td>
                    <td className="px-10 py-8">
                       <p className="text-sm font-black text-slate-800 leading-tight">{p.service}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{p.method || 'Standard Pay'}</p>
                    </td>
                    <td className="px-10 py-8">
                       <p className="text-sm font-bold text-slate-700">{user.role === UserRole.PATIENT ? p.doctorName : p.patientName}</p>
                    </td>
                    <td className="px-10 py-8 text-sm font-bold text-slate-400">
                       {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-10 py-8 text-lg font-black text-slate-900">
                       ${p.amount.toLocaleString()}
                    </td>
                    <td className="px-10 py-8">
                       <span className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border ${getStatusStyle(p.status)}`}>
                          {p.status}
                       </span>
                    </td>
                    <td className="px-10 py-8">
                       <button 
                        onClick={() => setSelectedPayment(p)}
                        className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-[#3b5bfd] hover:border-[#3b5bfd]/30 transition-all shadow-sm"
                       >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
             <div className="flex space-x-3">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="px-6 py-3 rounded-xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#3b5bfd] disabled:opacity-30 transition-all"
                >
                  Previous
                </button>
                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-6 py-3 rounded-xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#3b5bfd] disabled:opacity-30 transition-all"
                >
                  Next
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="max-w-2xl w-full bg-white rounded-[48px] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
              <div className="bg-[#1a1d1f] p-10 text-white flex justify-between items-start">
                 <div>
                    <h2 className="text-3xl font-black tracking-tight">Invoice Receipt</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mt-2">Trans-ID • {selectedPayment.id}</p>
                 </div>
                 <button onClick={() => setSelectedPayment(null)} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-xl">✕</button>
              </div>

              <div className="p-12 space-y-10">
                 <div className="grid grid-cols-2 gap-12">
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Patient Information</p>
                       <p className="text-base font-black text-slate-800">{selectedPayment.patientName}</p>
                       <p className="text-xs font-bold text-slate-400 mt-1">ID: {selectedPayment.patientId}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Healthcare Provider</p>
                       <p className="text-base font-black text-slate-800">{selectedPayment.doctorName}</p>
                       <p className="text-xs font-bold text-slate-400 mt-1">ID: {selectedPayment.doctorId}</p>
                    </div>
                 </div>

                 <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Rendered</p>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Amount</p>
                    </div>
                    <div className="flex justify-between items-start pb-6 border-b border-slate-200">
                       <div>
                          <p className="text-lg font-black text-slate-800">{selectedPayment.service}</p>
                          <p className="text-xs font-bold text-slate-500 mt-2">{selectedPayment.description || 'Consultation and clinical review fee.'}</p>
                       </div>
                       <p className="text-2xl font-black text-slate-900">${selectedPayment.amount.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-center pt-6">
                       <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Clearance Status</p>
                       <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(selectedPayment.status)}`}>
                          {selectedPayment.status}
                       </span>
                    </div>
                 </div>

                 <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => alert('Initiating secure PDF generation...')}
                      className="flex-1 px-8 py-5 bg-[#3b5bfd] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-[#2d46e5] transition-all"
                    >
                      Download PDF Invoice
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="px-8 py-5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                    >
                      Print Receipt
                    </button>
                 </div>
                 
                 <p className="text-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">This is a verified clinical billing document generated by Cayr Health.</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
