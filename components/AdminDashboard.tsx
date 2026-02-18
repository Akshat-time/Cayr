
import React, { useState } from 'react';
import { User, Appointment, PatientRecord } from '../types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface AdminDashboardProps {
    user: User;
    appointments: Appointment[];
    patients: PatientRecord[];
    doctors: User[];
}

const COLORS = ['#3b5bfd', '#ff5c6c', '#cca927', '#10b981'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, appointments, patients, doctors }) => {
    const [activeTab, setActiveTab] = useState('overview');

    const stats = [
        { label: 'Total Patients', value: patients.length, icon: '👥', color: 'bg-blue-50 text-blue-500' },
        { label: 'Active Doctors', value: doctors.length, icon: '👨‍⚕️', color: 'bg-indigo-50 text-indigo-500' },
        { label: 'Total Appointments', value: appointments.length, icon: '📅', color: 'bg-purple-50 text-purple-500' },
        { label: 'Revenue', value: '$45.2k', icon: '💰', color: 'bg-emerald-50 text-emerald-500' },
    ];

    const appointmentStatusData = [
        { name: 'Completed', value: appointments.filter(a => a.status === 'COMPLETED').length },
        { name: 'Pending', value: appointments.filter(a => a.status === 'PENDING').length },
        { name: 'Cancelled', value: appointments.filter(a => a.status === 'CANCELLED').length },
        { name: 'Confirmed', value: appointments.filter(a => a.status === 'CONFIRMED').length },
    ];

    const renderOverview = () => (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 ${stat.color}`}>{stat.icon}</div>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 mb-6">Appointment Analytics</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={appointmentStatusData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="value" fill="#3b5bfd" radius={[8, 8, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center justify-center">
                    <div className="relative w-64 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={appointmentStatusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {appointmentStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-2xl font-black text-slate-800">{appointments.length}</p>
                                <p className="text-[8px] font-black uppercase text-slate-400">Total</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Admin Portal</h1>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-2">{user.name} • Administrator</p>
                </div>
                <nav className="flex space-x-2 bg-white/50 backdrop-blur-md p-1.5 rounded-[28px] border border-white/50">
                    {['overview', 'users', 'settings'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && <div className="p-20 text-center text-slate-300 font-black uppercase text-[11px] tracking-widest bg-white rounded-[48px] border border-slate-100">User Management Module</div>}
            {activeTab === 'settings' && <div className="p-20 text-center text-slate-300 font-black uppercase text-[11px] tracking-widest bg-white rounded-[48px] border border-slate-100">System Configuration</div>}
        </div>
    );
};

export default AdminDashboard;
