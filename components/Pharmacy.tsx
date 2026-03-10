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
    const [searchTerm, setSearchTerm] = useState('');
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
        <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-in slide-in-from-left duration-700">
                <div className="flex items-center gap-8">
                    <img src="/pharmacy-removebg-preview.png" alt="Pharmacy" className="h-24 w-24 md:h-28 md:w-28 object-contain filter drop-shadow-2xl" />
                    <div>
                        <h1 className="text-[32px] md:text-[40px] font-black text-[#1C2B39] tracking-tight leading-none uppercase">Pharmacy</h1>
                        <p className="text-[14px] font-medium text-[#6B7C8F] mt-2 uppercase tracking-widest">Direct clinical supply chain active</p>
                    </div>
                </div>

                {!isCheckout && (
                    <div className="relative w-full md:w-72">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#9FB3C8]">🔍</span>
                        <input
                            type="text"
                            placeholder="Search medications..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-3 bg-[#FFFFFF] border border-[#E3EAF2] rounded-[12px] text-[14px] font-medium text-[#1C2B39] outline-none focus:border-[#1F4E79] shadow-sm transition-colors"
                        />
                    </div>
                )}
            </div>

            <div className="bg-white rounded-[20px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex justify-between items-center border border-white/5">
                <div className="flex items-center space-x-6">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[14px] flex items-center justify-center text-3xl">💊</div>
                    <div>
                        <h2 className="text-[18px] font-bold text-slate-900">Medical Cart</h2>
                        <p className="text-[14px] font-medium text-slate-500 mt-1">{cart.reduce((a, b) => a + b.qty, 0)} items selected</p>
                    </div>
                </div>
                <div className="text-right flex items-center space-x-6">
                    <div className="text-[24px] font-bold text-slate-900 leading-none">${total.toFixed(2)}</div>
                    <button
                        disabled={cart.length === 0}
                        onClick={() => setIsCheckout(true)}
                        className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-[14px] text-[14px] font-bold shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        {isCheckout ? 'Processing...' : 'Checkout Now'}
                    </button>
                </div>
            </div>

            {isCheckout ? (
                <div className="p-20 text-center bg-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-slate-50 animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[14px] flex items-center justify-center text-4xl mx-auto mb-6">✅</div>
                    <h3 className="text-[24px] font-bold text-slate-900">Order Dispatched</h3>
                    <p className="text-[16px] font-medium text-slate-500 mt-2">Your medication will be delivered within 24 hours.</p>
                    <button onClick={() => { setIsCheckout(false); setCart([]); }} className="mt-8 px-10 py-4 bg-slate-900 text-white rounded-[14px] font-bold text-[14px] hover:bg-slate-800 transition-all">Return to Store</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(() => {
                        const filteredMedicines = MEDICINES.filter(m =>
                            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            m.description.toLowerCase().includes(searchTerm.toLowerCase())
                        );

                        if (filteredMedicines.length === 0) {
                            return (
                                <div className="col-span-full py-20 text-center">
                                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[14px] flex items-center justify-center text-4xl mx-auto mb-6">💊</div>
                                    <h3 className="text-[18px] font-semibold text-[#1C2B39]">No medications match your search</h3>
                                </div>
                            );
                        }

                        return filteredMedicines.map(med => (
                            <div key={med.id} className="bg-white p-6 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-slate-50 hover:border-emerald-200 transition-all group flex flex-col justify-between min-h-[320px]">
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 bg-slate-50 rounded-[12px] flex items-center justify-center text-xl">💊</div>
                                        <span className="text-[18px] font-bold text-emerald-600">${med.price.toFixed(2)}</span>
                                    </div>
                                    <h3 className="text-[18px] font-bold text-slate-900 tracking-tight leading-tight">{med.name}</h3>
                                    <p className="text-[13px] font-bold text-slate-400 mt-1 mb-4">{med.dose}</p>
                                    <p className="text-[14px] font-medium text-slate-500 leading-relaxed line-clamp-2">{med.description}</p>
                                </div>
                                <button onClick={() => addToCart(med.id)} className="w-full mt-8 py-4 bg-slate-50 text-slate-700 rounded-[14px] text-[13px] font-bold hover:bg-emerald-600 hover:text-white transition-all">
                                    Add to Cart
                                </button>
                            </div>
                        ));
                    })()}
                </div>
            )}
        </div>
    );
};

export default Pharmacy;
