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

    const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim() || !form.password) {
            setError('Name, email and password are required.');
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
                    phone: form.phone.trim() || undefined
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
