import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';

interface PatientProfileProps {
  user: User;
  onUpdateProfile: (updatedData: Partial<User>) => void;
}

const COMMON_CONDITIONS = [
  'Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Thyroid Disorder',
  'Arthritis', 'Migraine', 'Depression / Anxiety', 'COPD', 'Kidney Disease',
];
const COMMON_ALLERGIES = [
  'Penicillin', 'Aspirin', 'Sulfa drugs', 'Ibuprofen', 'Latex',
  'Pollen', 'Dust / Mites', 'Peanuts', 'Shellfish', 'Dairy',
];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

// ── Mini TagInput for profile ──────────────────────────────────────────────────
const ProfileTagInput: React.FC<{
  values: string[];
  suggestions: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}> = ({ values, suggestions, onChange, placeholder }) => {
  const [inp, setInp] = useState('');
  const add = (v: string) => { const t = v.trim(); if (t && !values.includes(t)) onChange([...values, t]); setInp(''); };
  const remove = (v: string) => onChange(values.filter(x => x !== v));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map(v => (
          <span key={v} className="flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
            {v}
            <button type="button" onClick={() => remove(v)} className="text-indigo-400 hover:text-red-500 transition-colors">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={inp} onChange={e => setInp(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(inp); } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
        <button type="button" onClick={() => add(inp)}
          className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition">Add</button>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {suggestions.filter(s => !values.includes(s)).slice(0, 5).map(s => (
          <button key={s} type="button" onClick={() => add(s)}
            className="px-2.5 py-1 border border-slate-200 text-slate-500 rounded-full text-[11px] hover:border-indigo-400 hover:text-indigo-600 transition">
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Progress ring ─────────────────────────────────────────────────────────────
const ProgressRing: React.FC<{ pct: number; size?: number }> = ({ pct, size = 52 }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3b5bfd" strokeWidth="5"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  );
};

const PatientProfile: React.FC<PatientProfileProps> = ({ user, onUpdateProfile }) => {
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [isEditingIntake, setIsEditingIntake] = useState(false);
  const [showSaveFeedback, setShowSaveFeedback] = useState<string | null>(null);

  // ── Intake data ────────────────────────────────────────────────────────────
  const [intakeRecord, setIntakeRecord] = useState<any>(null);
  const [intakeLoading, setIntakeLoading] = useState(true);
  const [intakeSaving, setIntakeSaving] = useState(false);
  const [showProgressPopup, setShowProgressPopup] = useState(false);

  // ── Intake local edit state ────────────────────────────────────────────────
  const [iHeight, setIHeight] = useState('');
  const [iWeight, setIWeight] = useState('');
  const [iBloodPressure, setIBloodPressure] = useState('');
  const [iHeartRate, setIHeartRate] = useState('');
  const [iBloodType, setIBloodType] = useState('');
  const [iAllergies, setIAllergies] = useState<string[]>([]);
  const [iConditions, setIConditions] = useState<string[]>([]);
  const [iMedications, setIMedications] = useState<string[]>([]);
  const [iMedicalHistory, setIMedicalHistory] = useState('');
  const [iSymptoms, setISymptoms] = useState('');

  // ── Profile form data ──────────────────────────────────────────────────────
  const [formData, setFormData] = useState<Partial<User>>({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
    dob: user.dob || '',
    medicalHistory: user.medicalHistory || '',
    height: user.height || 0,
    weight: user.weight || 0,
  });

  useEffect(() => {
    setFormData({
      name: user.name, email: user.email, phone: user.phone || '',
      address: user.address || '', dob: user.dob || '',
      medicalHistory: user.medicalHistory || '',
      height: user.height || 0, weight: user.weight || 0,
    });
  }, [user]);

  // ── Fetch intake on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/intake/me', { credentials: 'include' });
        const data = await res.json();
        if (data.intake) {
          const d = data.intake;
          setIntakeRecord(d);
          fillIntakeState(d);
          // Show progress popup if not submitted
          if (d.status !== 'submitted') {
            setShowProgressPopup(true);
          }
        } else {
          // No intake at all → show popup to prompt
          setShowProgressPopup(true);
        }
      } catch { /* silent */ }
      finally { setIntakeLoading(false); }
    };
    load();
  }, []);

  const fillIntakeState = (d: any) => {
    setIHeight(d.height ? String(d.height) : '');
    setIWeight(d.weight ? String(d.weight) : '');
    setIBloodPressure(d.bloodPressure || '');
    setIHeartRate(d.heartRate ? String(d.heartRate) : '');
    setIBloodType(d.bloodType || '');
    setIAllergies(d.allergies || []);
    setIConditions(d.conditions || []);
    setIMedications(d.currentMedications || []);
    setIMedicalHistory(d.medicalHistory || '');
    setISymptoms(d.symptoms || '');
  };

  // ── Save intake draft / update ─────────────────────────────────────────────
  const handleSaveIntake = useCallback(async () => {
    setIntakeSaving(true);
    try {
      const body = {
        height: iHeight, weight: iWeight,
        bloodPressure: iBloodPressure, heartRate: iHeartRate,
        bloodType: iBloodType,
        allergies: JSON.stringify(iAllergies),
        conditions: JSON.stringify(iConditions),
        currentMedications: JSON.stringify(iMedications),
        medicalHistory: iMedicalHistory, symptoms: iSymptoms,
        // Always keep current status (if submitted stays submitted)
        status: intakeRecord?.status === 'submitted' ? 'submitted' : 'draft',
      };
      const res = await fetch('/api/intake/save-draft', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.intake) {
        setIntakeRecord(data.intake);
        if (data.intake.status === 'submitted') setShowProgressPopup(false);
        setShowSaveFeedback('intake');
        setTimeout(() => setShowSaveFeedback(null), 3000);
      }
    } catch { /* silent */ }
    finally {
      setIntakeSaving(false);
      setIsEditingIntake(false);
    }
  }, [iHeight, iWeight, iBloodPressure, iHeartRate, iBloodType,
    iAllergies, iConditions, iMedications, iMedicalHistory, iSymptoms, intakeRecord]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'height' || name === 'weight') ? (value === '' ? 0 : parseFloat(value)) : value
    }));
  };

  const handleSave = (section: 'personal' | 'medical' | 'stats') => {
    onUpdateProfile(formData);
    if (section === 'personal') setIsEditingPersonal(false);
    if (section === 'medical') setIsEditingMedical(false);
    if (section === 'stats') setIsEditingStats(false);
    setShowSaveFeedback(section);
    setTimeout(() => setShowSaveFeedback(null), 3000);
  };

  // BMI
  const getBMI = () => {
    const w = formData.weight || 0, h = formData.height || 0;
    if (w > 0 && h > 0) return parseFloat((w / Math.pow(h / 100, 2)).toFixed(1));
    return null;
  };
  const getBMIInterp = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
    if (bmi < 25) return { label: 'Normal Weight', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' };
    return { label: 'Obesity', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' };
  };
  const bmiValue = getBMI();
  const bmiInterp = bmiValue ? getBMIInterp(bmiValue) : null;

  const progress = intakeRecord?.progressPercentage ?? 0;
  const intakeStatus = intakeRecord?.status ?? null;

  const statusBadge = (s: string | null) => {
    if (s === 'submitted') return <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">✓ Submitted</span>;
    if (s === 'draft') return <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full">📋 Draft</span>;
    if (s === 'skipped') return <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full">⏭ Skipped</span>;
    return <span className="px-3 py-1 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full">✗ Not Started</span>;
  };

  const inputCls = "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* ── Intake Completion Progress Popup ────────────────────────────────── */}
      {showProgressPopup && !intakeLoading && (
        <div className="relative bg-gradient-to-br from-[#3b5bfd] to-[#4c6ef5] rounded-[32px] p-8 text-white shadow-2xl shadow-blue-500/20 animate-in slide-in-from-top-4 duration-500">
          <button onClick={() => setShowProgressPopup(false)}
            className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-white/80 text-lg">
            ✕
          </button>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative flex-shrink-0">
              <ProgressRing pct={progress} size={88} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black">{progress}%</span>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-black tracking-tight mb-1">
                {intakeStatus === 'skipped' ? 'Complete Your Health Profile' :
                  intakeStatus === 'draft' ? 'Resume Your Intake Form' :
                    'Start Your Intake Form'}
              </h3>
              <p className="text-blue-200 text-sm mb-4">
                {intakeStatus === 'skipped'
                  ? 'You skipped the intake earlier. Fill in your details below to help doctors serve you better.'
                  : intakeStatus === 'draft'
                    ? 'You have an unfinished intake form. Edit the "Intake Details" section below to complete it.'
                    : 'Your health intake is not yet complete. Add your details now for personalised care.'}
              </p>
              <button
                onClick={() => { setIsEditingIntake(true); setShowProgressPopup(false); document.getElementById('intake-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="px-6 py-3 bg-white text-[#3b5bfd] rounded-2xl font-black text-sm hover:bg-blue-50 transition-all shadow-lg">
                {intakeStatus === 'draft' ? 'Continue Intake →' : 'Fill Intake Details →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center space-x-6 mb-10">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white shadow-xl">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-1.5 rounded-xl border-2 border-white shadow-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{user.name}</h2>
          <p className="text-sm font-bold text-blue-500 uppercase tracking-widest mt-1">Patient Profile • {user.id}</p>
          <div className="mt-2 flex items-center gap-2">
            {statusBadge(intakeStatus)}
            {!intakeLoading && intakeStatus !== 'submitted' && (
              <span className="text-[11px] text-slate-400 font-bold">{progress}% complete</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Information */}
        <div className="shadow-card p-8 bg-white border border-slate-100 flex flex-col relative overflow-hidden rounded-[32px]">
          {showSaveFeedback === 'personal' && (
            <div className="absolute inset-x-0 top-0 bg-green-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1 text-center animate-in slide-in-from-top duration-300">
              Personal Information Saved
            </div>
          )}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <span className="w-1.5 h-6 bg-blue-500 rounded-full mr-3"></span>
              Personal Details
            </h3>
            <button onClick={() => isEditingPersonal ? handleSave('personal') : setIsEditingPersonal(true)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditingPersonal ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
              {isEditingPersonal ? 'Save Changes' : 'Edit Info'}
            </button>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Full Name', name: 'name', val: formData.name, display: user.name },
              { label: 'Email Address', name: 'email', val: formData.email, display: user.email, type: 'email' },
            ].map(f => (
              <div key={f.name} className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{f.label}</label>
                {isEditingPersonal
                  ? <input name={f.name} type={f.type || 'text'} value={f.val} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" />
                  : <p className="p-3 font-bold text-slate-700 bg-slate-50/50 rounded-xl">{f.display}</p>
                }
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone</label>
                {isEditingPersonal
                  ? <input name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="Phone" />
                  : <p className="p-3 font-bold text-slate-700 bg-slate-50/50 rounded-xl">{user.phone || 'Not set'}</p>
                }
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date of Birth</label>
                {isEditingPersonal
                  ? <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" />
                  : <p className="p-3 font-bold text-slate-700 bg-slate-50/50 rounded-xl">{user.dob || 'Not set'}</p>
                }
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Home Address</label>
              {isEditingPersonal
                ? <input name="address" value={formData.address} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="Full address" />
                : <p className="p-3 font-bold text-slate-700 bg-slate-50/50 rounded-xl">{user.address || 'Not set'}</p>
              }
            </div>
          </div>
        </div>

        {/* Physical Stats with BMI */}
        <div className="shadow-card p-8 bg-white border border-slate-100 flex flex-col relative overflow-hidden rounded-[32px]">
          {showSaveFeedback === 'stats' && (
            <div className="absolute inset-x-0 top-0 bg-green-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1 text-center animate-in slide-in-from-top duration-300">
              Vitals Information Saved
            </div>
          )}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <span className="w-1.5 h-6 bg-amber-500 rounded-full mr-3"></span>
              Physical Stats
            </h3>
            <button onClick={() => isEditingStats ? handleSave('stats') : setIsEditingStats(true)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditingStats ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
              {isEditingStats ? 'Save Stats' : 'Update Stats'}
            </button>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: 'Height', name: 'height', unit: 'cm', accentHover: 'hover:bg-blue-50 hover:border-blue-100' },
                { label: 'Weight', name: 'weight', unit: 'kg', accentHover: 'hover:bg-rose-50 hover:border-rose-100' },
              ].map(f => (
                <div key={f.name} className={`bg-slate-50 rounded-3xl p-6 flex flex-col items-center justify-center text-center border border-transparent transition-all ${f.accentHover}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{f.label}</span>
                  {isEditingStats
                    ? <div className="flex items-center">
                      <input type="number" name={f.name} value={(formData as any)[f.name]} onChange={handleChange}
                        className="w-20 bg-white p-2 rounded-xl text-center font-black text-xl text-slate-800 border border-slate-200 outline-none focus:border-blue-500" />
                      <span className="ml-2 font-bold text-slate-500">{f.unit}</span>
                    </div>
                    : <p className="text-3xl font-black text-slate-800">{(user as any)[f.name] || '--'}<span className="text-sm font-bold text-slate-400 ml-1">{f.unit}</span></p>
                  }
                </div>
              ))}
            </div>
            {bmiValue && bmiInterp && (
              <div className={`p-5 rounded-[24px] flex items-center justify-between ${bmiInterp.bg} border ${bmiInterp.border} animate-in fade-in zoom-in duration-300`}>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Body Mass Index (BMI)</span>
                  <div className="flex items-center">
                    <span className={`text-sm font-black uppercase tracking-widest ${bmiInterp.color}`}>{bmiInterp.label}</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-[10px] font-bold text-slate-500">Normal: 18.5–24.9</span>
                  </div>
                </div>
                <p className="text-3xl font-black text-slate-800 tracking-tighter">{bmiValue}</p>
              </div>
            )}
          </div>
        </div>

        {/* Medical Background */}
        <div className="md:col-span-2 shadow-card p-8 bg-white border border-slate-100 relative overflow-hidden rounded-[32px]">
          {showSaveFeedback === 'medical' && (
            <div className="absolute inset-x-0 top-0 bg-green-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1 text-center animate-in slide-in-from-top duration-300">
              Medical History Persisted
            </div>
          )}
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <span className="w-1.5 h-6 bg-rose-500 rounded-full mr-3"></span>
              Medical Background & Notes
            </h3>
            <button onClick={() => isEditingMedical ? handleSave('medical') : setIsEditingMedical(true)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditingMedical ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-100' : 'bg-[#1a1d1f] text-white hover:bg-slate-800'}`}>
              {isEditingMedical ? 'Save Changes' : 'Edit Medical File'}
            </button>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Detailed Medical History</label>
              {isEditingMedical
                ? <textarea name="medicalHistory" value={formData.medicalHistory} onChange={handleChange} rows={6}
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:border-rose-500 focus:bg-white leading-relaxed transition-all"
                  placeholder="List previous surgeries, chronic conditions, family medical history, current allergies, or lifestyle habits..." />
                : <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 min-h-[140px]">
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {user.medicalHistory || 'No medical history recorded. Keeping your history updated helps our doctors provide personalised and efficient clinical care.'}
                  </p>
                </div>
              }
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3">Core Health Insights</p>
                <ul className="space-y-2">
                  {['Regular health checkups required', 'Active BMI & Vitals Monitoring'].map(t => (
                    <li key={t} className="flex items-center text-sm font-bold text-blue-900">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>{t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 bg-rose-50/50 rounded-3xl border border-rose-100/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-3">Reported Allergies</p>
                {(iAllergies.length > 0 ? iAllergies : (user.allergies || [])).length > 0
                  ? <div className="flex flex-wrap gap-1.5">{(iAllergies.length > 0 ? iAllergies : user.allergies || []).map(a => (
                    <span key={a} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">{a}</span>
                  ))}</div>
                  : <p className="text-sm font-bold text-rose-900">None documented.</p>
                }
              </div>
            </div>
          </div>
        </div>

        {/* ── Intake Details ──────────────────────────────────────────────── */}
        <div id="intake-section" className="md:col-span-2 shadow-card p-8 bg-white border border-slate-100 relative overflow-hidden rounded-[32px]">
          {showSaveFeedback === 'intake' && (
            <div className="absolute inset-x-0 top-0 bg-green-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1 text-center animate-in slide-in-from-top duration-300">
              Intake Details Saved ✓
            </div>
          )}

          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <span className="w-1.5 h-6 bg-indigo-500 rounded-full mr-3"></span>
                Intake Details
              </h3>
              <div className="flex items-center gap-3 mt-2">
                {statusBadge(intakeStatus)}
                {!intakeLoading && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#3b5bfd] rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">{progress}% complete</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => isEditingIntake ? handleSaveIntake() : setIsEditingIntake(true)}
              disabled={intakeSaving}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${isEditingIntake ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
              {intakeSaving ? 'Saving…' : isEditingIntake ? 'Save Intake' : 'Edit Intake'}
            </button>
          </div>

          {intakeLoading ? (
            <div className="py-10 flex items-center justify-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold">Loading intake data…</span>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Vitals */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Vitals</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Height (cm)', key: 'height', val: iHeight, set: setIHeight, hint: 'e.g. 170' },
                    { label: 'Weight (kg)', key: 'weight', val: iWeight, set: setIWeight, hint: 'e.g. 65' },
                    { label: 'Heart Rate (bpm)', key: 'heartRate', val: iHeartRate, set: setIHeartRate, hint: 'e.g. 72' },
                  ].map(f => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{f.label}</label>
                      {isEditingIntake
                        ? <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.hint} className={inputCls} />
                        : <p className="p-3 bg-slate-50/70 rounded-xl font-bold text-slate-700">{f.val || '—'}</p>
                      }
                    </div>
                  ))}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Blood Pressure</label>
                    {isEditingIntake
                      ? <input type="text" value={iBloodPressure} onChange={e => setIBloodPressure(e.target.value)} placeholder="120/80" className={inputCls} />
                      : <p className="p-3 bg-slate-50/70 rounded-xl font-bold text-slate-700">{iBloodPressure || '—'}</p>
                    }
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Blood Type</label>
                    {isEditingIntake
                      ? <select value={iBloodType} onChange={e => setIBloodType(e.target.value)} className={inputCls}>
                        <option value="">Select…</option>
                        {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      : <p className="p-3 bg-slate-50/70 rounded-xl font-bold text-slate-700">{iBloodType || '—'}</p>
                    }
                  </div>
                </div>
              </div>

              {/* Medical Background */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Medical Background</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allergies</label>
                    {isEditingIntake
                      ? <ProfileTagInput values={iAllergies} suggestions={COMMON_ALLERGIES} onChange={setIAllergies} placeholder="e.g. Penicillin…" />
                      : iAllergies.length > 0
                        ? <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/70 rounded-xl min-h-[44px]">{iAllergies.map(a => <span key={a} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold">{a}</span>)}</div>
                        : <p className="p-3 bg-slate-50/70 rounded-xl font-bold text-slate-400">None recorded</p>
                    }
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pre-existing Conditions</label>
                    {isEditingIntake
                      ? <ProfileTagInput values={iConditions} suggestions={COMMON_CONDITIONS} onChange={setIConditions} placeholder="e.g. Diabetes…" />
                      : iConditions.length > 0
                        ? <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/70 rounded-xl min-h-[44px]">{iConditions.map(c => <span key={c} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">{c}</span>)}</div>
                        : <p className="p-3 bg-slate-50/70 rounded-xl font-bold text-slate-400">None recorded</p>
                    }
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Medications</label>
                    {isEditingIntake
                      ? <ProfileTagInput values={iMedications} suggestions={[]} onChange={setIMedications} placeholder="e.g. Metformin 500mg…" />
                      : iMedications.length > 0
                        ? <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/70 rounded-xl min-h-[44px]">{iMedications.map(m => <span key={m} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{m}</span>)}</div>
                        : <p className="p-3 bg-slate-50/70 rounded-xl font-bold text-slate-400">None recorded</p>
                    }
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medical History</label>
                    {isEditingIntake
                      ? <textarea value={iMedicalHistory} onChange={e => setIMedicalHistory(e.target.value)} rows={3}
                        className={inputCls + ' resize-none'} placeholder="Previous surgeries, hospitalisations…" />
                      : <p className="p-3 bg-slate-50/70 rounded-xl font-bold text-slate-600 min-h-[44px] text-sm leading-relaxed">{iMedicalHistory || '—'}</p>
                    }
                  </div>
                </div>
              </div>

              {/* Current Symptoms */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Current Symptoms</p>
                {isEditingIntake
                  ? <textarea value={iSymptoms} onChange={e => setISymptoms(e.target.value)} rows={3}
                    className={inputCls + ' resize-none'} placeholder="Describe current symptoms…" />
                  : <p className="p-3 bg-slate-50/70 rounded-xl font-bold text-slate-600 text-sm leading-relaxed">{iSymptoms || 'No symptoms recorded.'}</p>
                }
              </div>

              {/* Uploaded docs */}
              {intakeRecord?.uploadedFiles?.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Uploaded Documents</p>
                  <div className="space-y-2">
                    {intakeRecord.uploadedFiles.map((f: any) => (
                      <div key={f._id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-sm text-slate-700 font-medium truncate">{f.fileName || f.title}</span>
                        <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${f.extractionStatus === 'done' ? 'bg-green-50 text-green-600' :
                            f.extractionStatus === 'processing' ? 'bg-blue-50 text-blue-600 animate-pulse' :
                              f.extractionStatus === 'failed' ? 'bg-red-50 text-red-500' :
                                'bg-slate-100 text-slate-400'
                          }`}>
                          {f.extractionStatus === 'done' ? '✓ Ready' : f.extractionStatus === 'processing' ? '⚙ Processing' : f.extractionStatus === 'failed' ? '✗ Failed' : '⏳ Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isEditingIntake && intakeStatus !== 'submitted' && (
                <div className="flex justify-end pt-2">
                  <button onClick={() => setIsEditingIntake(true)}
                    className="px-6 py-3 bg-[#3b5bfd] text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition">
                    ✏️ Edit & Complete Intake
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
