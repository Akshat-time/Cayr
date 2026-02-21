import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface DoctorRegisterFormProps {
    onBack: () => void;
    onSwitchToLogin: () => void;
}

const SPECIALIZATIONS = [
    'General Practice',
    'Cardiology',
    'Dermatology',
    'Endocrinology',
    'Gastroenterology',
    'Gynecology',
    'Hematology',
    'Nephrology',
    'Neurology',
    'Oncology',
    'Ophthalmology',
    'Orthopedics',
    'Pediatrics',
    'Psychiatry',
    'Pulmonology',
    'Radiology',
    'Rheumatology',
    'Surgery',
    'Urology',
    'Other',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TIME_SLOTS = [
    '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
    '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00',
    '16:00 - 17:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00',
];

const DoctorRegisterForm: React.FC<DoctorRegisterFormProps> = ({ onBack, onSwitchToLogin }) => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        licenseNumber: '',
        specialization: '',
        experienceYears: '',
        clinicName: '',
        consultationFee: '',
    });
    const [availableDays, setAvailableDays] = useState<string[]>([]);
    const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const toggleDay = (day: string) => {
        setAvailableDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };

    const toggleSlot = (slot: string) => {
        setAvailableTimeSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.name || !form.email || !form.password || !form.phone ||
            !form.licenseNumber || !form.specialization || !form.experienceYears) {
            setError('Please fill in all required fields.');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (availableDays.length === 0) {
            setError('Please select at least one available day.');
            return;
        }
        if (availableTimeSlots.length === 0) {
            setError('Please select at least one available time slot.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/register/doctor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                    phone: form.phone.trim(),
                    licenseNumber: form.licenseNumber.trim().toUpperCase(),
                    specialization: form.specialization,
                    experienceYears: Number(form.experienceYears),
                    clinicName: form.clinicName.trim() || undefined,
                    consultationFee: form.consultationFee ? Number(form.consultationFee) : undefined,
                    availableDays,
                    availableTimeSlots,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Registration failed.');
                return;
            }

            login(data.user);
            navigate('/doctor-dashboard');
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white outline-none transition text-slate-800 text-sm font-semibold placeholder:text-slate-300";
    const labelClass = "block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5";

    return (
        <div className="w-full max-w-2xl animate-in zoom-in-95 duration-500">
            <div className="bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl p-6 sm:p-10">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-50 rounded-[20px] mx-auto flex items-center justify-center text-3xl mb-5">🩺</div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Doctor Registration</h2>
                    <p className="text-slate-400 mt-2 text-sm font-medium">Your profile will be reviewed before approval.</p>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-semibold mb-6">
                        <span className="text-lg mt-0.5">⚠️</span>{error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* ── Section: Account ── */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-4">Account Details</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Full Name *</label>
                                <input name="name" type="text" required autoComplete="name"
                                    placeholder="Dr. John Smith" value={form.name} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Email *</label>
                                <input name="email" type="email" required autoComplete="email"
                                    placeholder="doctor@hospital.com" value={form.email} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Password *</label>
                                <input name="password" type="password" required autoComplete="new-password"
                                    placeholder="Min 6 characters" value={form.password} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Phone *</label>
                                <input name="phone" type="tel" required autoComplete="tel"
                                    placeholder="+1 555 000 0000" value={form.phone} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    {/* ── Section: Professional ── */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-4">Professional Details</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>License Number *</label>
                                <input name="licenseNumber" type="text" required
                                    placeholder="MED-123456" value={form.licenseNumber} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Specialization *</label>
                                <select name="specialization" required value={form.specialization} onChange={handleChange}
                                    className={inputClass}>
                                    <option value="">Select specialization</option>
                                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Experience (Years) *</label>
                                <input name="experienceYears" type="number" required min="0" max="60"
                                    placeholder="5" value={form.experienceYears} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Consultation Fee <span className="text-slate-300 font-medium normal-case tracking-normal">(optional, $)</span></label>
                                <input name="consultationFee" type="number" min="0"
                                    placeholder="150" value={form.consultationFee} onChange={handleChange} className={inputClass} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Clinic / Hospital Name <span className="text-slate-300 font-medium normal-case tracking-normal">(optional)</span></label>
                                <input name="clinicName" type="text"
                                    placeholder="City Medical Center" value={form.clinicName} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    {/* ── Section: Available Days ── */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-3">Available Days *</p>
                        <div className="flex flex-wrap gap-2">
                            {DAYS.map(day => (
                                <button key={day} type="button" onClick={() => toggleDay(day)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${availableDays.includes(day)
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}>
                                    {day.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Section: Available Time Slots ── */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-3">Available Time Slots *</p>
                        <div className="flex flex-wrap gap-2">
                            {TIME_SLOTS.map(slot => (
                                <button key={slot} type="button" onClick={() => toggleSlot(slot)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${availableTimeSlots.includes(slot)
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}>
                                    {slot}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={loading}
                        className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all">
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Creating account…
                            </span>
                        ) : 'Submit Registration'}
                    </button>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-between pt-6">
                    <button type="button" onClick={onBack}
                        className="text-xs text-slate-400 font-bold uppercase tracking-widest hover:text-slate-700 transition">
                        ← Back
                    </button>
                    <button type="button" onClick={onSwitchToLogin}
                        className="text-xs text-indigo-600 font-bold hover:text-indigo-800 transition">
                        Already registered? Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DoctorRegisterForm;
