import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PatientRegisterFormProps {
    onBack: () => void;
    onSwitchToLogin: () => void;
}

const PatientRegisterForm: React.FC<PatientRegisterFormProps> = ({ onBack, onSwitchToLogin }) => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '', email: '', password: '', phone: '',
        dob: '',
        addressDetails: { street: '', city: '', state: '', zip: '', country: 'India' }
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFetchingPin, setIsFetchingPin] = useState(false);
    const [pinError, setPinError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setForm(prev => ({
                ...prev,
                [parent]: { ...(prev as any)[parent], [child]: value }
            }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
        setError('');
    };

    const runPincodeLookup = React.useCallback(async (pin: string, country: string) => {
        if (!pin || pin.length < 4) return;
        setPinError(''); setIsFetchingPin(true);
        try {
            let city = '', state = '';
            if (country === 'India') {
                const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
                const data = await res.json();
                if (data[0]?.Status === 'Success') {
                    const po = data[0].PostOffice?.[0];
                    city = po?.District || '';
                    state = po?.State || '';
                } else { setPinError('PIN code not found for India.'); }
            } else {
                const MAP: Record<string, string> = {
                    'United States': 'us', 'United Kingdom': 'gb', 'Canada': 'ca',
                    'Australia': 'au', 'Germany': 'de', 'France': 'fr'
                };
                const cc = MAP[country];
                if (!cc) { setPinError('Pincode lookup not available for this country.'); setIsFetchingPin(false); return; }
                const res = await fetch(`https://api.zippopotam.us/${cc}/${pin}`);
                if (!res.ok) { setPinError('Postal code not found.'); setIsFetchingPin(false); return; }
                const data = await res.json();
                city = data.places?.[0]?.['place name'] || '';
                state = data.places?.[0]?.['state'] || '';
            }
            if (city || state) {
                setForm(prev => ({
                    ...prev,
                    addressDetails: { ...prev.addressDetails, city, state }
                }));
            }
        } catch {
            setPinError('Lookup failed. Check your connection.');
        } finally { setIsFetchingPin(false); }
    }, []);

    React.useEffect(() => {
        const pin = form.addressDetails.zip.trim();
        const country = form.addressDetails.country.trim();
        if (pin.length < 4) return;
        const timer = setTimeout(() => runPincodeLookup(pin, country), 700);
        return () => clearTimeout(timer);
    }, [form.addressDetails.zip, form.addressDetails.country, runPincodeLookup]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { street, city, state, zip } = form.addressDetails;
        if (!form.name.trim() || !form.email.trim() || !form.password || !form.dob || !street.trim() || !city.trim() || !state.trim() || !zip.trim()) {
            setError('Please fill in all required fields.');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register/patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                    phone: form.phone.trim() || undefined,
                    dob: form.dob,
                    addressDetails: form.addressDetails
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Registration failed.');
                return;
            }

            // Login user immediately — backend already set the cookie
            login(data.user);
            navigate('/patient-intake');
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md w-full space-y-8 animate-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-[20px] mx-auto flex items-center justify-center text-white text-2xl mb-6 shadow-lg">
                    👤
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Create Patient Account</h2>
                <p className="text-slate-400 mt-2 text-sm font-medium">Quick setup. No medical info needed yet.</p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-semibold">
                    <span className="text-lg">⚠️</span>
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                    <label htmlFor="pr-name" className="text-xs font-black uppercase tracking-widest text-slate-500">Full Name</label>
                    <input
                        id="pr-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        placeholder="Jane Doe"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition text-slate-800 text-sm font-semibold placeholder:text-slate-300"
                    />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                    <label htmlFor="pr-email" className="text-xs font-black uppercase tracking-widest text-slate-500">Email Address</label>
                    <input
                        id="pr-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="jane@example.com"
                        value={form.email}
                        onChange={handleChange}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition text-slate-800 text-sm font-semibold placeholder:text-slate-300"
                    />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                    <label htmlFor="pr-password" className="text-xs font-black uppercase tracking-widest text-slate-500">Password</label>
                    <input
                        id="pr-password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        placeholder="At least 6 characters"
                        value={form.password}
                        onChange={handleChange}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition text-slate-800 text-sm font-semibold placeholder:text-slate-300"
                    />
                </div>

                {/* Phone (optional) */}
                <div className="space-y-1.5">
                    <label htmlFor="pr-phone" className="text-xs font-black uppercase tracking-widest text-slate-500">
                        Phone <span className="text-slate-300 font-medium normal-case tracking-normal">(optional)</span>
                    </label>
                    <input
                        id="pr-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+1 555 000 0000"
                        value={form.phone}
                        onChange={handleChange}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition text-slate-800 text-sm font-semibold placeholder:text-slate-300"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Date of Birth *</label>
                        <input
                            name="dob" type="date" required value={form.dob} onChange={handleChange}
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition text-slate-800 text-sm font-semibold"
                        />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Street Address *</label>
                        <input
                            name="addressDetails.street" type="text" required placeholder="123 Main St" value={form.addressDetails.street} onChange={handleChange}
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition text-slate-800 text-sm font-semibold"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Country *</label>
                        <select
                            name="addressDetails.country" required value={form.addressDetails.country} onChange={handleChange}
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition text-slate-800 text-sm font-semibold"
                        >
                            <option value="India">India</option>
                            <option value="United States">United States</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="Canada">Canada</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">PIN / Zip Code *</label>
                        <div className="relative">
                            <input
                                name="addressDetails.zip" type="text" required placeholder="e.g. 400001" value={form.addressDetails.zip} onChange={handleChange}
                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition text-slate-800 text-sm font-semibold pr-10"
                            />
                            {isFetchingPin && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" /></svg>
                                </div>
                            )}
                        </div>
                        {pinError && <p className="text-[10px] text-red-500 font-bold ml-1">{pinError}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">State *</label>
                        <input
                            name="addressDetails.state" type="text" required placeholder="State" value={form.addressDetails.state} onChange={handleChange}
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition text-slate-800 text-sm font-semibold"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">City *</label>
                        <input
                            name="addressDetails.city" type="text" required placeholder="City" value={form.addressDetails.city} onChange={handleChange}
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition text-slate-800 text-sm font-semibold"
                        />
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating account…
                        </span>
                    ) : 'Create Account & Enter'}
                </button>
            </form>

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-xs text-slate-400 font-bold uppercase tracking-widest hover:text-slate-700 transition"
                >
                    ← Back
                </button>
                <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-xs text-blue-600 font-bold hover:text-blue-800 transition"
                >
                    Already have an account? Login
                </button>
            </div>
        </div>
    );
};

export default PatientRegisterForm;
