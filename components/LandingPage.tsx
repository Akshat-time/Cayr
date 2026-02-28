import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Screenshot list for hero carousel ──────────────────────────────────────────
const SCREENSHOTS = [
    { src: '/card_clinical_intake-removebg-preview.png', label: 'Clinical Intake' },
    { src: '/symptom-triage-removebg-preview.png', label: 'Symptom Triage' },
    { src: '/card_body_scan-removebg-preview.png', label: 'Body Mapping' },
    { src: '/interpreter-removebg-preview.png', label: 'Interpreter Bridge' },
    { src: '/pharmacy-removebg-preview.png', label: 'Pharmacy' },
];

// ── Minimal SVG Icons ──────────────────────────────────────────────────────────
const IconIntake = () => (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);
const IconVault = () => (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);
const IconLocator = () => (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const IconChat = () => (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
);
const IconCheck = () => (
    <svg className="w-4 h-4 text-[#1F4E79] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
    </svg>
);
const IconShield = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);
const IconLock = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);
const IconUsers = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);
const IconServer = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
);

// ── Demo Chat Data ─────────────────────────────────────────────────────────────
const DEMO_CHAT = [
    { from: 'patient', text: 'Hello Dr. Ayan, my appointment is tomorrow at 9 AM?' },
    { from: 'doctor', text: 'Yes, confirmed. Please have your latest blood work ready.' },
    { from: 'patient', text: 'Will do. Should I fast beforehand?' },
    { from: 'doctor', text: 'Yes, a 12-hour fast is recommended. See you then.' },
];

