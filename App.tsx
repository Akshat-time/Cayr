
import React, { useState, useEffect } from 'react';
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
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { User, UserRole, Appointment, AppointmentStatus, PatientRecord, MedicalReport, Prescription, Payment, PaymentStatus, Notification, NotificationType, PatientStatus } from './types';
import { INITIAL_APPOINTMENTS, MOCK_DOCTORS } from './constants';

type AuthFlowStep = 'landing' | 'role_select' | 'auth';

const AppContent: React.FC = () => {
  const { user, isLoading, login, logout } = useAuth();
  console.log("DEBUG → isLoading:", isLoading);
  console.log("DEBUG → user:", user);
  // Persist current module and flow step to survive reloads
  const [currentModule, setCurrentModule] = useState(() => sessionStorage.getItem('cayr_active_module') || 'Dashboard');
  const [flowStep, setFlowStep] = useState<AuthFlowStep>(() => (sessionStorage.getItem('cayr_flow_step') as AuthFlowStep) || 'landing');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loginMode, setLoginMode] = useState<UserRole>(UserRole.PATIENT);
  const [activeCall, setActiveCall] = useState<{ partnerName: string, partnerRole: string } | null>(null);
  const [selectedDetailedPatient, setSelectedDetailedPatient] = useState<PatientRecord | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Update session storage when navigation changes
  useEffect(() => {
    sessionStorage.setItem('cayr_active_module', currentModule);
  }, [currentModule]);

  useEffect(() => {
    sessionStorage.setItem('cayr_flow_step', flowStep);
  }, [flowStep]);

  useEffect(() => {
    if (user?.role === UserRole.DOCTOR || user?.role === UserRole.ADMIN) {
      fetchPatients();
    }
    if (user?.role === UserRole.ADMIN) {
      fetchDoctors();
    }
    fetchAppointments();
    fetchMedicalReports();
  }, [user]);

  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/users?role=DOCTOR');
      if (res.ok) {
        const data = await res.json();
        const mappedData = data.map((item: any) => ({
          ...item,
          id: item._id,
        }));
        setDoctors(mappedData);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchMedicalReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        const mappedData = data.map((item: any) => ({
          ...item,
          id: item._id,
        }));
        setMedicalReports(mappedData);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleAddReport = async (report: MedicalReport) => {
    try {
      // Remove id if it's a temp ID or let backend handle it
      const { id, ...reportData } = report;
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });
      if (res.ok) {
        await fetchMedicalReports();
      }
    } catch (error) {
      console.error('Error adding report:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const data = await res.json();
        const mappedData = data.map((item: any) => ({
          ...item,
          id: item._id,
        }));
        setPatients(mappedData);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleUpdatePatient = async (patient: PatientRecord) => {
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient),
      });
      if (res.ok) {
        const updated = await res.json();
        setPatients(prev => prev.map(p => p.id === updated._id ? { ...updated, id: updated._id } : p));
      }
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        // Map _id to id if necessary
        const mappedData = data.map((item: any) => ({
          ...item,
          id: item._id,
        }));
        setAppointments(mappedData);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const handleBookAppointment = async (doctorId: string, doctorName: string, date: string, time: string) => {
    if (!user) return;
    try {
      const newAppointment = {
        patientId: user.id,
        patientName: user.name,
        doctorId,
        doctorName,
        date,
        time,
        status: AppointmentStatus.PENDING,
      };

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppointment),
      });

      if (res.ok) {
        await fetchAppointments();
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
    }
  };

  const handleModuleChange = (module: string) => {
    setCurrentModule(module);
  };

  const handleViewPatientDetail = (p: PatientRecord) => {
    setSelectedDetailedPatient(p);
    setIsModalLoading(true);
    setTimeout(() => setIsModalLoading(false), 800);
  };

  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 'n1', type: NotificationType.APPOINTMENT, title: 'Visit Sync Complete', message: 'Your session with Dr. Sarah Wilson is confirmed.', timestamp: new Date().toISOString(), isRead: false },
    { id: 'n2', type: NotificationType.PRESCRIPTION, title: 'Clinical Summary Ready', message: 'Your pre-consultation SOAP note has been generated.', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false },
  ]);

  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const mockList: Payment[] = Array.from({ length: 10 }).map((_, i) => ({
      id: `PAY-${1000 + i}`,
      patientId: `p${(i % 5) + 1}`,
      patientName: 'John Doe',
      doctorId: MOCK_DOCTORS[i % MOCK_DOCTORS.length].id,
      doctorName: MOCK_DOCTORS[i % MOCK_DOCTORS.length].name,
      amount: 150 + i * 10,
      date: new Date().toISOString().split('T')[0],
      status: PaymentStatus.COMPLETED,
      service: 'Diagnostic Review'
    }));
    setPayments(mockList);
  }, []);

  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const body = isRegistering
        ? { name, email, password, role: loginMode.toLowerCase() }
        : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      if (isRegistering) {
        // Auto login after register or ask to login
        setIsRegistering(false);
        setPassword('');
        alert('Registration successful! Please login.');
      } else {
        login(data.user);
        setCurrentModule(data.user.role === UserRole.PATIENT ? 'Dashboard' : 'Overview');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  const renderModule = () => {
    const isPatient = user?.role === UserRole.PATIENT;
    switch (currentModule) {
      case 'Dashboard':
      case 'Overview':
        if (user?.role === UserRole.ADMIN) {
          return <AdminDashboard user={user} appointments={appointments} patients={patients} doctors={doctors} />;
        }
        if (user?.role === UserRole.AMBULANCE) {
          return <AmbulanceDashboard user={user} patients={patients} />;
        }
        return isPatient ? (
          <PatientDashboard user={user} appointments={appointments} medicalReports={medicalReports} prescriptions={prescriptions} payments={payments} onBook={handleBookAppointment} onAddReport={handleAddReport} onUploadPrescription={presc => setPrescriptions(prev => [presc, ...prev])} view="dashboard" />
        ) : (
          <DoctorDashboard user={user} appointments={appointments} payments={payments} updateStatus={(id, s) => { /* Implement update status API */ }} patients={patients} onUpdatePatient={handleUpdatePatient} onStartCall={n => setActiveCall({ partnerName: n, partnerRole: 'Patient' })} />
        );
      case 'Patients':
        return !isPatient ? <PatientsList patients={patients} isLoading={isTableLoading} onViewDetails={handleViewPatientDetail} onSendMessage={n => console.log('Message to', n)} onSchedule={n => console.log('Schedule', n)} /> : null;
      case 'Analytics':
        return isPatient ? <PatientDashboard user={user} appointments={appointments} medicalReports={medicalReports} prescriptions={prescriptions} payments={payments} onBook={() => { }} onAddReport={() => { }} onUploadPrescription={() => { }} view="analytics" /> : <DoctorDashboard user={user} appointments={appointments} payments={payments} updateStatus={() => { }} patients={patients} onUpdatePatient={() => { }} initialView="Analytics" />;
      case 'Payments':
        return <TransactionHistory user={user!} payments={payments} />;
      case 'Notifications':
        return <NotificationCenter notifications={notifications} onMarkAsRead={id => setNotifications(p => p.map(n => n.id === id ? { ...n, isRead: true } : n))} onDelete={id => setNotifications(p => p.filter(n => n.id !== id))} onClearAll={() => setNotifications([])} onMarkAllAsRead={() => setNotifications(p => p.map(n => ({ ...n, isRead: true })))} />;
      case 'Profile':
        return <ProfilePage user={user!} onUpdateProfile={u => login({ ...user!, ...u })} onLogout={logout} />;
      default:
        return null;
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f4f7fe]"><div className="w-12 h-12 border-4 border-[#3b5bfd] border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user) {
    return (
      <div className="min-h-screen login-bg flex flex-col items-center justify-center p-6">
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

        {flowStep === 'role_select' && (
          <div className="max-w-2xl w-full space-y-10 animate-in slide-in-from-bottom-8 duration-500">
            <div className="text-center">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Choose Portal Identity</h2>
              <p className="text-slate-400 mt-3 font-black uppercase tracking-widest text-[9px]">Biometric session selection</p>
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
                <p className="text-sm text-slate-500 mt-4 leading-relaxed font-medium">Manage practice and host interpret clinics.</p>
              </button>
            </div>
            <button onClick={() => setFlowStep('landing')} className="w-full text-center text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] hover:text-blue-600 transition-colors mt-10">Back to intro</button>
          </div>
        )}

        {flowStep === 'auth' && (
          <div className="max-w-md w-full glass-login p-12 space-y-10 animate-in zoom-in-95 duration-500">
            <div className="text-center">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">Credential Sync</h2>
              <p className="text-sm text-slate-400 font-bold mt-4 uppercase tracking-widest">Login as {loginMode}</p>
            </div>
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              {isRegistering && (
                <input type="text" required placeholder="Full Name" className="w-full px-8 py-5 rounded-3xl auth-input text-slate-800 outline-none text-sm font-black tracking-tight" value={name} onChange={e => setName(e.target.value)} />
              )}
              <input type="email" required placeholder="Clinical Email" className="w-full px-8 py-5 rounded-3xl auth-input text-slate-800 outline-none text-sm font-black tracking-tight" value={email} onChange={e => setEmail(e.target.value)} />
              <input type="password" required placeholder="Security Key" className="w-full px-8 py-5 rounded-3xl auth-input text-slate-800 outline-none text-sm font-black tracking-tight" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all">
                {isRegistering ? 'Create Account' : 'Authorize Session'}
              </button>
              <div className="text-center">
                <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-slate-500 font-bold text-xs hover:text-blue-600">
                  {isRegistering ? 'Already have an account? Login' : 'New user? Register'}
                </button>
              </div>
            </form>
            <button onClick={() => setFlowStep('role_select')} className="w-full text-center text-slate-400 font-black text-[9px] uppercase tracking-widest hover:text-blue-600 transition-colors">Switch Identity</button>
          </div>
        )}

        {!['landing', 'role_select', 'auth'].includes(flowStep) && (
          <div style={{ color: 'red', textAlign: 'center', marginTop: 50 }}>
            NO FLOW STEP MATCHED: {flowStep}  <button onClick={() => setFlowStep('landing')}>Reset</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={logout} currentModule={currentModule} onModuleChange={handleModuleChange} appointments={appointments} notifications={notifications}>
      {renderModule()}
      {activeCall && <VideoCall partnerName={activeCall.partnerName} partnerRole={activeCall.partnerRole} onEnd={() => setActiveCall(null)} />}
      {selectedDetailedPatient && (
        <PatientDetailModal
          patient={selectedDetailedPatient}
          isLoading={isModalLoading}
          onClose={() => setSelectedDetailedPatient(null)}
          onStartConsult={n => setActiveCall({ partnerName: n, partnerRole: 'Patient' })}
          onNewEntry={() => { }}
          onSchedule={() => { }}
        />
      )}
    </Layout>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
