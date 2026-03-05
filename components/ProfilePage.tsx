
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, UserRole } from '../types';

// ── Intake Progress Ring ───────────────────────────────────────────────────────
const IntakeRing: React.FC<{ pct: number; size?: number }> = ({ pct, size = 64 }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3b5bfd" strokeWidth="5"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  );
};

// ── Intake Tag Input ───────────────────────────────────────────────────────────
const TagInput: React.FC<{
  values: string[]; suggestions: string[]; onChange: (v: string[]) => void; placeholder: string;
}> = ({ values, suggestions, onChange, placeholder }) => {
  const [inp, setInp] = useState('');
  const add = (v: string) => { const t = v.trim(); if (t && !values.includes(t)) onChange([...values, t]); setInp(''); };
  const remove = (v: string) => onChange(values.filter(x => x !== v));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map(v => (
          <span key={v} className="flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
            {v}<button type="button" onClick={() => remove(v)} className="text-indigo-400 hover:text-red-500 transition-colors text-xs leading-none">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={inp} onChange={e => setInp(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(inp); } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
        <button type="button" onClick={() => add(inp)} className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition">Add</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.filter(s => !values.includes(s)).slice(0, 5).map(s => (
          <button key={s} type="button" onClick={() => add(s)}
            className="px-2.5 py-1 border border-slate-200 text-slate-500 rounded-full text-[11px] hover:border-indigo-400 hover:text-indigo-600 transition">+ {s}</button>
        ))}
      </div>
    </div>
  );
};

const INTAKE_CONDITIONS = ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Thyroid Disorder', 'Arthritis', 'Migraine'];
const INTAKE_ALLERGIES = ['Penicillin', 'Aspirin', 'Sulfa drugs', 'Ibuprofen', 'Latex', 'Pollen', 'Peanuts', 'Dairy'];
const BLOOD_TYPE_OPTS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

interface ProfilePageProps {
  user: User;
  onUpdateProfile: (updatedData: Partial<User>) => void;
  onLogout: () => void;
}

// ── Country / State data ─────────────────────────────────────────────────────
const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Singapore', 'UAE', 'Bangladesh', 'Pakistan',
  'Nepal', 'Sri Lanka', 'South Africa', 'Brazil', 'Mexico', 'Japan',
  'China', 'South Korea', 'New Zealand', 'Other'
];

const STATES_BY_COUNTRY: Record<string, string[]> = {
  'India': [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli', 'Daman & Diu',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ],
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
    'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
    'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ],
  'United Kingdom': [
    'England', 'Scotland', 'Wales', 'Northern Ireland'
  ],
  'Canada': [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
    'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 'Prince Edward Island',
    'Quebec', 'Saskatchewan'
  ],
  'Australia': [
    'Australian Capital Territory', 'New South Wales', 'Northern Territory',
    'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia'
  ],
};

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const LS_KEY = 'cayr_profile_data';

// ── Small reusable field component ───────────────────────────────────────────
const Field: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
    {children}
  </div>
);

const inputCls = (editing: boolean) =>
  `w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#3b5bfd] focus:bg-white transition-all ${editing ? '' : 'opacity-70 cursor-default'}`;

