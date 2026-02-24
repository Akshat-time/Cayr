import React, { useState } from 'react';

interface PaymentUIProps {
    appointmentId: string;
    doctorId: string;
    doctorName: string;
    amount: number;
    onConfirm: (appointmentId: string, doctorId: string, amount: number) => Promise<boolean>;
    onClose: () => void;
}

const PaymentUI: React.FC<PaymentUIProps> = ({ appointmentId, doctorId, doctorName, amount, onConfirm, onClose }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handlePay = async () => {
        setIsProcessing(true);
        const success = await onConfirm(appointmentId, doctorId, amount);
        if (success) {
            setIsSuccess(true);
            setTimeout(onClose, 2000);
        } else {
            setIsProcessing(false);
            alert('Mock Payment Failed. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] shadow-2xl p-10 max-w-md w-full space-y-8 animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-inner">
                        💳
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Secure Checkout</h2>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Clinical Consultation Payment</p>
                </div>

                {!isSuccess ? (
                    <div className="space-y-8">
                        <div className="bg-slate-50 rounded-3xl p-6 space-y-4 border border-slate-100">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Consultation with</span>
                                <span className="text-slate-900 font-black">{doctorName}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Service Fee</span>
                                <span className="text-slate-900 font-black">${amount}.00</span>
                            </div>
                            <div className="h-px bg-slate-200"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-900 font-black text-lg tracking-tight">Total Amount</span>
                                <span className="text-blue-600 font-black text-2xl tracking-tighter">${amount}.00</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handlePay}
                                disabled={isProcessing}
                                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {isProcessing ? 'Verifying Card...' : 'Confirm Mock Payment'}
                            </button>
                            <button
                                onClick={onClose}
                                disabled={isProcessing}
                                className="w-full py-5 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] hover:text-slate-600 transition"
                            >
                                Cancel Transaction
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-6 py-10 animate-in zoom-in-90 duration-500">
                        <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-3xl mx-auto shadow-lg shadow-green-100 animate-bounce">
                            ✓
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Payment Received!</h3>
                            <p className="text-slate-400 font-medium text-sm">Clinical session is now unlocked.</p>
                        </div>
                    </div>
                )}

                <div className="text-center">
                    <p className="text-[9px] text-slate-300 font-medium uppercase tracking-[0.2em]">
                        AES-256 Encrypted • PCI DSS Compliant Sandbox
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentUI;