// ── Main Component ─────────────────────────────────────────────────────────────
const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeSlide, setActiveSlide] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);
    const [fadeIn, setFadeIn] = useState(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Scroll listener for navbar
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Auto-rotating carousel
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setFadeIn(false);
            setTimeout(() => {
                setActiveSlide(prev => (prev + 1) % SCREENSHOTS.length);
                setFadeIn(true);
            }, 400);
        }, 4500);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    const goToSlide = (idx: number) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setFadeIn(false);
        setTimeout(() => { setActiveSlide(idx); setFadeIn(true); }, 300);
    };

    return (
        <div className="min-h-screen bg-[#F4F7FB] font-sans" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

            {/* ── 1. NAVBAR ─────────────────────────────────────────────────────────── */}
            <nav
                className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
                style={{
                    backgroundColor: isScrolled ? '#FFFFFF' : 'transparent',
                    boxShadow: isScrolled ? '0 4px 16px rgba(16,42,67,0.08)' : 'none',
                }}
            >
                <div className="max-w-7xl mx-auto px-6 md:px-10 h-[72px] flex items-center justify-between">
                    <img src="/cayr-logo.png" alt="Cayr" className="h-9 w-auto object-contain" />
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/auth')}
                            className="px-5 py-2.5 rounded-[8px] text-[14px] font-semibold text-[#1F4E79] border border-[#1F4E79] hover:bg-[#EAF1F8] transition-colors"
                        >
                            Login
                        </button>
                        <button
                            onClick={() => navigate('/auth')}
                            className="px-5 py-2.5 rounded-[8px] text-[14px] font-semibold text-white bg-[#1F4E79] hover:bg-[#163A5C] transition-colors shadow-sm"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── 2. HERO ───────────────────────────────────────────────────────────── */}
            <section className="max-w-7xl mx-auto px-6 md:px-10 pt-36 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                {/* Left */}
                <div className="space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#EAF1F8] border border-[#D6E0EB] rounded-full">
                        <span className="w-2 h-2 bg-[#1F4E79] rounded-full animate-pulse"></span>
                        <span className="text-[12px] font-semibold text-[#1F4E79] uppercase tracking-wide">Healthcare Platform</span>
                    </div>
                    <h1 className="text-[44px] md:text-[52px] font-bold text-[#1C2B39] leading-[1.1] tracking-tight">
                        Seamless care.<br />
                        Connected patients.<br />
                        <span className="text-[#1F4E79]">Smarter practice.</span>
                    </h1>
                    <p className="text-[17px] font-normal text-[#6B7C8F] leading-relaxed max-w-md">
                        CAYR connects patients and doctors through secure messaging, smart intake, appointment tracking, and unified clinical records.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        <button
                            onClick={() => navigate('/auth')}
                            className="px-8 py-4 bg-[#1F4E79] text-white font-semibold text-[15px] rounded-[8px] hover:bg-[#163A5C] transition-colors shadow-sm"
                        >
                            Get Started
                        </button>
                        <button
                            onClick={() => navigate('/auth')}
                            className="px-8 py-4 border border-[#1F4E79] text-[#1F4E79] font-semibold text-[15px] rounded-[8px] hover:bg-[#EAF1F8] transition-colors"
                        >
                            Login
                        </button>
                    </div>
                </div>

                {/* Right — Screenshot Carousel */}
                <div className="relative">
                    <div
                        className="relative bg-[#FFFFFF] rounded-[24px] border border-[#E3EAF2] overflow-hidden"
                        style={{
                            boxShadow: '0 20px 60px rgba(15,42,67,0.12)',
                            animation: 'floatY 4s ease-in-out infinite',
                        }}
                    >
                        {/* Faux browser bar */}
                        <div className="bg-[#F4F7FB] border-b border-[#E3EAF2] px-5 py-3 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E3EAF2]"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E3EAF2]"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E3EAF2]"></span>
                            <div className="ml-3 flex-1 bg-[#EAF1F8] rounded-full h-5 flex items-center px-3">
                                <span className="text-[10px] text-[#6B7C8F] font-medium">app.cayr.health</span>
                            </div>
                        </div>
                        {/* Preview image */}
                        <div
                            className="relative h-[340px] flex items-center justify-center bg-[#F4F7FB]"
                            style={{ transition: 'opacity 0.4s ease', opacity: fadeIn ? 1 : 0 }}
                        >
                            <img
                                src={SCREENSHOTS[activeSlide].src}
                                alt={SCREENSHOTS[activeSlide].label}
                                className="h-[280px] object-contain drop-shadow-lg"
                            />
                            <div className="absolute bottom-4 left-0 right-0 text-center">
                                <span className="inline-block px-3 py-1 bg-[#FFFFFF] border border-[#E3EAF2] rounded-full text-[11px] font-semibold text-[#1F4E79]">
                                    {SCREENSHOTS[activeSlide].label}
                                </span>
                            </div>
                        </div>
                        {/* Dots */}
                        <div className="flex justify-center gap-2 p-4 bg-[#FFFFFF] border-t border-[#E3EAF2]">
                            {SCREENSHOTS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => goToSlide(i)}
                                    className={`rounded-full transition-all ${i === activeSlide ? 'w-5 h-2 bg-[#1F4E79]' : 'w-2 h-2 bg-[#D6E0EB] hover:bg-[#9FB3C8]'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 3. BUILT FOR BOTH SIDES ───────────────────────────────────────────── */}
            <section className="bg-[#FFFFFF] border-y border-[#E3EAF2] py-24">
                <div className="max-w-7xl mx-auto px-6 md:px-10">
                    <div className="text-center mb-16">
                        <h2 className="text-[36px] font-bold text-[#1C2B39] tracking-tight">Built for Both Sides of Care</h2>
                        <p className="text-[16px] text-[#6B7C8F] mt-3 max-w-lg mx-auto">One platform, two powerful portals — built to serve every stakeholder in the care journey.</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Doctor Column */}
                        <div className="bg-[#F4F7FB] rounded-[16px] border border-[#E3EAF2] p-8 space-y-8">
                            <div>
                                <div className="w-12 h-12 rounded-[10px] bg-[#EAF1F8] border border-[#D6E0EB] flex items-center justify-center text-[#1F4E79] mb-5">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                </div>
                                <h3 className="text-[24px] font-bold text-[#1C2B39]">For Modern Practices</h3>
                                <p className="text-[14px] text-[#6B7C8F] mt-2">Everything a clinical practice needs to run efficiently in one unified dashboard.</p>
                            </div>
                            {/* Stat mockup */}
                            <div className="grid grid-cols-3 gap-3">
                                {[['24', 'Patients Today'], ['8', 'Pending'], ['94%', 'Satisfaction']].map(([val, label]) => (
                                    <div key={label} className="bg-[#FFFFFF] rounded-[10px] border border-[#E3EAF2] p-4 text-center">
                                        <p className="text-[22px] font-bold text-[#1F4E79]">{val}</p>
                                        <p className="text-[10px] font-semibold text-[#6B7C8F] uppercase tracking-wide mt-1">{label}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Appointment list mockup */}
                            <div className="bg-[#FFFFFF] rounded-[10px] border border-[#E3EAF2] divide-y divide-[#F4F7FB]">
                                {[['James Patel', '09:00 AM', 'General'], ['Sarah K.', '11:30 AM', 'Cardiology'], ['Amit R.', '02:00 PM', 'Pediatrics']].map(([name, time, dept]) => (
                                    <div key={name} className="flex items-center justify-between p-4">
                                        <div>
                                            <p className="text-[13px] font-semibold text-[#1C2B39]">{name}</p>
                                            <p className="text-[11px] text-[#6B7C8F] font-medium">{dept}</p>
                                        </div>
                                        <span className="text-[12px] font-semibold text-[#1F4E79]">{time}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Bullets */}
                            <ul className="space-y-3 pt-2">
                                {['Real-time appointments overview', 'Centralized patient records', 'AI-assisted intake', 'Secure clinical coordination'].map(b => (
                                    <li key={b} className="flex items-start gap-3">
                                        <IconCheck />
                                        <span className="text-[14px] font-medium text-[#1C2B39]">{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Patient Column */}
                        <div className="bg-[#F4F7FB] rounded-[16px] border border-[#E3EAF2] p-8 space-y-8">
                            <div>
                                <div className="w-12 h-12 rounded-[10px] bg-[#EAF1F8] border border-[#D6E0EB] flex items-center justify-center text-[#1F4E79] mb-5">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                                <h3 className="text-[24px] font-bold text-[#1C2B39]">For Connected Patients</h3>
                                <p className="text-[14px] text-[#6B7C8F] mt-2">Access specialists, review records, and communicate with your care team — all in one place.</p>
                            </div>
                            {/* Specialist mockup */}
                            <div className="space-y-3">
                                {[['Dr. Sarah Wilson', 'Cardiology', '4.9'], ['Dr. James Chen', 'Pediatrics', '4.8'], ['Dr. Ayan Malik', 'General', '4.9']].map(([name, spec, rating]) => (
                                    <div key={name} className="bg-[#FFFFFF] rounded-[10px] border border-[#E3EAF2] p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-[13px] font-semibold text-[#1C2B39]">{name}</p>
                                            <p className="text-[11px] text-[#6B7C8F] font-medium">{spec}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                            <span className="text-[12px] font-bold text-[#1C2B39]">{rating}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Bullets */}
                            <ul className="space-y-3 pt-2">
                                {['Easy specialist discovery', 'One-click booking', 'Access medical reports anytime', 'Encrypted communication'].map(b => (
                                    <li key={b} className="flex items-start gap-3">
                                        <IconCheck />
                                        <span className="text-[14px] font-medium text-[#1C2B39]">{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 4. MESSAGING PREVIEW ──────────────────────────────────────────────── */}
            <section className="py-24 max-w-7xl mx-auto px-6 md:px-10">
                <div className="text-center mb-16">
                    <h2 className="text-[36px] font-bold text-[#1C2B39] tracking-tight">Secure. Encrypted. Instant.</h2>
                    <p className="text-[16px] text-[#6B7C8F] mt-3">Real-time clinical communication between patients and doctors — end-to-end encrypted.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Patient Side */}
                    <div className="bg-[#FFFFFF] rounded-[16px] border border-[#E3EAF2] overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#F4F7FB] border-b border-[#E3EAF2] flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#EAF1F8] border border-[#D6E0EB] flex items-center justify-center">
                                <svg className="w-4 h-4 text-[#1F4E79]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <div>
                                <p className="text-[13px] font-semibold text-[#1C2B39]">Patient View</p>
                                <p className="text-[11px] text-[#6B7C8F]">Messaging Dr. Ayan</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-3">
                            {DEMO_CHAT.map((msg, i) => (
                                <div key={i} className={`flex ${msg.from === 'patient' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className="max-w-[80%] px-4 py-3 rounded-[12px] text-[13px] font-medium leading-relaxed"
                                        style={{
                                            background: msg.from === 'doctor' ? '#1F4E79' : '#EAF1F8',
                                            color: msg.from === 'doctor' ? '#FFFFFF' : '#1C2B39',
                                        }}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Doctor Side */}
                    <div className="bg-[#FFFFFF] rounded-[16px] border border-[#E3EAF2] overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#F4F7FB] border-b border-[#E3EAF2] flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#EAF1F8] border border-[#D6E0EB] flex items-center justify-center">
                                <svg className="w-4 h-4 text-[#1F4E79]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            </div>
                            <div>
                                <p className="text-[13px] font-semibold text-[#1C2B39]">Doctor View</p>
                                <p className="text-[11px] text-[#6B7C8F]">Dr. Ayan — Reply Console</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-3">
                            {DEMO_CHAT.map((msg, i) => (
                                <div key={i} className={`flex ${msg.from === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className="max-w-[80%] px-4 py-3 rounded-[12px] text-[13px] font-medium leading-relaxed"
                                        style={{
                                            background: msg.from === 'patient' ? '#1F4E79' : '#EAF1F8',
                                            color: msg.from === 'patient' ? '#FFFFFF' : '#1C2B39',
                                        }}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 5. FEATURE GRID ───────────────────────────────────────────────────── */}
            <section className="bg-[#FFFFFF] border-y border-[#E3EAF2] py-24">
                <div className="max-w-7xl mx-auto px-6 md:px-10">
                    <div className="text-center mb-14">
                        <h2 className="text-[36px] font-bold text-[#1C2B39] tracking-tight">Core Clinical Capabilities</h2>
                        <p className="text-[16px] text-[#6B7C8F] mt-3">Purpose-built tools for modern healthcare workflows.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: <IconIntake />, title: 'Smart Intake', desc: 'AI-guided SOAP note preparation before visits, reducing consultation time by 40%.' },
                            { icon: <IconVault />, title: 'Clinical Vault', desc: 'Secure, centralized storage for all medical records, reports, and prescriptions.' },
                            { icon: <IconLocator />, title: 'Facility Locator', desc: 'Real-time map of nearby verified hospitals, clinics, labs, and emergency centers.' },
                            { icon: <IconChat />, title: 'Secure Messaging', desc: 'End-to-end encrypted communication between patients and their care team.' },
                        ].map((card) => (
                            <div
                                key={card.title}
                                className="bg-[#FFFFFF] rounded-[14px] border border-[#E3EAF2] p-7 space-y-4 transition-shadow hover:shadow-[0_6px_24px_rgba(15,42,67,0.10)] group"
                            >
                                <div className="w-12 h-12 rounded-[10px] bg-[#F4F7FB] border border-[#E3EAF2] flex items-center justify-center text-[#1F4E79] group-hover:bg-[#EAF1F8] transition-colors">
                                    {card.icon}
                                </div>
                                <h3 className="text-[17px] font-semibold text-[#1C2B39]">{card.title}</h3>
                                <p className="text-[14px] text-[#6B7C8F] leading-relaxed">{card.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 6. TRUST SECTION ──────────────────────────────────────────────────── */}
            <section className="bg-[#EAF1F8] border-b border-[#D6E0EB] py-24">
                <div className="max-w-7xl mx-auto px-6 md:px-10">
                    <div className="text-center mb-14">
                        <h2 className="text-[36px] font-bold text-[#1C2B39] tracking-tight">Built for Secure Healthcare Ecosystems</h2>
                        <p className="text-[16px] text-[#6B7C8F] mt-3 max-w-xl mx-auto">Infrastructure and compliance standards designed around the sensitivity of clinical data.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: <IconUsers />, title: 'Role-Based Access', desc: 'Separate, permissioned portals ensure patients and doctors only see what they need to.' },
                            { icon: <IconShield />, title: 'Verified Accounts', desc: 'Physician credentials and patient records are validated before platform access is granted.' },
                            { icon: <IconLock />, title: 'Encrypted Communication', desc: 'All messaging and data transfer sessions are encrypted end-to-end by default.' },
                            { icon: <IconServer />, title: 'Scalable Infrastructure', desc: 'Built on cloud-native architecture to serve clinics of any size with zero downtime.' },
                        ].map((item) => (
                            <div key={item.title} className="bg-[#FFFFFF] rounded-[14px] border border-[#D6E0EB] p-7 space-y-4">
                                <div className="w-12 h-12 rounded-[10px] bg-[#EAF1F8] border border-[#D6E0EB] flex items-center justify-center text-[#1F4E79]">
                                    {item.icon}
                                </div>
                                <h3 className="text-[16px] font-semibold text-[#1C2B39]">{item.title}</h3>
                                <p className="text-[14px] text-[#6B7C8F] leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 7. FINAL CTA ──────────────────────────────────────────────────────── */}
            <section className="py-28 max-w-7xl mx-auto px-6 md:px-10 text-center">
                <div className="max-w-2xl mx-auto space-y-8">
                    <h2 className="text-[40px] md:text-[48px] font-bold text-[#1C2B39] tracking-tight leading-tight">
                        Experience connected care with CAYR.
                    </h2>
                    <p className="text-[17px] text-[#6B7C8F] leading-relaxed">
                        Join thousands of patients and clinicians who rely on CAYR for secure, intelligent healthcare coordination.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                        <button
                            onClick={() => navigate('/auth')}
                            className="px-10 py-4 bg-[#1F4E79] text-white font-semibold text-[16px] rounded-[8px] hover:bg-[#163A5C] transition-colors shadow-sm"
                        >
                            Create Account
                        </button>
                        <button
                            onClick={() => navigate('/auth')}
                            className="px-10 py-4 border border-[#1F4E79] text-[#1F4E79] font-semibold text-[16px] rounded-[8px] hover:bg-[#EAF1F8] transition-colors"
                        >
                            Login
                        </button>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
            <footer className="border-t border-[#E3EAF2] bg-[#FFFFFF] py-10">
                <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <img src="/cayr-logo.png" alt="Cayr" className="h-8 w-auto object-contain" />
                    <p className="text-[13px] font-medium text-[#9FB3C8]">© 2026 CAYR Health Technologies. All rights reserved.</p>
                </div>
            </footer>

            {/* ── Floating animation keyframes ──────────────────────────────────────── */}
            <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
        </div>
    );
};

export default LandingPage;