// ── Main Component ────────────────────────────────────────────────────────────
const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpdateProfile, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingPin, setIsFetchingPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Intake state ─────────────────────────────────────────────────────────
  const [intakeRecord, setIntakeRecord] = useState<any>(null);
  const [intakeLoading, setIntakeLoading] = useState(true);
  const [intakeSaving, setIntakeSaving] = useState(false);
  const [showIntakePopup, setShowIntakePopup] = useState(false);
  const [intakeSaved, setIntakeSaved] = useState(false);
  const [isEditingIntake, setIsEditingIntake] = useState(false);

  const [iHeight, setIHeight] = useState('');
  const [iWeight, setIWeight] = useState('');
  const [iBP, setIBP] = useState('');
  const [iHR, setIHR] = useState('');
  const [iBloodType, setIBloodType] = useState('');
  const [iAllergies, setIAllergies] = useState<string[]>([]);
  const [iConditions, setIConditions] = useState<string[]>([]);
  const [iMeds, setIMeds] = useState<string[]>([]);
  const [iHistory, setIHistory] = useState('');
  const [iSymptoms, setISymptoms] = useState('');

  // Load from server first, fall back to localStorage
  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/users/me/profile', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setFormData({
              firstName: data.name?.split(' ')[0] || '',
              lastName: data.name?.split(' ').slice(1).join(' ') || '',
              email: data.email || user.email,
              phone: data.phone || '',
              dob: data.dob || '',
              gender: data.gender || 'Male',
              profilePicture: data.profilePicture || '',
              addressDetails: data.addressDetails || { street: '', city: '', state: '', zip: '', country: 'India' },
              bloodType: data.bloodType || 'O+',
              allergies: data.allergies || [],
              conditions: data.conditions || [],
              currentMedications: data.currentMedications || [],
              medicalHistory: data.medicalHistory || '',
              height: data.height ?? 0,
              weight: data.weight ?? 0,
              notifications: data.notifications || { email: true, sms: false },
              twoFactorEnabled: data.twoFactorEnabled ?? false,
              specialty: data.specialty || '',
              licenseNumber: data.licenseNumber || '',
              experienceYears: data.experienceYears || '',
              clinicName: data.clinicName || '',
              consultationFee: data.consultationFee || '',
              availableDays: data.availableDays || [],
              availableTimeSlots: data.availableTimeSlots || [],
            });
          }
          return;
        }
      } catch { /* network error – fall through to localStorage */ }
      // Fallback: localStorage
      const saved = localStorage.getItem(LS_KEY + '_' + user.id);
      const merged: Partial<User> = saved ? { ...JSON.parse(saved) } : {};
      if (!cancelled) {
        setFormData({
          firstName: merged.firstName || user.firstName || user.name.split(' ')[0] || '',
          lastName: merged.lastName || user.lastName || user.name.split(' ')[1] || '',
          email: user.email,
          phone: merged.phone || user.phone || '',
          dob: merged.dob || user.dob || '',
          gender: merged.gender || user.gender || 'Male',
          profilePicture: merged.profilePicture || user.profilePicture || '',
          addressDetails: merged.addressDetails || user.addressDetails || { street: '', city: '', state: '', zip: '', country: 'India' },
          bloodType: merged.bloodType || user.bloodType || 'O+',
          allergies: merged.allergies || user.allergies || [],
          conditions: merged.conditions || user.conditions || [],
          currentMedications: merged.currentMedications || user.currentMedications || [],
          medicalHistory: merged.medicalHistory || user.medicalHistory || '',
          height: merged.height ?? user.height ?? 0,
          weight: merged.weight ?? user.weight ?? 0,
          notifications: merged.notifications || user.notifications || { email: true, sms: false },
          twoFactorEnabled: merged.twoFactorEnabled ?? user.twoFactorEnabled ?? false,
          specialty: (merged as any).specialty || (user as any).specialty || '',
          licenseNumber: (merged as any).licenseNumber || (user as any).licenseNumber || '',
          experienceYears: (merged as any).experienceYears || (user as any).experienceYears || '',
          clinicName: (merged as any).clinicName || (user as any).clinicName || '',
          consultationFee: (merged as any).consultationFee || (user as any).consultationFee || '',
          availableDays: (merged as any).availableDays || (user as any).availableDays || [],
          availableTimeSlots: (merged as any).availableTimeSlots || (user as any).availableTimeSlots || [],
        });
      }
    };
    loadProfile().finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  // ── Fetch intake record ───────────────────────────────────────────────────
  useEffect(() => {
    if ((user.role || '').toLowerCase() !== 'patient') { setIntakeLoading(false); return; }
    const fetchIntake = async () => {
      try {
        const res = await fetch('/api/intake/me', { credentials: 'include' });
        const data = await res.json();
        if (data.intake) {
          setIntakeRecord(data.intake);
          const d = data.intake;
          setIHeight(d.height ? String(d.height) : '');
          setIWeight(d.weight ? String(d.weight) : '');
          setIBP(d.bloodPressure || '');
          setIHR(d.heartRate ? String(d.heartRate) : '');
          setIBloodType(d.bloodType || '');
          setIAllergies(d.allergies || []);
          setIConditions(d.conditions || []);
          setIMeds(d.currentMedications || []);
          setIHistory(d.medicalHistory || '');
          setISymptoms(d.symptoms || '');
          if (d.status !== 'submitted') setShowIntakePopup(true);
        } else {
          // No record at all — show popup
          setShowIntakePopup(true);
        }
      } catch { /* silent */ }
      finally { setIntakeLoading(false); }
    };
    fetchIntake();
  }, [user.role]);

  // ── Save intake ───────────────────────────────────────────────────────────
  const handleSaveIntake = useCallback(async () => {
    setIntakeSaving(true);
    try {
      const body = {
        height: iHeight, weight: iWeight, bloodPressure: iBP, heartRate: iHR,
        bloodType: iBloodType,
        allergies: JSON.stringify(iAllergies),
        conditions: JSON.stringify(iConditions),
        currentMedications: JSON.stringify(iMeds),
        medicalHistory: iHistory, symptoms: iSymptoms,
        status: intakeRecord?.status === 'submitted' ? 'submitted' : 'draft',
      };
      const res = await fetch('/api/intake/save-draft', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.intake) {
        setIntakeRecord(data.intake);
        if (data.intake.status === 'submitted') setShowIntakePopup(false);
      }
      setIntakeSaved(true);
      setTimeout(() => setIntakeSaved(false), 3000);
    } catch { /* silent */ }
    finally { setIntakeSaving(false); setIsEditingIntake(false); }
  }, [iHeight, iWeight, iBP, iHR, iBloodType, iAllergies, iConditions, iMeds, iHistory, iSymptoms, intakeRecord]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...(prev[parent as keyof User] as any), [child]: value }
      }));
      // Reset state when country changes
      if (name === 'addressDetails.country') {
        setFormData(prev => ({
          ...prev,
          addressDetails: { ...(prev.addressDetails as any), country: value, state: '' }
        }));
      }
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name.startsWith('notify_')) {
        const key = name.replace('notify_', '') as 'email' | 'sms';
        setFormData(prev => ({ ...prev, notifications: { ...prev.notifications!, [key]: checked } }));
      } else {
        setFormData(prev => ({ ...prev, [name]: checked }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: (name === 'height' || name === 'weight') ? parseFloat(value) || 0 : value
      }));
    }
  };

  const handleArrayChange = (name: 'allergies' | 'conditions' | 'currentMedications', value: string) => {
    const items = value.split(',').map(i => i.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [name]: items }));
  };

  const toggleDay = (day: string) => {
    if (!isEditing) return;
    setFormData(prev => {
      const days = (prev as any).availableDays || [];
      return { ...prev, availableDays: days.includes(day) ? days.filter((d: string) => d !== day) : [...days, day] };
    });
  };

  const toggleSlot = (slot: string) => {
    if (!isEditing) return;
    setFormData(prev => {
      const slots = (prev as any).availableTimeSlots || [];
      return { ...prev, availableTimeSlots: slots.includes(slot) ? slots.filter((s: string) => s !== slot) : [...slots, slot] };
    });
  };

  // ── Profile picture ──────────────────────────────────────────────────────
  const handleAvatarClick = () => { if (isEditing) fileInputRef.current?.click(); };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert('Image must be under 3 MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setFormData(prev => ({ ...prev, profilePicture: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // ── Pincode auto-lookup (debounced) ────────────────────────────────────
  const runPincodeLookup = useCallback(async (pin: string, country: string) => {
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
        // zippopotam.us country codes
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
        setFormData(prev => ({
          ...prev,
          addressDetails: { ...prev.addressDetails as any, city, state }
        }));
      }
    } catch {
      setPinError('Lookup failed. Check your connection.');
    } finally { setIsFetchingPin(false); }
  }, []);

  // Debounce: fire lookup 700ms after the user stops typing the pincode
  useEffect(() => {
    const pin = formData.addressDetails?.zip?.trim() || '';
    const country = formData.addressDetails?.country?.trim() || 'India';
    if (!isEditing || pin.length < 4) return;
    const timer = setTimeout(() => runPincodeLookup(pin, country), 700);
    return () => clearTimeout(timer);
  }, [formData.addressDetails?.zip, formData.addressDetails?.country, isEditing, runPincodeLookup]);

  // ── Save: persist to backend + localStorage ─────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    if (!formData.email?.includes('@')) { alert('Please enter a valid email address.'); return; }
    const payload = {
      ...formData,
      name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim()
    };
    setIsSaving(true);
    try {
      const res = await fetch('/api/users/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setSuccessMessage(null);
        alert(err.error || 'Failed to save profile.');
        return;
      }
      const data = await res.json();
      // Also persist locally so reload is instant
      localStorage.setItem(LS_KEY + '_' + user.id, JSON.stringify(payload));
      onUpdateProfile({ ...payload, name: payload.name });
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      alert('Network error. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to saved/user data
    const saved = localStorage.getItem(LS_KEY + '_' + user.id);
    if (saved) setFormData(JSON.parse(saved));
    setIsEditing(false);
    setPinError('');
  };

  const getBMI = () => {
    const w = formData.weight || 0, h = formData.height || 0;
    if (w > 0 && h > 0) return parseFloat((w / ((h / 100) ** 2)).toFixed(1));
    return null;
  };
  const getBMIInterp = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-500', bg: 'bg-amber-50' };
    if (bmi < 25) return { label: 'Normal', color: 'text-green-500', bg: 'bg-green-50' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-500', bg: 'bg-orange-50' };
    return { label: 'Obese', color: 'text-rose-500', bg: 'bg-rose-50' };
  };

  const normalizedRole = (user?.role ?? '').toUpperCase();
  const isDoctor = normalizedRole === 'DOCTOR';
  const selectedCountry = formData.addressDetails?.country || '';
  const availableStates = STATES_BY_COUNTRY[selectedCountry] || [];
  const avatarSrc = formData.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`;

  if (isLoading) return (
    <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
      <div className="h-40 bg-white rounded-[40px] border border-slate-100" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-64 bg-white rounded-[40px] border border-slate-100" />
        <div className="h-64 bg-white rounded-[40px] border border-slate-100" />
      </div>
    </div>
  );

  const bmi = getBMI();
  const interp = bmi ? getBMIInterp(bmi) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      {/* Toast */}
      {successMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl animate-in slide-in-from-top-4">
          ✓ {successMessage}
        </div>
      )}
      {intakeSaved && (
        <div className="fixed top-24 right-8 z-50 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl animate-in slide-in-from-right-4">
          ✓ Intake saved
        </div>
      )}

      {/* Hidden file input for avatar */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      {/* ── Intake Progress Popup (patients only, not submitted) ── */}
      {showIntakePopup && !intakeLoading && (user.role || '').toLowerCase() === 'patient' && (
        <div className="relative bg-gradient-to-br from-[#3b5bfd] to-[#4c6ef5] rounded-[32px] p-6 text-white shadow-2xl shadow-blue-500/20 animate-in slide-in-from-top-4 duration-500">
          <button onClick={() => setShowIntakePopup(false)}
            className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition text-sm">
            ✕
          </button>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative shrink-0">
              <IntakeRing pct={intakeRecord?.progressPercentage ?? 0} size={72} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black">{intakeRecord?.progressPercentage ?? 0}%</span>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-black">
                {intakeRecord?.status === 'skipped' ? 'Complete Your Health Profile' :
                  intakeRecord?.status === 'draft' ? 'Resume Your Intake Form' :
                    'Start Your Intake Form'}
              </h3>
              <p className="text-blue-200 text-sm mt-1 mb-4">
                {intakeRecord?.status === 'draft'
                  ? 'You have a saved draft. Edit the Intake Details section below to finish.'
                  : 'Your health intake is incomplete. Fill it in to get personalised care.'}
              </p>
              <button
                onClick={() => { setIsEditingIntake(true); setShowIntakePopup(false); document.getElementById('intake-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="px-5 py-2.5 bg-white text-[#3b5bfd] rounded-2xl font-black text-sm hover:bg-blue-50 transition shadow-lg">
                {intakeRecord?.status === 'draft' ? 'Continue Intake →' : 'Fill Intake Details →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Header ── */}
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        {/* Avatar */}
        <div className="relative group flex-shrink-0" onClick={handleAvatarClick}>
          <div className={`w-32 h-32 rounded-[40px] overflow-hidden border-4 border-slate-50 shadow-lg transition-transform ${isEditing ? 'group-hover:scale-105 cursor-pointer' : ''}`}>
            <img
              src={avatarSrc}
              alt="Profile Avatar"
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`; }}
            />
          </div>
          {isEditing && (
            <div className="absolute inset-0 rounded-[40px] bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-black uppercase tracking-widest text-center px-2">Change Photo</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={!isEditing}
            className={`absolute -bottom-2 -right-2 w-10 h-10 bg-[#3b5bfd] text-white rounded-xl border-4 border-white flex items-center justify-center shadow-lg transition-opacity ${isEditing ? 'opacity-100' : 'opacity-40'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
            {formData.firstName} {formData.lastName}
          </h1>
          {user.cayrId && (
            <p className="text-xs font-black text-slate-400 mt-2 mb-1">
              # {user.cayrId}
            </p>
          )}
          <p className="text-sm font-black text-[#3b5bfd] uppercase tracking-[0.2em] mt-3">
            {isDoctor ? `Specialist Physician${(formData as any).specialty ? ' · ' + (formData as any).specialty : ''}` : 'Verified Patient Account'}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-5">
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="text-xs font-bold text-slate-500">{user.email}</span>
            </div>
            {formData.phone && (
              <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="text-xs font-bold text-slate-500">{formData.phone}</span>
              </div>
            )}
            {selectedCountry && (
              <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="text-xs font-bold text-slate-500">{[formData.addressDetails?.city, selectedCountry].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 md:self-start">
          {isEditing && (
            <button onClick={handleCancel} disabled={isSaving} className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50">
              Cancel
            </button>
          )}
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all flex items-center gap-2 disabled:opacity-60 ${isEditing ? 'bg-green-500 text-white shadow-green-100 hover:bg-green-600' : 'bg-[#1a1d1f] text-white hover:bg-slate-700'}`}
          >
            {isSaving ? (
              <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
            ) : isEditing ? '✓ Save Profile' : 'Edit Profile'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Main Form ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Personal Information */}
          <section className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1.5 h-6 bg-[#3b5bfd] rounded-full" />
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Personal Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="First Name">
                <input disabled={!isEditing} name="firstName" value={formData.firstName || ''} onChange={handleInputChange} className={inputCls(isEditing)} />
              </Field>
              <Field label="Last Name">
                <input disabled={!isEditing} name="lastName" value={formData.lastName || ''} onChange={handleInputChange} className={inputCls(isEditing)} />
              </Field>
              <Field label="Phone">
                <input disabled={!isEditing} name="phone" value={formData.phone || ''} onChange={handleInputChange} placeholder="+91 98765 43210" className={inputCls(isEditing)} />
              </Field>
              <Field label="Date of Birth">
                <input disabled={!isEditing} type="date" name="dob" value={formData.dob || ''} onChange={handleInputChange} className={inputCls(isEditing)} />
              </Field>
              <Field label="Gender">
                <select disabled={!isEditing} name="gender" value={formData.gender || 'Male'} onChange={handleInputChange} className={inputCls(isEditing)}>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </Field>
              <Field label="Email">
                <input disabled name="email" value={formData.email || ''} className={inputCls(false) + ' opacity-50'} />
              </Field>
            </div>

            {/* Address */}
            <div className="mt-10 space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 border-b border-slate-50 pb-4">Address Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Field label="Street Address">
                    <input disabled={!isEditing} name="addressDetails.street" value={formData.addressDetails?.street || ''} onChange={handleInputChange} className={inputCls(isEditing)} />
                  </Field>
                </div>

                {/* Country dropdown */}
                <Field label="Country">
                  <select
                    disabled={!isEditing}
                    name="addressDetails.country"
                    value={selectedCountry}
                    onChange={handleInputChange}
                    className={inputCls(isEditing)}
                  >
                    <option value="">— Select Country —</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>

                {/* State dropdown (or text if no list) */}
                <Field label="State / Province">
                  {availableStates.length > 0 ? (
                    <select
                      disabled={!isEditing}
                      name="addressDetails.state"
                      value={formData.addressDetails?.state || ''}
                      onChange={handleInputChange}
                      className={inputCls(isEditing)}
                    >
                      <option value="">— Select State —</option>
                      {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input
                      disabled={!isEditing}
                      name="addressDetails.state"
                      value={formData.addressDetails?.state || ''}
                      onChange={handleInputChange}
                      placeholder="State / Province"
                      className={inputCls(isEditing)}
                    />
                  )}
                </Field>

                <Field label="City">
                  <input disabled={!isEditing} name="addressDetails.city" value={formData.addressDetails?.city || ''} onChange={handleInputChange} className={inputCls(isEditing)} />
                </Field>

                {/* Postal code with lookup */}
                <Field label="Postal / PIN Code">
                  <div className="relative">
                    <input
                      disabled={!isEditing}
                      name="addressDetails.zip"
                      value={formData.addressDetails?.zip || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 400001"
                      className={inputCls(isEditing) + ' pr-10'}
                    />
                    {isFetchingPin && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <svg className="w-4 h-4 text-[#3b5bfd] animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {pinError && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{pinError}</p>}
                </Field>
              </div>
            </div>
          </section>

          {/* Doctor-specific professional info */}
          {isDoctor && (
            <section className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Professional Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="License Number">
                  <input disabled={!isEditing} name="licenseNumber" value={(formData as any).licenseNumber || ''} onChange={handleInputChange} className={inputCls(isEditing)} />
                </Field>
                <Field label="Specialization">
                  <input disabled={!isEditing} name="specialty" value={(formData as any).specialty || ''} onChange={handleInputChange} className={inputCls(isEditing)} />
                </Field>
                <Field label="Experience (Years)">
                  <input disabled={!isEditing} type="number" name="experienceYears" value={(formData as any).experienceYears || ''} onChange={handleInputChange} className={inputCls(isEditing)} />
                </Field>
                <Field label="Consultation Fee ($)">
                  <input disabled={!isEditing} type="number" name="consultationFee" value={(formData as any).consultationFee || ''} onChange={handleInputChange} className={inputCls(isEditing)} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Clinic / Hospital Name">
                    <input disabled={!isEditing} name="clinicName" value={(formData as any).clinicName || ''} onChange={handleInputChange} className={inputCls(isEditing)} />
                  </Field>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-3">Available Days</p>
                  <div className="flex flex-wrap gap-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <button key={day} type="button" onClick={() => toggleDay(day)} disabled={!isEditing}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-60 disabled:cursor-not-allowed ${((formData as any).availableDays || []).includes(day)
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}>
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-3">Available Time Slots</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
                      '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00',
                      '16:00 - 17:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00',
                    ].map(slot => (
                      <button key={slot} type="button" onClick={() => toggleSlot(slot)} disabled={!isEditing}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${((formData as any).availableTimeSlots || []).includes(slot)
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Patient: Clinical Background */}
          {!isDoctor && (
            <>
              <section className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Clinical Background</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Field label="Blood Type">
                    <select disabled={!isEditing} name="bloodType" value={formData.bloodType || 'O+'} onChange={handleInputChange} className={inputCls(isEditing)}>
                      {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Allergies (comma separated)">
                    {isEditing ? (
                      <input
                        name="allergies"
                        defaultValue={formData.allergies?.join(', ')}
                        onBlur={e => handleArrayChange('allergies', e.target.value)}
                        className={inputCls(true)}
                        placeholder="e.g. Penicillin, Pollen"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl min-h-[52px]">
                        {formData.allergies?.length
                          ? formData.allergies.map(a => <span key={a} className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{a}</span>)
                          : <span className="text-xs text-slate-400">None reported</span>}
                      </div>
                    )}
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Pre-existing Conditions">
                      {isEditing ? (
                        <textarea name="conditions" defaultValue={formData.conditions?.join(', ')} onBlur={e => handleArrayChange('conditions', e.target.value)} rows={3} className={inputCls(true)} placeholder="e.g. Diabetes Type 2, Hypertension" />
                      ) : (
                        <p className="p-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-600 min-h-[60px]">
                          {formData.conditions?.join(', ') || 'No chronic conditions listed.'}
                        </p>
                      )}
                    </Field>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Medical History</h2>
                </div>
                <Field label="Comprehensive Clinical History">
                  {isEditing ? (
                    <textarea name="medicalHistory" value={formData.medicalHistory || ''} onChange={handleInputChange} rows={6} className={inputCls(true)} placeholder="Past surgeries, chronic illnesses, family history..." />
                  ) : (
                    <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 min-h-[120px]">
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        {formData.medicalHistory || 'No detailed medical history provided yet.'}
                      </p>
                    </div>
                  )}
                </Field>
              </section>

              {/* ── Intake Details Section ──────────────────────────────── */}
              <section id="intake-section" className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                      <h2 className="text-xl font-black text-slate-800 tracking-tight">Intake Details</h2>
                    </div>
                    <div className="flex items-center gap-3 pl-5">
                      {intakeRecord?.status === 'submitted' &&
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">✓ Submitted</span>}
                      {intakeRecord?.status === 'draft' &&
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full">📋 Draft</span>}
                      {intakeRecord?.status === 'skipped' &&
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full">⏭ Skipped</span>}
                      {!intakeLoading && !intakeRecord &&
                        <span className="px-3 py-1 bg-red-50 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-full">Not Started</span>}
                      {!intakeLoading && intakeRecord && (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-28 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#3b5bfd] rounded-full transition-all duration-700" style={{ width: `${intakeRecord.progressPercentage ?? 0}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-slate-400">{intakeRecord.progressPercentage ?? 0}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => isEditingIntake ? handleSaveIntake() : setIsEditingIntake(true)}
                    disabled={intakeSaving}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${isEditingIntake ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}>
                    {intakeSaving ? 'Saving…' : isEditingIntake ? 'Save Intake' : 'Edit Intake'}
                  </button>
                </div>

                {intakeLoading ? (
                  <div className="py-8 flex items-center justify-center gap-3 text-slate-400">
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
                          { label: 'Height (cm)', val: iHeight, set: setIHeight, hint: '170' },
                          { label: 'Weight (kg)', val: iWeight, set: setIWeight, hint: '65' },
                          { label: 'Heart Rate (bpm)', val: iHR, set: setIHR, hint: '72' },
                        ].map(f => (
                          <div key={f.label} className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{f.label}</label>
                            {isEditingIntake
                              ? <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.hint}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white transition" />
                              : <p className="p-3 bg-slate-50/70 rounded-xl font-bold text-slate-700">{f.val || '—'}</p>
                            }
                          </div>
                        ))}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Blood Pressure</label>
                          {isEditingIntake
                            ? <input type="text" value={iBP} onChange={e => setIBP(e.target.value)} placeholder="120/80"
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white transition" />
                            : <p className="p-3 bg-slate-50/70 rounded-xl font-bold text-slate-700">{iBP || '—'}</p>
                          }
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Blood Type</label>
                          {isEditingIntake
                            ? <select value={iBloodType} onChange={e => setIBloodType(e.target.value)}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white transition">
                              <option value="">Select…</option>
                              {BLOOD_TYPE_OPTS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            : <p className="p-3 bg-slate-50/70 rounded-xl font-bold text-slate-700">{iBloodType || '—'}</p>
                          }
                        </div>
                      </div>
                    </div>

                    {/* Medical background */}
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Medical Background</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allergies</label>
                          {isEditingIntake
                            ? <TagInput values={iAllergies} suggestions={INTAKE_ALLERGIES} onChange={setIAllergies} placeholder="e.g. Penicillin…" />
                            : <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/70 rounded-xl min-h-[44px]">
                              {iAllergies.length > 0 ? iAllergies.map(a => <span key={a} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold">{a}</span>) : <span className="text-slate-400 text-sm">None</span>}
                            </div>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pre-existing Conditions</label>
                          {isEditingIntake
                            ? <TagInput values={iConditions} suggestions={INTAKE_CONDITIONS} onChange={setIConditions} placeholder="e.g. Diabetes…" />
                            : <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/70 rounded-xl min-h-[44px]">
                              {iConditions.length > 0 ? iConditions.map(c => <span key={c} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">{c}</span>) : <span className="text-slate-400 text-sm">None</span>}
                            </div>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Medications</label>
                          {isEditingIntake
                            ? <TagInput values={iMeds} suggestions={[]} onChange={setIMeds} placeholder="e.g. Metformin 500mg…" />
                            : <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/70 rounded-xl min-h-[44px]">
                              {iMeds.length > 0 ? iMeds.map(m => <span key={m} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{m}</span>) : <span className="text-slate-400 text-sm">None</span>}
                            </div>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medical History</label>
                          {isEditingIntake
                            ? <textarea value={iHistory} onChange={e => setIHistory(e.target.value)} rows={3}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:bg-white transition resize-none" placeholder="Previous surgeries…" />
                            : <p className="p-3 bg-slate-50/70 rounded-xl font-bold text-slate-600 text-sm min-h-[44px] leading-relaxed">{iHistory || '—'}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Symptoms */}
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Current Symptoms</p>
                      {isEditingIntake
                        ? <textarea value={iSymptoms} onChange={e => setISymptoms(e.target.value)} rows={2}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:bg-white transition resize-none" placeholder="Describe symptoms…" />
                        : <p className="p-3 bg-slate-50/70 rounded-xl font-bold text-slate-600 text-sm leading-relaxed">{iSymptoms || 'No symptoms recorded.'}</p>}
                    </div>

                    {/* Prompt to edit if not yet submitted */}
                    {!isEditingIntake && intakeRecord?.status !== 'submitted' && (
                      <div className="flex justify-end">
                        <button onClick={() => setIsEditingIntake(true)}
                          className="px-6 py-3 bg-[#3b5bfd] text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition">
                          ✏️ Edit & Complete Intake
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-8">
          {/* Vital Statistics */}
          <section className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Vital Statistics</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Height (cm)</label>
                  <input disabled={!isEditing} type="number" name="height" value={formData.height || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-slate-800 outline-none focus:bg-white transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Weight (kg)</label>
                  <input disabled={!isEditing} type="number" name="weight" value={formData.weight || ''} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-slate-800 outline-none focus:bg-white transition-all" />
                </div>
              </div>
              {bmi && interp && (
                <div className={`p-5 rounded-3xl ${interp.bg} flex items-center justify-between animate-in zoom-in duration-300`}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">BMI</p>
                    <p className={`text-xs font-black uppercase tracking-widest mt-1 ${interp.color}`}>{interp.label}</p>
                  </div>
                  <p className="text-3xl font-black text-slate-800 tracking-tighter">{bmi}</p>
                </div>
              )}
            </div>
          </section>

          {/* Privacy */}
          <section className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Account Privacy</h3>
            <div className="space-y-5">
              {[
                { label: 'Email Notifications', sub: 'Visit reminders', key: 'notify_email', checked: formData.notifications?.email },
                { label: 'SMS Alerts', sub: 'Urgent updates', key: 'notify_sms', checked: formData.notifications?.sms },
                { label: '2-Factor Auth', sub: 'Enhanced security', key: 'twoFactorEnabled', checked: formData.twoFactorEnabled },
              ].map(item => (
                <label key={item.key} className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-slate-700">{item.label}</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">{item.sub}</p>
                  </div>
                  <div
                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${item.checked ? 'bg-[#3b5bfd]' : 'bg-slate-200'}`}
                    onClick={() => handleInputChange({ target: { name: item.key, type: 'checkbox', checked: !item.checked } } as any)}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${item.checked ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-white rounded-[40px] p-8 border border-rose-50 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-rose-300 mb-6">Danger Zone</h3>
            <div className="space-y-3">
              <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 p-4 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-100 transition-all font-black uppercase tracking-widest text-[10px]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3 3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout Account
              </button>
              <button className="w-full p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all font-black uppercase tracking-widest text-[10px] border border-rose-100">
                Delete My Data
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
