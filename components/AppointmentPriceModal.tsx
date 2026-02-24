import React from 'react';
import { Appointment } from '../types';

interface AppointmentPriceModalProps {
    appointment: Appointment;
    onConfirm: () => void;
    onClose: () => void;
}

const AppointmentPriceModal: React.FC<AppointmentPriceModalProps> = ({ appointment, onConfirm, onClose }) => {
    const { doctorName, doctorProfile, priceDetails } = appointment;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[48px] shadow-2xl p-12 max-w-lg w-full space-y-10 animate-in zoom-in-95 duration-300 border border-slate-100">
                <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-[32px] flex items-center justify-center text-5xl mx-auto shadow-inner">
                        🧾
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Consultation Receipt</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Pricing Transparency Ledger</p>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center space-x-5 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                        <div className="w-16 h-16 bg-white rounded-2xl overflow-hidden border border-slate-200">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctorName}`} alt="" />
                        </div>
                        <div>
                            <p className="text-lg font-black text-slate-800 leading-none">{doctorName}</p>
                            <p className="text-[10px] font-black text-[#3b5bfd] uppercase tracking-widest mt-2">
                                {doctorProfile?.specialization || 'Clinical Specialist'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50/50 rounded-[40px] p-10 space-y-6 border border-dashed border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Base Consultation Fee</span>
                            <span className="text-slate-800 font-black">${priceDetails?.baseFee || 0}.00</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Service Tax (GST 10%)</span>
                            </div>
                            <span className="text-slate-800 font-black">+ ${priceDetails?.tax || 0}.00</span>
                        </div>
                        <div className="h-px bg-slate-200"></div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-slate-900 font-black text-xl tracking-tight">Net Payable Amount</span>
                            <span className="text-[#3b5bfd] font-black text-3xl tracking-tighter">${priceDetails?.total || 0}.00</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onClose}
                        className="py-6 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] border-2 border-slate-50 rounded-3xl hover:bg-slate-50 transition-all"
                    >
                        Go Back
                    </button>
                    <button
                        onClick={onConfirm}
                        className="py-6 bg-slate-900 text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all"
                    >
                        Verify & Pay
                    </button>
                </div>

                <p className="text-center text-[9px] text-slate-300 font-medium uppercase tracking-widest">
                    Clinical Transactions Secured via Sandbox Provider
                </p>
            </div>
        </div>
    );
};

export default AppointmentPriceModal;
