
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface ProfilePageProps {
  user: User;
  onUpdateProfile: (updatedData: Partial<User>) => void;
  onLogout: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpdateProfile, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Local state for the form
  const [formData, setFormData] = useState<Partial<User>>({});

  // Initialize form data from user object
  useEffect(() => {
    setFormData({
      firstName: user.firstName || user.name.split(' ')[0] || '',
      lastName: user.lastName || user.name.split(' ')[1] || '',
      email: user.email,
      phone: user.phone || '',
      dob: user.dob || '',
      gender: user.gender || 'Male',
      addressDetails: user.addressDetails || {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      },
      bloodType: user.bloodType || 'O+',
      allergies: user.allergies || [],
      conditions: user.conditions || [],
      currentMedications: user.currentMedications || [],
      medicalHistory: user.medicalHistory || '',
      height: user.height || 0,
      weight: user.weight || 0,
      notifications: user.notifications || { email: true, sms: false },
      twoFactorEnabled: user.twoFactorEnabled || false
    });
    
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof User] as any),
          [child]: value
        }
      }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name.startsWith('notify_')) {
        const key = name.replace('notify_', '') as 'email' | 'sms';
        setFormData(prev => ({
          ...prev,
          notifications: {
            ...prev.notifications!,
            [key]: checked
          }
        }));
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
    const items = value.split(',').map(item => item.trim()).filter(item => item !== '');
    setFormData(prev => ({ ...prev, [name]: items }));
  };

  const handleSave = () => {
    // Basic validation
    if (!formData.email?.includes('@')) {
      alert("Please enter a valid email address.");
      return;
    }

    // Merge first and last name for the display name if needed
    const updatedUser = {
      ...formData,
      name: `${formData.firstName} ${formData.lastName}`.trim()
    };

    onUpdateProfile(updatedUser);
    setIsEditing(false);
    setSuccessMessage("Profile updated successfully!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const getBMI = () => {
    const w = formData.weight || 0;
    const h = formData.height || 0;
    if (w > 0 && h > 0) {
      const hM = h / 100;
      return parseFloat((w / (hM * hM)).toFixed(1));
    }
    return null;
  };

  const getBMIInterp = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-500', bg: 'bg-amber-50' };
    if (bmi < 25) return { label: 'Normal', color: 'text-green-500', bg: 'bg-green-50' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-500', bg: 'bg-orange-50' };
    return { label: 'Obese', color: 'text-rose-500', bg: 'bg-rose-50' };
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
        <div className="h-32 bg-white rounded-[40px] border border-slate-100"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-64 bg-white rounded-[40px] border border-slate-100"></div>
          <div className="h-64 bg-white rounded-[40px] border border-slate-100"></div>
        </div>
      </div>
    );
  }

  const bmi = getBMI();
  const interp = bmi ? getBMIInterp(bmi) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {successMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl animate-in slide-in-from-top-4">
          {successMessage}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-10 relative overflow-hidden">
        <div className="relative group">
          <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-slate-50 shadow-lg transition-transform group-hover:scale-105">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#3b5bfd] text-white rounded-xl border-4 border-white flex items-center justify-center shadow-lg">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>
          </button>
        </div>

        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">{user.name}</h1>
          <p className="text-sm font-black text-[#3b5bfd] uppercase tracking-[0.2em] mt-3">
            {user.role === UserRole.DOCTOR ? 'Specialist Physician' : 'Verified Patient Account'}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center space-x-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="text-xs font-bold text-slate-500">{user.email}</span>
            </div>
            {user.phone && (
              <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center space-x-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="text-xs font-bold text-slate-500">{user.phone}</span>
              </div>
            )}
          </div>
        </div>

        <div className="md:self-start">
           <button 
             onClick={() => isEditing ? handleSave() : setIsEditing(true)}
             className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all ${isEditing ? 'bg-green-500 text-white shadow-green-100 hover:bg-green-600' : 'bg-[#1a1d1f] text-white hover:bg-slate-800'}`}
           >
             {isEditing ? 'Save Profile' : 'Edit Profile'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Personal Information */}
          <section className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-4 mb-10">
              <div className="w-1.5 h-6 bg-[#3b5bfd] rounded-full"></div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Personal Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</label>
                <input 
                  disabled={!isEditing} 
                  name="firstName" 
                  value={formData.firstName} 
                  onChange={handleInputChange} 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#3b5bfd] focus:bg-white transition-all disabled:opacity-70" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
                <input 
                  disabled={!isEditing} 
                  name="lastName" 
                  value={formData.lastName} 
                  onChange={handleInputChange} 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#3b5bfd] focus:bg-white transition-all disabled:opacity-70" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date of Birth</label>
                <input 
                  disabled={!isEditing} 
                  type="date" 
                  name="dob" 
                  value={formData.dob} 
                  onChange={handleInputChange} 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#3b5bfd] focus:bg-white transition-all disabled:opacity-70" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Gender</label>
                <select 
                  disabled={!isEditing} 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleInputChange} 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#3b5bfd] focus:bg-white transition-all disabled:opacity-70"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="mt-10 space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 border-b border-slate-50 pb-4">Address Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Street Address</label>
                  <input 
                    disabled={!isEditing} 
                    name="addressDetails.street" 
                    value={formData.addressDetails?.street} 
                    onChange={handleInputChange} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#3b5bfd] focus:bg-white transition-all disabled:opacity-70" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">City</label>
                  <input 
                    disabled={!isEditing} 
                    name="addressDetails.city" 
                    value={formData.addressDetails?.city} 
                    onChange={handleInputChange} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#3b5bfd] focus:bg-white transition-all disabled:opacity-70" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">State / Province</label>
                  <input 
                    disabled={!isEditing} 
                    name="addressDetails.state" 
                    value={formData.addressDetails?.state} 
                    onChange={handleInputChange} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#3b5bfd] focus:bg-white transition-all disabled:opacity-70" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Postal Code</label>
                  <input 
                    disabled={!isEditing} 
                    name="addressDetails.zip" 
                    value={formData.addressDetails?.zip} 
                    onChange={handleInputChange} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#3b5bfd] focus:bg-white transition-all disabled:opacity-70" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Country</label>
                  <input 
                    disabled={!isEditing} 
                    name="addressDetails.country" 
                    value={formData.addressDetails?.country} 
                    onChange={handleInputChange} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#3b5bfd] focus:bg-white transition-all disabled:opacity-70" 
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Medical Information (Patients only) */}
          {user.role === UserRole.PATIENT && (
            <>
              <section className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
                <div className="flex items-center space-x-4 mb-10">
                  <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Clinical Background</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Blood Type</label>
                    <select 
                      disabled={!isEditing} 
                      name="bloodType" 
                      value={formData.bloodType} 
                      onChange={handleInputChange} 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-rose-500 focus:bg-white transition-all disabled:opacity-70"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Allergies (comma separated)</label>
                    {isEditing ? (
                      <input 
                        name="allergies" 
                        defaultValue={formData.allergies?.join(', ')} 
                        onBlur={(e) => handleArrayChange('allergies', e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-rose-500 focus:bg-white transition-all" 
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl">
                        {formData.allergies?.length ? formData.allergies.map(a => (
                          <span key={a} className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-200">{a}</span>
                        )) : <span className="text-xs text-slate-400">None reported</span>}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pre-existing Conditions</label>
                    {isEditing ? (
                      <textarea 
                        name="conditions" 
                        defaultValue={formData.conditions?.join(', ')} 
                        onBlur={(e) => handleArrayChange('conditions', e.target.value)}
                        rows={3}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-rose-500 focus:bg-white transition-all" 
                      />
                    ) : (
                      <p className="p-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-600 min-h-[60px]">
                        {formData.conditions?.join(', ') || 'No chronic conditions listed.'}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* NEW SECTION: Medical History */}
              <section className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
                <div className="flex items-center space-x-4 mb-10">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Medical History</h2>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Comprehensive Clinical History</p>
                  {isEditing ? (
                    <textarea 
                      name="medicalHistory" 
                      value={formData.medicalHistory} 
                      onChange={handleInputChange}
                      rows={6}
                      className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white leading-relaxed transition-all"
                      placeholder="Please provide details about past surgeries, chronic illnesses, family history, etc."
                    />
                  ) : (
                    <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 min-h-[140px]">
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        {formData.medicalHistory || "No detailed medical history provided yet. Update your profile to help your doctor provide better care."}
                      </p>
                    </div>
                  )}
                  {isEditing && (
                    <div className="pt-4 flex justify-end">
                       <button onClick={handleSave} className="px-6 py-3 bg-[#3b5bfd] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all">Save History</button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Sidebar Settings Area */}
        <div className="space-y-8">
          {/* Health Metrics (BMI) */}
          <section className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Vital Statistics</h3>
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Height (cm)</label>
                    <input 
                      disabled={!isEditing} 
                      type="number" 
                      name="height" 
                      value={formData.height} 
                      onChange={handleInputChange}
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-slate-800 focus:bg-white transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Weight (kg)</label>
                    <input 
                      disabled={!isEditing} 
                      type="number" 
                      name="weight" 
                      value={formData.weight} 
                      onChange={handleInputChange}
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-slate-800 focus:bg-white transition-all" 
                    />
                  </div>
                </div>

                {bmi && interp && (
                  <div className={`p-6 rounded-3xl ${interp.bg} border border-slate-100 flex items-center justify-between animate-in zoom-in duration-300`}>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Computed BMI</p>
                      <p className={`text-xs font-black uppercase tracking-widest mt-1 ${interp.color}`}>{interp.label}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-3xl font-black text-slate-800 tracking-tighter">{bmi}</p>
                    </div>
                  </div>
                )}
             </div>
          </section>

          {/* Account Settings */}
          <section className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Account Privacy</h3>
             <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer group">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-700">Change Password</span>
                  </div>
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-[#3b5bfd]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                </div>

                <div className="space-y-4 pt-4">
                   <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">Email Notifications</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Visit reminders</span>
                      </div>
                      <input 
                        type="checkbox" 
                        name="notify_email" 
                        checked={formData.notifications?.email} 
                        onChange={handleInputChange} 
                        className="w-5 h-5 accent-[#3b5bfd]" 
                      />
                   </div>
                   <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">SMS Alerts</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Urgent updates</span>
                      </div>
                      <input 
                        type="checkbox" 
                        name="notify_sms" 
                        checked={formData.notifications?.sms} 
                        onChange={handleInputChange} 
                        className="w-5 h-5 accent-[#3b5bfd]" 
                      />
                   </div>
                   <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">2-Factor Auth</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Enhanced security</span>
                      </div>
                      <input 
                        type="checkbox" 
                        name="twoFactorEnabled" 
                        checked={formData.twoFactorEnabled} 
                        onChange={handleInputChange} 
                        className="w-5 h-5 accent-green-500" 
                      />
                   </div>
                </div>
             </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-white rounded-[40px] p-8 border border-rose-50 shadow-sm">
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-rose-300 mb-8">Danger Zone</h3>
             <div className="space-y-4">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center justify-center space-x-3 p-4 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-100 transition-all font-black uppercase tracking-widest text-[10px]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3 3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                  <span>Logout Account</span>
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
