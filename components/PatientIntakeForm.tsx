import React, { useState, useRef, useCallback, useEffect } from 'react';
import { User } from '../types';

interface PatientIntakeFormProps {
    user: User;
    onComplete: () => void;
    onSkip: () => void;
}

type Step = 1 | 2 | 3;

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const COMMON_CONDITIONS = [
    'Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Thyroid Disorder',
    'Arthritis', 'Migraine', 'Depression / Anxiety', 'COPD', 'Kidney Disease',
];
const COMMON_ALLERGIES = [
    'Penicillin', 'Aspirin', 'Sulfa drugs', 'Ibuprofen', 'Latex',
    'Pollen', 'Dust / Mites', 'Peanuts', 'Shellfish', 'Dairy',
];
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// ── Tag-input ─────────────────────────────────────────────────────────────────
const TagInput: React.FC<{
    values: string[];
    suggestions: string[];
    onChange: (vals: string[]) => void;
    placeholder: string;
}> = ({ values, suggestions, onChange, placeholder }) => {
    const [input, setInput] = useState('');
    const add = (val: string) => {
        const v = val.trim();
        if (v && !values.includes(v)) onChange([...values, v]);
        setInput('');
    };
    const remove = (v: string) => onChange(values.filter(x => x !== v));
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {values.map(v => (
                    <span key={v} className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        {v}
                        <button type="button" onClick={() => remove(v)} className="text-blue-500 hover:text-red-500 transition-colors">×</button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
                <button type="button" onClick={() => add(input)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.filter(s => !values.includes(s)).slice(0, 6).map(s => (
                    <button key={s} type="button" onClick={() => add(s)}
                        className="px-2.5 py-1 border border-slate-200 text-slate-500 rounded-full text-[11px] hover:border-blue-400 hover:text-blue-600 transition">
                        + {s}
                    </button>
                ))}
            </div>
        </div>
    );
};

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</label>
        {children}
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
);

const inputCls = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition placeholder:text-slate-400";

const PatientIntakeForm: React.FC<PatientIntakeFormProps> = ({ user, onComplete, onSkip }) => {
    const [step, setStep] = useState<Step>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isSkipping, setIsSkipping] = useState(false);
    const [isLoadingDraft, setIsLoadingDraft] = useState(true);
    const [error, setError] = useState('');
    const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [existingStatus, setExistingStatus] = useState<'draft' | 'submitted' | 'skipped' | null>(null);

    // Step 1
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [bloodPressure, setBloodPressure] = useState('');
    const [heartRate, setHeartRate] = useState('');
    const [bloodType, setBloodType] = useState('');

    // Step 2
    const [allergies, setAllergies] = useState<string[]>([]);
    const [conditions, setConditions] = useState<string[]>([]);
    const [medications, setMedications] = useState<string[]>([]);
    const [medicalHistory, setMedicalHistory] = useState('');

    // Step 3
    const [symptoms, setSymptoms] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Fetch existing draft on mount ─────────────────────────────────────────
    useEffect(() => {
        const fetchDraft = async () => {
            try {
                const res = await fetch('/api/intake/me', { credentials: 'include' });
                const data = await res.json();
                if (data.intake) {
                    const d = data.intake;
                    setExistingStatus(d.status);
                    if (d.status === 'draft' || d.status === 'submitted') {
                        if (d.height) setHeight(String(d.height));
                        if (d.weight) setWeight(String(d.weight));
                        if (d.bloodPressure) setBloodPressure(d.bloodPressure);
                        if (d.heartRate) setHeartRate(String(d.heartRate));
                        if (d.bloodType) setBloodType(d.bloodType);
                        if (d.allergies?.length) setAllergies(d.allergies);
                        if (d.conditions?.length) setConditions(d.conditions);
                        if (d.currentMedications?.length) setMedications(d.currentMedications);
                        if (d.medicalHistory) setMedicalHistory(d.medicalHistory);
                        if (d.symptoms) setSymptoms(d.symptoms);
                        if (d.lastModifiedAt) {
                            setDraftSavedAt(new Date(d.lastModifiedAt).toLocaleString());
                        }
                    }
                }
            } catch { /* silent */ }
            finally { setIsLoadingDraft(false); }
        };
        fetchDraft();
    }, []);

    // ── File helpers ──────────────────────────────────────────────────────────
    const addFiles = useCallback((incoming: FileList | File[]) => {
        const arr = Array.from(incoming);
        const valid = arr.filter(f => {
            if (!ALLOWED_TYPES.includes(f.type)) { setError(`${f.name}: unsupported type. Use PDF, JPG, or PNG.`); return false; }
            if (f.size > 5 * 1024 * 1024) { setError(`${f.name}: exceeds 5 MB limit.`); return false; }
            return true;
        });
        setFiles(prev => {
            const combined = [...prev, ...valid];
            if (combined.length > 5) { setError('Maximum 5 files allowed.'); return prev; }
            return combined;
        });
    }, []);

    const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        addFiles(e.dataTransfer.files);
    };

    // ── Save draft to server ──────────────────────────────────────────────────
    const handleSaveDraft = async () => {
        setIsSavingDraft(true);
        setError('');
        try {
            const body = {
                height, weight, bloodPressure, heartRate, bloodType,
                allergies: JSON.stringify(allergies),
                conditions: JSON.stringify(conditions),
                currentMedications: JSON.stringify(medications),
                medicalHistory, symptoms,
                status: 'draft',
            };
            const res = await fetch('/api/intake/save-draft', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');
            setDraftSavedAt(new Date().toLocaleString());
            setExistingStatus('draft');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSavingDraft(false);
        }
    };

    // ── Submit: send as FormData (multipart) ─────────────────────────────────
    const handleSubmit = async () => {
        setIsSubmitting(true); setError('');
        try {
            const fd = new FormData();
            fd.append('height', height);
            fd.append('weight', weight);
            fd.append('bloodPressure', bloodPressure);
            fd.append('heartRate', heartRate);
            fd.append('bloodType', bloodType);
            fd.append('allergies', JSON.stringify(allergies));
            fd.append('conditions', JSON.stringify(conditions));
            fd.append('currentMedications', JSON.stringify(medications));
            fd.append('medicalHistory', medicalHistory);
            fd.append('symptoms', symptoms);
            files.forEach(f => fd.append('files', f));

            const res = await fetch('/api/intake/submit', {
                method: 'POST',
                credentials: 'include',
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Submission failed');
            onComplete();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = async () => {
        setIsSkipping(true);
        try { await fetch('/api/intake/skip', { method: 'POST', credentials: 'include' }); }
        finally { setIsSkipping(false); onSkip(); }
    };

    const stepLabels = ['Vitals', 'Medical Background', 'Symptoms & Files'];

    if (isLoadingDraft) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#f0f4ff] via-[#e8f0fe] to-[#f4f7fe] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#3b5bfd] border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-semibold text-sm">Loading your intake data…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f0f4ff] via-[#e8f0fe] to-[#f4f7fe] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-[#3b5bfd] to-[#4c6ef5] px-8 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-white text-2xl font-black tracking-tight">Health Intake Form</h1>
                            <p className="text-blue-200 text-sm mt-0.5">
                                Welcome, {user.name?.split(' ')[0] || 'there'}! Let's set up your health profile.
                            </p>
                            {existingStatus === 'draft' && draftSavedAt && (
                                <p className="text-blue-200/70 text-xs mt-1">📋 Resuming draft saved {draftSavedAt}</p>
                            )}
                        </div>
                        <button onClick={handleSkip} disabled={isSkipping}
                            className="text-blue-200 hover:text-white text-sm font-semibold underline underline-offset-2 transition disabled:opacity-50">
                            {isSkipping ? 'Skipping…' : 'Skip for now'}
                        </button>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            {stepLabels.map((label, i) => (
                                <span key={label} className={`text-xs font-bold transition-colors ${i + 1 <= step ? 'text-white' : 'text-blue-300'}`}>
                                    {i + 1}. {label}
                                </span>
                            ))}
                        </div>
                        <div className="h-2 bg-blue-400/40 rounded-full overflow-hidden">
                            <div className="h-full bg-white rounded-full transition-all duration-500"
                                style={{ width: `${step === 1 ? 5 : step === 2 ? 50 : 100}%` }} />
                        </div>
                    </div>
                </div>

                {/* Step Content */}
                <div className="px-8 py-8 space-y-6">

                    {/* Step 1 */}
                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <p className="text-slate-500 text-sm">Enter your current measurements. These help your doctor see your baseline health at a glance.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Height (cm)" hint="e.g. 170">
                                    <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="170" className={inputCls} />
                                </Field>
                                <Field label="Weight (kg)" hint="e.g. 65">
                                    <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="65" className={inputCls} />
                                </Field>
                                <Field label="Blood Pressure" hint="e.g. 120/80">
                                    <input type="text" value={bloodPressure} onChange={e => setBloodPressure(e.target.value)} placeholder="120/80" className={inputCls} />
                                </Field>
                                <Field label="Heart Rate (bpm)" hint="e.g. 72">
                                    <input type="number" value={heartRate} onChange={e => setHeartRate(e.target.value)} placeholder="72" className={inputCls} />
                                </Field>
                            </div>
                            <Field label="Blood Type">
                                <select value={bloodType} onChange={e => setBloodType(e.target.value)} className={inputCls}>
                                    <option value="">Select blood type…</option>
                                    {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                </select>
                            </Field>
                        </div>
                    )}

                    {/* Step 2 */}
                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <p className="text-slate-500 text-sm">Help your care team understand your history.</p>
                            <Field label="Known Allergies">
                                <TagInput values={allergies} suggestions={COMMON_ALLERGIES} onChange={setAllergies} placeholder="e.g. Penicillin…" />
                            </Field>
                            <Field label="Pre-existing Conditions">
                                <TagInput values={conditions} suggestions={COMMON_CONDITIONS} onChange={setConditions} placeholder="e.g. Diabetes…" />
                            </Field>
                            <Field label="Current Medications">
                                <TagInput values={medications} suggestions={[]} onChange={setMedications} placeholder="e.g. Metformin 500mg…" />
                            </Field>
                            <Field label="Medical History" hint="Previous surgeries, hospitalizations, major illnesses">
                                <textarea value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)}
                                    rows={3} placeholder="Briefly describe any relevant medical history…" className={inputCls + ' resize-none'} />
                            </Field>
                        </div>
                    )}

                    {/* Step 3 */}
                    {step === 3 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <p className="text-slate-500 text-sm">Describe current symptoms and optionally upload lab reports — AI will extract key values automatically.</p>
                            <Field label="Current Symptoms" hint="Describe what you're experiencing now">
                                <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)}
                                    rows={3} placeholder="e.g. Occasional headache, fatigue, mild chest discomfort…"
                                    className={inputCls + ' resize-none'} />
                            </Field>

                            {/* Drag-drop file upload */}
                            <Field label="Upload Reports (optional)" hint="PDF, JPG, PNG — max 5 MB each, up to 5 files">
                                <div
                                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={onDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${isDragging ? 'border-[#3b5bfd] bg-blue-50' : 'border-slate-200 bg-slate-50/60 hover:border-blue-300 hover:bg-blue-50/40'}`}
                                >
                                    <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp"
                                        className="hidden" onChange={e => e.target.files && addFiles(e.target.files)} />
                                    <svg className={`w-10 h-10 mx-auto mb-2 transition-colors ${isDragging ? 'text-[#3b5bfd]' : 'text-slate-300'}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-slate-500 text-sm font-semibold">
                                        {isDragging ? 'Drop files here!' : <>Drop files or <span className="text-[#3b5bfd]">browse</span></>}
                                    </p>
                                    <p className="text-slate-400 text-xs mt-1">PDF, JPG, PNG, WEBP — up to 5 MB each</p>
                                </div>

                                {files.length > 0 && (
                                    <ul className="mt-3 space-y-2">
                                        {files.map((f, i) => (
                                            <li key={i} className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <svg className="w-4 h-4 text-[#3b5bfd] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-xs text-slate-700 font-medium truncate">{f.name}</span>
                                                    <span className="text-[10px] text-slate-400 shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                                                </div>
                                                <button type="button" onClick={() => removeFile(i)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors text-lg leading-none shrink-0">×</button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Field>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                                    <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-red-600 text-sm">{error}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Draft save toast */}
                    {draftSavedAt && !error && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-semibold animate-in fade-in duration-300">
                            ✓ Draft saved — {draftSavedAt}
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <button type="button" onClick={() => setStep(s => Math.max(1, s - 1) as Step)}
                            disabled={step === 1}
                            className="px-5 py-3 rounded-2xl text-slate-500 font-bold text-sm hover:bg-slate-100 transition disabled:opacity-30 disabled:cursor-not-allowed">
                            ← Back
                        </button>

                        <div className="flex items-center gap-2">
                            {[1, 2, 3].map(s => (
                                <div key={s} className={`h-2 rounded-full transition-all ${s === step ? 'bg-[#3b5bfd] w-5' : s < step ? 'bg-[#3b5bfd] opacity-40 w-2' : 'bg-slate-200 w-2'}`} />
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Save Draft button — shown on steps 1 and 2 */}
                            {step < 3 && (
                                <button type="button" onClick={handleSaveDraft} disabled={isSavingDraft}
                                    className="px-4 py-3 rounded-2xl text-slate-500 border border-slate-200 font-semibold text-xs hover:bg-slate-50 transition disabled:opacity-50">
                                    {isSavingDraft ? '💾 Saving…' : '💾 Save Draft'}
                                </button>
                            )}
                            {step < 3 ? (
                                <button type="button" onClick={() => setStep(s => Math.min(3, s + 1) as Step)}
                                    className="px-6 py-3 bg-[#3b5bfd] text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition">
                                    Next →
                                </button>
                            ) : (
                                <button type="button" onClick={handleSubmit} disabled={isSubmitting}
                                    className="px-6 py-3 bg-[#3b5bfd] text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-60 flex items-center gap-2">
                                    {isSubmitting ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                                            </svg>
                                            Saving…
                                        </>
                                    ) : '✓ Submit & Go to Dashboard'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientIntakeForm;
