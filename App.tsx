import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import AdminDashboard from './components/AdminDashboard';
import AmbulanceDashboard from './components/AmbulanceDashboard';
import VideoCall from './components/VideoCall';
import ProfilePage from './components/ProfilePage';
import NotificationCenter from './components/NotificationCenter';
import PatientsList from './components/PatientsList';
import TransactionHistory from './components/TransactionHistory';
import PatientDetailModal from './components/PatientDetailModal';
import PatientRegisterForm from './components/PatientRegisterForm';
import DoctorRegisterForm from './components/DoctorRegisterForm';
import PatientIntakeForm from './components/PatientIntakeForm';
import ChatSessionContainer from './components/ChatSessionContainer';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import {
  User, UserRole, Appointment, AppointmentStatus,
  PatientRecord, MedicalReport, Prescription, Payment,
  PaymentStatus, Notification, NotificationType
} from './types';
import { MOCK_DOCTORS } from './constants';

// ─── Auth Page (Landing + Role Select + Login/Register) ───────────────────────
type AuthFlowStep = 'landing' | 'role_select' | 'auth' | 'patient_register' | 'doctor_register';

const AuthPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [flowStep, setFlowStep] = useState<AuthFlowStep>('landing');
  const [loginMode, setLoginMode] = useState<UserRole>(UserRole.PATIENT);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: loginMode.toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }
      login(data.user);
      const r = (data.user.role || '').toLowerCase();
      if (r === 'doctor') navigate('/doctor-dashboard');
      else if (r === 'admin') navigate('/admin-dashboard');
      else {
        // Patients: only intakeStatus from IntakeRecord drives routing
        // 'submitted' or 'skipped' → dashboard; anything else (draft, null) → intake
        const iStatus = data.user.intakeStatus;
        const goToDashboard = iStatus === 'submitted' || iStatus === 'skipped';
        navigate(goToDashboard ? '/patient-dashboard' : '/patient-intake');
      }
    } catch (err: any) {
      setAuthError('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen login-bg flex flex-col items-center justify-center p-6">

      {/* ── Landing ── */}
      {flowStep === 'landing' && (
        <div className="max-w-4xl w-full text-center space-y-12 animate-in fade-in zoom-in duration-700">
          <div className="space-y-6">
            <div className="w-24 h-24 bg-slate-900 rounded-[32px] mx-auto flex items-center justify-center text-white text-4xl font-black shadow-2xl">C</div>
            <h1 className="text-7xl font-black text-slate-900 tracking-tighter leading-none">The Future of <span className="text-blue-600">Clinical Care</span>.</h1>
            <p className="text-xl text-slate-500 font-medium max-w-xl mx-auto leading-relaxed">Unified healthcare management with AI triage, real-time multilingual interpreting, and high-fidelity telemedicine.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button onClick={() => setFlowStep('role_select')} className="w-full sm:w-72 py-6 bg-slate-900 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all">Enter Platform</button>
          </div>
        </div>
      )}

      {/* ── Role Select ── */}
      {flowStep === 'role_select' && (
        <div className="max-w-2xl w-full space-y-10 animate-in slide-in-from-bottom-8 duration-500">
          <div className="text-center">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Choose Portal</h2>
            <p className="text-slate-400 mt-3 font-black uppercase tracking-widest text-[9px]">Select your role to continue</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <button onClick={() => { setLoginMode(UserRole.PATIENT); setFlowStep('auth'); }} className="p-12 bg-white rounded-[56px] border-4 border-transparent hover:border-blue-600 hover:shadow-2xl transition-all group text-left">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center text-3xl mb-10 group-hover:scale-110 transition-transform">👤</div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Patient</h3>
              <p className="text-sm text-slate-500 mt-4 leading-relaxed font-medium">Access clinical history and book specialists.</p>
            </button>
            <button onClick={() => { setLoginMode(UserRole.DOCTOR); setFlowStep('auth'); }} className="p-12 bg-white rounded-[56px] border-4 border-transparent hover:border-indigo-600 hover:shadow-2xl transition-all group text-left">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center text-3xl mb-10 group-hover:scale-110 transition-transform">🩺</div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Physician</h3>
              <p className="text-sm text-slate-500 mt-4 leading-relaxed font-medium">Manage practice and host clinics.</p>
            </button>
          </div>
          <button onClick={() => setFlowStep('landing')} className="w-full text-center text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] hover:text-blue-600 transition-colors mt-10">← Back</button>
        </div>
      )}

      {/* ── Login (both roles share this form) ── */}
      {flowStep === 'auth' && (
        <div className="max-w-md w-full animate-in zoom-in-95 duration-500">
          <div className="bg-white rounded-[40px] shadow-2xl p-10 space-y-8">
            {/* Icon + Title */}
            <div className="text-center">
              <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-5 ${loginMode === UserRole.DOCTOR ? 'bg-indigo-50' : 'bg-blue-50'
                }`}>
                {loginMode === UserRole.DOCTOR ? '🩺' : '👤'}
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
                {loginMode === UserRole.DOCTOR ? 'Physician Login' : 'Patient Login'}
              </h2>
              <p className="text-slate-400 text-xs mt-2 font-semibold uppercase tracking-widest">
                {loginMode === UserRole.DOCTOR ? 'Doctor portal only' : 'Patient portal only'}
              </p>
            </div>

            {/* Error */}
            {authError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-semibold">
                <span>⚠️</span>{authError}
              </div>
            )}

            {/* Login form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Email</label>
                <input
                  type="email" required autoComplete="email"
                  placeholder="your@email.com"
                  value={email} onChange={e => { setEmail(e.target.value); setAuthError(''); }}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition text-slate-800 text-sm font-semibold placeholder:text-slate-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Password</label>
                <input
                  type="password" required autoComplete="current-password"
                  placeholder="Password"
                  value={password} onChange={e => { setPassword(e.target.value); setAuthError(''); }}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition text-slate-800 text-sm font-semibold placeholder:text-slate-300"
                />
              </div>
              <button type="submit"
                className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest text-white shadow-lg transition-all ${loginMode === UserRole.DOCTOR
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-blue-600 hover:bg-blue-700'
                  }`}>
                Login
              </button>
            </form>

            {/* Patient: show Register link. Doctor: also gets a Register link */}
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => setFlowStep('role_select')} className="text-xs text-slate-400 font-bold uppercase tracking-widest hover:text-slate-700 transition">← Switch</button>
              {loginMode === UserRole.PATIENT && (
                <button
                  onClick={() => { setAuthError(''); setFlowStep('patient_register'); }}
                  className="text-xs text-blue-600 font-bold hover:text-blue-800 transition"
                >
                  New patient? Register →
                </button>
              )}
              {loginMode === UserRole.DOCTOR && (
                <button
                  onClick={() => { setAuthError(''); setFlowStep('doctor_register'); }}
                  className="text-xs text-indigo-600 font-bold hover:text-indigo-800 transition"
                >
                  New doctor? Register →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Patient Registration (dedicated form) ── */}
      {flowStep === 'patient_register' && (
        <div className="fixed inset-0 login-bg overflow-y-auto flex flex-col items-center justify-start py-10 px-4" style={{ zIndex: 50 }}>
          <PatientRegisterForm
            onBack={() => setFlowStep('auth')}
            onSwitchToLogin={() => setFlowStep('auth')}
          />
        </div>
      )}
      {/* ── Doctor Registration (dedicated form) ── */}
      {flowStep === 'doctor_register' && (
        <div className="fixed inset-0 login-bg overflow-y-auto flex flex-col items-center justify-start py-10 px-4" style={{ zIndex: 50 }}>
          <DoctorRegisterForm
            onBack={() => setFlowStep('auth')}
            onSwitchToLogin={() => setFlowStep('auth')}
          />
        </div>
      )}
    </div>
  );
};

// ─── Protected Route ──────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f4f7fe]"><div className="w-12 h-12 border-4 border-[#3b5bfd] border-t-transparent rounded-full animate-spin" /></div>;

  if (!user) return <Navigate to="/" state={{ from: location }} replace />;

  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes((user.role || '').toLowerCase())) {
    const r = (user.role || '').toLowerCase();
    if (r === 'doctor') return <Navigate to="/doctor-dashboard" replace />;
    if (r === 'admin') return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to="/patient-dashboard" replace />;
  }

  return <>{children}</>;
};

