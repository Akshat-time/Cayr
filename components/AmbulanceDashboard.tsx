
import React, { useState } from 'react';
import { User, PatientRecord, PatientStatus } from '../types';

interface AmbulanceDashboardProps {
    user: User;
    patients: PatientRecord[];
}

const AmbulanceDashboard: React.FC<AmbulanceDashboardProps> = ({ user, patients }) => {
    const [activeTab, setActiveTab] = useState('dispatch');
    const emergencyPatients = patients.filter(p => p.status === 'EMERGENCY' || p.status === 'RISK');

    const renderDispatch = () => (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-rose-50 border border-rose-100 p-8 rounded-[40px] flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 bg-rose-500 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-rose-200 animate-pulse">🚑</div>
                    <div>
                        <h2 className="text-2xl font-black text-rose-900 tracking-tight">Emergency Response Unit</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mt-1">Active Dispatch Console • {user.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-4xl font-black text-rose-600">{emergencyPatients.length}</p>
                    <p className="text-[8px] font-black uppercase text-rose-400 tracking-widest">Active Alerts</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {emergencyPatients.length === 0 ? (
                    <div className="p-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest bg-white rounded-[40px] border border-slate-100 italic">No Active Emergency Signals</div>
                ) : (
                    emergencyPatients.map(p => (
                        <div key={p.id} className="bg-white p-8 rounded-[40px] border-l-8 border-rose-500 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 bg-rose-100 text-rose-600 text-[9px] font-black uppercase tracking-widest rounded-bl-2xl">Priority: High</div>

                            <div className="flex items-center space-x-6 z-10">
                                <div className="w-20 h-20 bg-slate-100 rounded-3xl overflow-hidden"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" /></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">{p.name}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Locating...</p>
                                    <div className="flex gap-2 mt-3">
                                        <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest">{p.primaryCondition}</span>
                                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">{p.age} Yrs • {p.bloodType}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex space-x-3 z-10 w-full md:w-auto">
                                <button className="flex-1 md:flex-none px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">Accept Dispatch</button>
                                <button className="flex-1 md:flex-none px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">View Vitals</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <nav className="flex space-x-2 bg-white/50 backdrop-blur-md p-1.5 rounded-[28px] border border-white/50 mb-10 w-fit">
                {['dispatch', 'map', 'history'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {tab}
                    </button>
                ))}
            </nav>

            {activeTab === 'dispatch' && renderDispatch()}
            {activeTab === 'map' && <div className="p-20 text-center text-slate-300 font-black uppercase text-[11px] tracking-widest bg-white rounded-[48px] border border-slate-100">Live GPS Tracking Module</div>}
            {activeTab === 'history' && <div className="p-20 text-center text-slate-300 font-black uppercase text-[11px] tracking-widest bg-white rounded-[48px] border border-slate-100">Dispatch Logs</div>}
        </div>
    );
};

export default AmbulanceDashboard;
