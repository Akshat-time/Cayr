
import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface PatientProfileProps {
  user: User;
  onUpdateProfile: (updatedData: Partial<User>) => void;
}

const PatientProfile: React.FC<PatientProfileProps> = ({ user, onUpdateProfile }) => {
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [showSaveFeedback, setShowSaveFeedback] = useState<string | null>(null);

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

  // Keep form data in sync if user object changes externally
  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      dob: user.dob || '',
      medicalHistory: user.medicalHistory || '',
      height: user.height || 0,
      weight: user.weight || 0,
    });
  }, [user]);

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

    // Show visual feedback
    setShowSaveFeedback(section);
    setTimeout(() => setShowSaveFeedback(null), 3000);
  };

  // BMI Calculation Logic
  const getBMI = () => {
    const w = formData.weight || 0;
    const h = formData.height || 0;
    if (w > 0 && h > 0) {
      const heightInMeters = h / 100;
      const bmi = w / (heightInMeters * heightInMeters);
      return parseFloat(bmi.toFixed(1));
    }
    return null;
  };

  const getBMIInterpretation = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
    if (bmi < 25) return { label: 'Normal Weight', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' };
    return { label: 'Obesity', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' };
  };

  const bmiValue = getBMI();
  const bmiInterp = bmiValue ? getBMIInterpretation(bmiValue) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center space-x-6 mb-10">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white shadow-xl">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-1.5 rounded-xl border-2 border-white shadow-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{user.name}</h2>
          <p className="text-sm font-bold text-blue-500 uppercase tracking-widest mt-1">Patient Profile • {user.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Information */}
        <div className="shadow-card p-8 bg-white border border-slate-100 flex flex-col relative overflow-hidden">
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
            <button 
              onClick={() => isEditingPersonal ? handleSave('personal') : setIsEditingPersonal(true)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditingPersonal ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              {isEditingPersonal ? 'Save Changes' : 'Edit Info'}
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                {isEditingPersonal ? (
                  <input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" 
                    placeholder="Enter full name"
                  />
                ) : (
                  <p className="p-3 font-bold text-slate-700 bg-slate-50/50 rounded-xl">{user.name}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                {isEditingPersonal ? (
                  <input 
                    name="email" 
                    type="email"
                    value={formData.email} 
                    onChange={handleChange} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" 
                    placeholder="Enter email"
                  />
                ) : (
                  <p className="p-3 font-bold text-slate-700 bg-slate-50/50 rounded-xl">{user.email}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone</label>
                  {isEditingPersonal ? (
                    <input 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleChange} 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" 
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="p-3 font-bold text-slate-700 bg-slate-50/50 rounded-xl">{user.phone || 'Not set'}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date of Birth</label>
                  {isEditingPersonal ? (
                    <input 
                      type="date" 
                      name="dob" 
                      value={formData.dob} 
                      onChange={handleChange} 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" 
                    />
                  ) : (
                    <p className="p-3 font-bold text-slate-700 bg-slate-50/50 rounded-xl">{user.dob || 'Not set'}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Home Address</label>
                {isEditingPersonal ? (
                  <input 
                    name="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" 
                    placeholder="Enter full address"
                  />
                ) : (
                  <p className="p-3 font-bold text-slate-700 bg-slate-50/50 rounded-xl">{user.address || 'Not set'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Physical Stats with BMI */}
        <div className="shadow-card p-8 bg-white border border-slate-100 flex flex-col relative overflow-hidden">
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
            <button 
              onClick={() => isEditingStats ? handleSave('stats') : setIsEditingStats(true)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditingStats ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              {isEditingStats ? 'Save Stats' : 'Update Stats'}
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6 h-full">
              <div className="bg-slate-50 rounded-3xl p-6 flex flex-col items-center justify-center text-center group transition-all hover:bg-blue-50 border border-transparent hover:border-blue-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Height</span>
                {isEditingStats ? (
                    <div className="flex items-center">
                      <input 
                        type="number" 
                        name="height" 
                        value={formData.height} 
                        onChange={handleChange} 
                        className="w-20 bg-white p-2 rounded-xl text-center font-black text-xl text-slate-800 border border-slate-200 outline-none focus:border-blue-500" 
                      />
                      <span className="ml-2 font-bold text-slate-500">cm</span>
                    </div>
                ) : (
                  <p className="text-3xl font-black text-slate-800">{user.height || '--'}<span className="text-sm font-bold text-slate-400 ml-1">cm</span></p>
                )}
              </div>
              <div className="bg-slate-50 rounded-3xl p-6 flex flex-col items-center justify-center text-center group transition-all hover:bg-rose-50 border border-transparent hover:border-rose-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Weight</span>
                {isEditingStats ? (
                    <div className="flex items-center">
                      <input 
                        type="number" 
                        name="weight" 
                        value={formData.weight} 
                        onChange={handleChange} 
                        className="w-20 bg-white p-2 rounded-xl text-center font-black text-xl text-slate-800 border border-slate-200 outline-none focus:border-rose-500" 
                      />
                      <span className="ml-2 font-bold text-slate-500">kg</span>
                    </div>
                ) : (
                  <p className="text-3xl font-black text-slate-800">{user.weight || '--'}<span className="text-sm font-bold text-slate-400 ml-1">kg</span></p>
                )}
              </div>
            </div>

            {/* BMI Display */}
            {bmiValue && bmiInterp && (
              <div className={`p-5 rounded-[24px] flex items-center justify-between ${bmiInterp.bg} border ${bmiInterp.border} animate-in fade-in zoom-in duration-300`}>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Body Mass Index (BMI)</span>
                  <div className="flex items-center">
                    <span className={`text-sm font-black uppercase tracking-widest ${bmiInterp.color}`}>{bmiInterp.label}</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-[10px] font-bold text-slate-500">Normal: 18.5-24.9</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-slate-800 tracking-tighter">{bmiValue}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Medical History */}
        <div className="md:col-span-2 shadow-card p-8 bg-white border border-slate-100 relative overflow-hidden">
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
            <button 
              onClick={() => isEditingMedical ? handleSave('medical') : setIsEditingMedical(true)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditingMedical ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-100' : 'bg-[#1a1d1f] text-white hover:bg-slate-800'}`}
            >
              {isEditingMedical ? 'Save Changes' : 'Edit Medical File'}
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Detailed Medical History</label>
              {isEditingMedical ? (
                <textarea 
                  name="medicalHistory" 
                  value={formData.medicalHistory} 
                  onChange={handleChange} 
                  rows={6} 
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:border-rose-500 focus:bg-white leading-relaxed transition-all"
                  placeholder="List previous surgeries, chronic conditions, family medical history, current allergies, or lifestyle habits..."
                />
              ) : (
                <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 min-h-[140px]">
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {user.medicalHistory || "No medical history recorded. Keeping your history updated helps our doctors provide personalized and efficient clinical care."}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3">Core Health Insights</p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm font-bold text-blue-900">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      Regular health checkups required
                    </li>
                    <li className="flex items-center text-sm font-bold text-blue-900">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      Active BMI & Vitals Monitoring
                    </li>
                  </ul>
               </div>
               <div className="p-6 bg-rose-50/50 rounded-3xl border border-rose-100/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-3">Reported Allergies</p>
                  <p className="text-sm font-bold text-rose-900">
                    {user.allergies?.length ? user.allergies.join(', ') : 'None documented in current session.'}
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