// ─── App Content (main router) ────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const { user, isLoading, login, logout } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 'n1', type: NotificationType.APPOINTMENT, title: 'Visit Sync Complete', message: 'Your session is confirmed.', timestamp: new Date().toISOString(), isRead: false },
    { id: 'n2', type: NotificationType.PRESCRIPTION, title: 'Clinical Summary Ready', message: 'Your SOAP note has been generated.', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false },
  ]);
  const [activeCall, setActiveCall] = useState<{ partnerName: string; partnerRole: string } | null>(null);
  const [activeChatAppointmentId, setActiveChatAppointmentId] = useState<string | null>(null);
  const [selectedDetailedPatient, setSelectedDetailedPatient] = useState<PatientRecord | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [currentModule, setCurrentModule] = useState('Overview');
  const [isDrawerMode, setIsDrawerMode] = useState(false);
  const location = useLocation();

  const handleModuleChange = (module: string) => {
    if (module === 'Notifications') {
      navigate('/notifications');
      return;
    }
    if (module === 'Profile') {
      navigate('/profile');
      return;
    }
    // If currently on a non-dashboard page, navigate back to the role dashboard
    const role = (user?.role || '').toLowerCase();
    const dashboardRoute =
      role === 'doctor' ? '/doctor-dashboard' :
        role === 'admin' ? '/admin-dashboard' :
          '/patient-dashboard';

    if (location.pathname !== dashboardRoute) {
      navigate(dashboardRoute);
    }
    setCurrentModule(module);
  };

  // Seed mock payments
  useEffect(() => {
    const mockList: Payment[] = Array.from({ length: 10 }).map((_, i) => ({
      id: `PAY-${1000 + i}`,
      patientId: user?.id || `p${i}`,
      patientName: user?.name || 'Patient',
      doctorId: MOCK_DOCTORS[i % MOCK_DOCTORS.length].id,
      doctorName: MOCK_DOCTORS[i % MOCK_DOCTORS.length].name,
      amount: 150 + i * 10,
      date: new Date().toISOString().split('T')[0],
      status: PaymentStatus.COMPLETED,
      service: 'Diagnostic Review'
    }));
    setPayments(mockList);
  }, [user?.id]);

  // Fetch data based on role
  useEffect(() => {
    if (!user) return;
    fetchAppointments();
    fetchMedicalReports();
    const r = (user.role || '').toLowerCase();
    if (r === 'doctor' || r === 'admin') fetchPatients();
    if (r === 'admin') fetchDoctors();
  }, [user]);

  const fetchAppointments = async () => {
    if (!user) return;
    try {
      const endpoint = (user.role || '').toLowerCase() === 'patient' ? '/api/appointments/patient' : '/api/appointments/doctor';
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.map((a: any) => ({ ...a, id: a._id })));
      }
    } catch (err) { console.error('Appointments fetch failed', err); }
  };

  const fetchMedicalReports = async () => {
    if (!user) return;
    try {
      const endpoint = (user.role || '').toLowerCase() === 'patient' ? '/api/reports/patient' : '/api/reports/doctor';
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setMedicalReports(data.map((r: any) => ({ ...r, id: r._id })));
      }
    } catch (err) { console.error('Reports fetch failed', err); }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/users?role=patient');
      if (res.ok) {
        const data = await res.json();
        setPatients(data.map((p: any) => ({ ...p, id: p._id })));
      }
    } catch (err) { console.error('Patients fetch failed', err); }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/users?role=doctor');
      if (res.ok) {
        const data = await res.json();
        setDoctors(data.map((d: any) => ({ ...d, id: d._id })));
      }
    } catch (err) { console.error('Doctors fetch failed', err); }
  };

  const handleBookAppointment = async (doctorId: string, doctorName: string, date: string, time: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, doctorName, date, time }),
      });
      if (res.ok) await fetchAppointments();
    } catch (err) { console.error('Book appointment failed', err); }
  };

  const handleUpdateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    try {
      let endpoint = '';
      if (status === AppointmentStatus.CONFIRMED) endpoint = `/api/appointments/${id}/confirm`;
      else if (status === AppointmentStatus.COMPLETED) endpoint = `/api/appointments/${id}/complete`;
      else if (status === AppointmentStatus.CANCELLED) endpoint = `/api/appointments/${id}/cancel`;
      else return;
      const res = await fetch(endpoint, { method: 'PATCH' });
      if (res.ok) await fetchAppointments();
    } catch (err) { console.error('Update appointment failed', err); }
  };

  const handleAddReport = async (report: MedicalReport) => {
    try {
      const { id, ...data } = report;
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) await fetchMedicalReports();
    } catch (err) { console.error('Add report failed', err); }
  };

  const handleUpdatePatient = async (patient: PatientRecord) => {
    try {
      const res = await fetch(`/api/users/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient),
      });
      if (res.ok) {
        const updated = await res.json();
        setPatients(prev => prev.map(p => p.id === updated._id ? { ...updated, id: updated._id } : p));
      }
    } catch (err) { console.error('Update patient failed', err); }
  };

  const handleViewPatientDetail = (p: PatientRecord) => {
    setSelectedDetailedPatient(p);
    setIsModalLoading(true);
    setTimeout(() => setIsModalLoading(false), 800);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f4f7fe]"><div className="w-12 h-12 border-4 border-[#3b5bfd] border-t-transparent rounded-full animate-spin" /></div>;

  // If not logged in, render auth pages WITHOUT layout
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  // ── Intake form: render WITHOUT the sidebar Layout ─────────────────────────
  if (user && (user.role || '').toLowerCase() === 'patient' &&
    location.pathname === '/patient-intake') {
    return (
      <Routes>
        <Route path="/patient-intake" element={
          <PatientIntakeForm
            user={user}
            onComplete={() => { window.location.href = '/patient-dashboard'; }}
            onSkip={() => { window.location.href = '/patient-dashboard'; }}
          />
        } />
        <Route path="*" element={<Navigate to="/patient-intake" replace />} />
      </Routes>
    );
  }

  return (
    <Layout
      user={user}
      onLogout={logout}
      appointments={appointments}
      notifications={notifications}
      currentModule={currentModule}
      onModuleChange={handleModuleChange}
      isDrawerMode={isDrawerMode}
      onToggleDrawerMode={() => setIsDrawerMode(!isDrawerMode)}
    >
      <Routes>
        {/* Smart root redirect */}
        <Route path="/" element={
          (() => {
            const r = (user.role || '').toLowerCase();
            if (r === 'doctor') return <Navigate to="/doctor-dashboard" replace />;
            if (r === 'admin') return <Navigate to="/admin-dashboard" replace />;
            // Patients: only intakeStatus from IntakeRecord drives routing
            const iStatus = (user as any).intakeStatus;
            const goToDashboard = iStatus === 'submitted' || iStatus === 'skipped';
            return <Navigate to={goToDashboard ? '/patient-dashboard' : '/patient-intake'} replace />;
          })()
        } />

        {/* Patient */}
        <Route path="/patient-dashboard" element={
          <ProtectedRoute allowedRoles={[UserRole.PATIENT]}>
            <PatientDashboard
              user={user} appointments={appointments} medicalReports={medicalReports}
              prescriptions={prescriptions} payments={payments}
              onBook={handleBookAppointment} onAddReport={handleAddReport}
              onOpenChat={setActiveChatAppointmentId}
              onUploadPrescription={presc => setPrescriptions(prev => [presc, ...prev])}
              view={(() => {
                const map: Record<string, 'dashboard' | 'analytics' | 'payments' | 'reports' | 'reminders' | 'facilities' | 'booking' | 'pharmacy'> = {
                  'Dashboard': 'dashboard',
                  'Analytics': 'analytics',
                  'Payments': 'payments',
                  'Visits': 'booking',
                  'Facilities': 'facilities',
                  'Clinical Vault': 'reports',
                  'Pharmacy': 'pharmacy',
                };
                return map[currentModule] ?? 'dashboard';
              })()}
              onSubViewChange={setCurrentModule}
            />
          </ProtectedRoute>
        } />

        {/* Doctor */}
        <Route path="/doctor-dashboard" element={
          <ProtectedRoute allowedRoles={[UserRole.DOCTOR]}>
            <DoctorDashboard
              user={user} appointments={appointments} payments={payments}
              updateStatus={handleUpdateAppointmentStatus}
              patients={patients} medicalReports={medicalReports}
              onUpdatePatient={handleUpdatePatient}
              onStartCall={n => setActiveCall({ partnerName: n, partnerRole: 'Patient' })}
              onAddReport={handleAddReport}
              onOpenChat={setActiveChatAppointmentId}
              activeView={currentModule}
              onViewChange={setCurrentModule}
            />
          </ProtectedRoute>
        } />

        {/* Doctor → Patients List */}
        <Route path="/doctor/patients" element={
          <ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.ADMIN]}>
            <PatientsList
              patients={patients} isLoading={false}
              onViewDetails={handleViewPatientDetail}
              onSendMessage={n => console.log('Message', n)}
              onSchedule={n => console.log('Schedule', n)}
            />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
            <AdminDashboard user={user} appointments={appointments} patients={patients} doctors={doctors} />
          </ProtectedRoute>
        } />

        {/* Ambulance */}
        <Route path="/ambulance-dashboard" element={
          <ProtectedRoute allowedRoles={[UserRole.AMBULANCE]}>
            <AmbulanceDashboard user={user} patients={patients} />
          </ProtectedRoute>
        } />

        {/* Shared */}
        <Route path="/notifications" element={
          <ProtectedRoute>
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={id => setNotifications(p => p.map(n => n.id === id ? { ...n, isRead: true } : n))}
              onDelete={id => setNotifications(p => p.filter(n => n.id !== id))}
              onClearAll={() => setNotifications([])}
              onMarkAllAsRead={() => setNotifications(p => p.map(n => ({ ...n, isRead: true })))}
            />
          </ProtectedRoute>
        } />

        <Route path="/payments" element={
          <ProtectedRoute>
            <TransactionHistory user={user} payments={payments} />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage user={user} onUpdateProfile={u => login({ ...user, ...u })} onLogout={logout} />
          </ProtectedRoute>
        } />

        <Route path="*" element={<div className="p-20 text-center text-slate-400 font-black text-2xl">404 — Page not found</div>} />
      </Routes>

      {activeCall && <VideoCall partnerName={activeCall.partnerName} partnerRole={activeCall.partnerRole} onEnd={() => setActiveCall(null)} />}

      {activeChatAppointmentId && (
        <div className="fixed bottom-6 right-6 z-[100] w-full max-w-md animate-in slide-in-from-bottom-10 duration-500">
          <ChatSessionContainer
            appointmentId={activeChatAppointmentId}
            currentUserId={user?.id || ''}
            onClose={() => setActiveChatAppointmentId(null)}
          />
        </div>
      )}

      {selectedDetailedPatient && (
        <PatientDetailModal
          patient={selectedDetailedPatient} isLoading={isModalLoading}
          onClose={() => setSelectedDetailedPatient(null)}
          onStartConsult={n => setActiveCall({ partnerName: n, partnerRole: 'Patient' })}
          onNewEntry={() => { }} onSchedule={() => { }}
        />
      )}
    </Layout>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
