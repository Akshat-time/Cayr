
import React, { useState } from 'react';

const MEDICINES = [
    { id: 'm1', name: 'Lisinopril', dose: '10mg', price: 12.50, description: 'ACE inhibitor for hypertension' },
    { id: 'm2', name: 'Metformin', dose: '500mg', price: 8.00, description: 'First-line medication for type 2 diabetes' },
    { id: 'm3', name: 'Atorvastatin', dose: '20mg', price: 15.00, description: 'Statin for lowering cholesterol' },
    { id: 'm4', name: 'Amoxicillin', dose: '500mg', price: 10.00, description: 'Antibiotic for bacterial infections' },
    { id: 'm5', name: 'Omeprazole', dose: '20mg', price: 11.00, description: 'Proton-pump inhibitor for acid reflux' },
    { id: 'm6', name: 'Albuterol Inhaler', dose: '90mcg', price: 45.00, description: 'Bronchodilator for asthma' },
];

const Pharmacy: React.FC = () => {
    const [cart, setCart] = useState<{ id: string, qty: number }[]>([]);
    const [isCheckout, setIsCheckout] = useState(false);

    const addToCart = (id: string) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === id);
            if (existing) {
                return prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { id, qty: 1 }];
        });
    };

    const total = cart.reduce((sum, item) => {
        const med = MEDICINES.find(m => m.id === item.id);
        return sum + (med ? med.price * item.qty : 0);
    }, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-emerald-50 p-8 rounded-[40px] border border-emerald-100">
                <div>
                    <h2 className="text-3xl font-black text-emerald-900 tracking-tight">Cayr Pharmacy</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-2">Verified Clinical Dispensary</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black text-emerald-900">${total.toFixed(2)}</div>
                    <button disabled={cart.length === 0} onClick={() => setIsCheckout(true)} className="mt-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:grayscale">
                        {isCheckout ? 'Processing...' : `Checkout (${cart.reduce((a, b) => a + b.qty, 0)})`}
                    </button>
                </div>
            </div>

            {isCheckout ? (
                <div className="p-20 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm">
                    <div className="text-6xl mb-6">✅</div>
                    <h3 className="text-2xl font-black text-slate-800">Order Dispatched</h3>
                    <p className="text-slate-500 font-medium mt-2">Your medication will be delivered to your registered address within 24 hours.</p>
                    <button onClick={() => { setIsCheckout(false); setCart([]); }} className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs">Return to Store</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {MEDICINES.map(med => (
                        <div key={med.id} className="bg-white p-6 rounded-[32px] border border-slate-100 hover:shadow-xl hover:border-emerald-200 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-xl text-emerald-600 font-black">💊</div>
                                <span className="text-lg font-black text-slate-900">${med.price}</span>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">{med.name}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{med.dose}</p>
                            <p className="text-xs text-slate-500 mt-4 leading-relaxed line-clamp-2">{med.description}</p>
                            <button onClick={() => addToCart(med.id)} className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest group-hover:bg-emerald-600 transition-colors">
                                Add to Cart
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Pharmacy;
