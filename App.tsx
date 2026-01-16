
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import VideoCall from './components/VideoCall';
import ProfilePage from './components/ProfilePage';
import NotificationCenter from './components/NotificationCenter';
import PatientsList from './components/PatientsList';
import TransactionHistory from './components/TransactionHistory';
import PatientDetailModal from './components/PatientDetailModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { User, UserRole, Appointment, AppointmentStatus, PatientRecord, MedicalReport, Prescription, Payment, PaymentStatus, Notification, NotificationType, PatientStatus } from './types';
import { INITIAL_APPOINTMENTS, MOCK_DOCTORS } from './constants';

const AppContent: React.FC = () => {
  const { user, token, isLoading, login, logout } = useAuth();
  const [currentModule, setCurrentModule] = useState('Dashboard');
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [loginMode, setLoginMode] = useState<UserRole>(UserRole.DOCTOR);
  const [authView, setAuthView] = useState<'signin' | 'signup'>('signin');
  const [activeCall, setActiveCall] = useState<{ partnerName: string, partnerRole: string } | null>(null);
  const [selectedDetailedPatient, setSelectedDetailedPatient] = useState<PatientRecord | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Handle module change with simulated loading for the table
  const handleModuleChange = (module: string) => {
    setCurrentModule(module);
    if (module === 'Patients') {
      setIsTableLoading(true);
      setTimeout(() => setIsTableLoading(false), 800);
    }
  };

  // Handle patient detail view with simulated loading
  const handleViewPatientDetail = (p: PatientRecord) => {
    setSelectedDetailedPatient(p);
    setIsModalLoading(true);
    setTimeout(() => setIsModalLoading(false), 1200);
  };

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 'n1', type: NotificationType.APPOINTMENT, title: 'Appointment Confirmed', message: 'Your visit with Dr. Sarah Wilson has been confirmed for May 20th.', timestamp: new Date().toISOString(), isRead: false },
    { id: 'n2', type: NotificationType.PRESCRIPTION, title: 'Prescription Ready', message: 'Your prescription for Lisinopril is ready for pickup at Healthway Pharmacy.', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false },
    { id: 'n3', type: NotificationType.MESSAGE, title: 'New Message from Doctor', message: 'Dr. James Chen sent you a follow-up note regarding your last lab results.', timestamp: new Date(Date.now() - 86400000).toISOString(), isRead: true },
    { id: 'n4', type: NotificationType.SYSTEM, title: 'Security Update', message: 'Two-factor authentication has been successfully enabled on your account.', timestamp: new Date(Date.now() - 172800000).toISOString(), isRead: true },
    { id: 'n5', type: NotificationType.APPOINTMENT, title: 'New Appointment Request', message: 'You have a new booking request from John Doe for tomorrow morning.', timestamp: new Date(Date.now() - 1800000).toISOString(), isRead: false },
    { id: 'n6', type: NotificationType.SYSTEM, title: 'System Maintenance', message: 'Cayr will be undergoing scheduled maintenance this Sunday from 2 AM to 4 AM.', timestamp: new Date(Date.now() - 259200000).toISOString(), isRead: false },
    { id: 'n7', type: NotificationType.PRESCRIPTION, title: 'Refill Reminder', message: 'It\'s time to request a refill for your seasonal allergy medication.', timestamp: new Date(Date.now() - 432000000).toISOString(), isRead: true },
    { id: 'n8', type: NotificationType.MESSAGE, title: 'Lab Results Available', message: 'Your blood panel results from May 10th are now available in your portal.', timestamp: new Date(Date.now() - 604800000).toISOString(), isRead: true },
    { id: 'n9', type: NotificationType.APPOINTMENT, title: 'Consultation Cancelled', message: 'The appointment with Dr. Emily Blunt has been cancelled by the provider.', timestamp: new Date(Date.now() - 500000).toISOString(), isRead: false },
    { id: 'n10', type: NotificationType.MESSAGE, title: 'Inquiry Update', message: 'Your support ticket #1029 has been resolved by our customer care team.', timestamp: new Date(Date.now() - 7200000).toISOString(), isRead: false },
  ]);

  // Global Payments State (30+ Mock Records)
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const generateMockPayments = () => {
      const services = [
        'Cardiology Consultation', 'Pediatric Checkup', 'Neurological Screening', 
        'General Health Audit', 'Urgent Care Visit', 'Lab Results Review', 
        'Telemedicine Session', 'Dermatology Review', 'Prescription Refill', 'Blood Work Panel'
      ];
      const patientNames = ['John Doe', 'Jane Smith', 'Robert Brown', 'Emily Davis', 'Michael Wilson', 'Sarah Miller', 'David Garcia', 'Maria Rodriguez'];
      const statuses = [PaymentStatus.COMPLETED, PaymentStatus.PENDING, PaymentStatus.FAILED, PaymentStatus.OVERDUE];
      const methods = ['Visa •••• 4242', 'MasterCard •••• 8888', 'Bank Transfer', 'Insurance Provider', 'Apple Pay'];
      
      const mockList: Payment[] = [];
      for (let i = 1; i <= 35; i++) {
        const doc = MOCK_DOCTORS[Math.floor(Math.random() * MOCK_DOCTORS.length)];
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 90));
        
        mockList.push({
          id: `INV-${1000 + i}`,
          patientId: `p${Math.floor(Math.random() * 8) + 1}`,
          patientName: patientNames[Math.floor(Math.random() * patientNames.length)],
          doctorId: doc.id,
          doctorName: doc.name,
          amount: Math.floor(Math.random() * 500) + 50,
          date: date.toISOString().split('T')[0],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          service: services[Math.floor(Math.random() * services.length)],
          method: methods[Math.floor(Math.random() * methods.length)],
          description: "Routine clinical assessment including full vitals review and digital health summary generation."
        });
      }
      setPayments(mockList);
    };
    generateMockPayments();
  }, []);

  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([
    {
      id: 'r1',
      date: '05/10/2024',
      doctorName: 'Dr. Sarah Wilson',
      patientId: 'p1',
      findings: 'Patient reports stable heart rate. Ongoing medication: Lisinopril 10mg. BP: 130/85.',
      type: 'Routine Consultation',
      demographics: { dob: '1990-05-15', address: '123 Healthway Dr, San Francisco', height: 178, weight: 75, age: 34 }
    }
  ]);

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([
    {
      id: 'pre1',
      date: '05/12/2024',
      doctorName: 'Dr. Sarah Wilson',
      medicationName: 'Lisinopril',
      dosage: '10mg Daily',
      fileName: 'prescription_lisinopril.pdf'
    }
  ]);

  const [patients, setPatients] = useState<PatientRecord[]>([
    { id: 'p1', name: 'John Doe', email: 'john.doe@email.com', age: 45, gender: 'Male', bloodType: 'O+', history: [{ condition: 'Hypertension', date: '2023-11-12', doctorName: 'Dr. Sarah Wilson' }], allergies: ['Penicillin'], currentMedications: ['Lisinopril 10mg'], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.ACTIVE, primaryCondition: 'Hypertension', lastVisit: '2024-05-10' },
    { id: 'p2', name: 'Jane Smith', email: 'jane.smith@email.com', age: 32, gender: 'Female', bloodType: 'A-', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.RISK, primaryCondition: 'Diabetes', lastVisit: '2024-05-18' },
    { id: 'p3', name: 'Robert Brown', email: 'robert.b@email.com', age: 67, gender: 'Male', bloodType: 'B+', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.ACTIVE, primaryCondition: 'Heart Disease', lastVisit: '2024-05-01' },
    { id: 'p4', name: 'Emily Davis', email: 'emily.d@email.com', age: 28, gender: 'Female', bloodType: 'AB+', history: [], allergies: ['Latex'], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.INACTIVE, primaryCondition: 'Asthma', lastVisit: '2024-03-15' },
    { id: 'p5', name: 'Michael Wilson', email: 'm.wilson@email.com', age: 52, gender: 'Male', bloodType: 'O-', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.ACTIVE, primaryCondition: 'Other', lastVisit: '2024-05-19' },
    { id: 'p6', name: 'Sarah Miller', email: 's.miller@email.com', age: 41, gender: 'Female', bloodType: 'A+', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.RISK, primaryCondition: 'Hypertension', lastVisit: '2024-05-12' },
    { id: 'p7', name: 'David Garcia', email: 'd.garcia@email.com', age: 35, gender: 'Male', bloodType: 'B-', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.ACTIVE, primaryCondition: 'Asthma', lastVisit: '2024-04-22' },
    { id: 'p8', name: 'Maria Rodriguez', email: 'maria.r@email.com', age: 59, gender: 'Female', bloodType: 'O+', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.ACTIVE, primaryCondition: 'Diabetes', lastVisit: '2024-05-15' },
    { id: 'p9', name: 'James Taylor', email: 'j.taylor@email.com', age: 48, gender: 'Male', bloodType: 'A-', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.INACTIVE, primaryCondition: 'Other', lastVisit: '2024-01-10' },
    { id: 'p10', name: 'Linda Moore', email: 'l.moore@email.com', age: 63, gender: 'Female', bloodType: 'B+', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.RISK, primaryCondition: 'Heart Disease', lastVisit: '2024-05-17' },
    { id: 'p11', name: 'Thomas Anderson', email: 'neo@email.com', age: 44, gender: 'Male', bloodType: 'O-', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.ACTIVE, primaryCondition: 'Other', lastVisit: '2024-05-20' },
    { id: 'p12', name: 'Patricia Jackson', email: 'p.jackson@email.com', age: 71, gender: 'Female', bloodType: 'AB-', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.ACTIVE, primaryCondition: 'Hypertension', lastVisit: '2024-05-11' },
    { id: 'p13', name: 'Christopher Lee', email: 'c.lee@email.com', age: 38, gender: 'Male', bloodType: 'A+', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.ACTIVE, primaryCondition: 'Diabetes', lastVisit: '2024-05-14' },
    { id: 'p14', name: 'Barbara Harris', email: 'b.harris@email.com', age: 55, gender: 'Female', bloodType: 'B-', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.INACTIVE, primaryCondition: 'Asthma', lastVisit: '2023-12-01' },
    { id: 'p15', name: 'Daniel Clark', email: 'd.clark@email.com', age: 46, gender: 'Male', bloodType: 'O+', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.ACTIVE, primaryCondition: 'Hypertension', lastVisit: '2024-05-05' },
    { id: 'p16', name: 'Karen Lewis', email: 'k.lewis@email.com', age: 29, gender: 'Female', bloodType: 'A-', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.ACTIVE, primaryCondition: 'Other', lastVisit: '2024-05-13' },
    { id: 'p17', name: 'Matthew Young', email: 'm.young@email.com', age: 50, gender: 'Male', bloodType: 'B+', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.RISK, primaryCondition: 'Diabetes', lastVisit: '2024-05-18' },
    { id: 'p18', name: 'Betty Hall', email: 'b.hall@email.com', age: 75, gender: 'Female', bloodType: 'AB+', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.ACTIVE, primaryCondition: 'Heart Disease', lastVisit: '2024-05-16' },
    { id: 'p19', name: 'Kevin Allen', email: 'k.allen@email.com', age: 34, gender: 'Male', bloodType: 'O-', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.ACTIVE, primaryCondition: 'Asthma', lastVisit: '2024-05-09' },
    { id: 'p20', name: 'Nancy Wright', email: 'n.wright@email.com', age: 42, gender: 'Female', bloodType: 'A+', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.INACTIVE, primaryCondition: 'Other', lastVisit: '2024-02-28' },
    { id: 'p21', name: 'George Scott', email: 'g.scott@email.com', age: 57, gender: 'Male', bloodType: 'B-', history: [], allergies: [], currentMedications: [], vitalsHistory: [], checklists: [], doctorNotes: '', status: PatientStatus.ACTIVE, primaryCondition: 'Hypertension', lastVisit: '2024-05-15' },
  ]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mockToken = "mock_jwt_token_" + Date.now();
    
    if (loginMode === UserRole.PATIENT) {
      const mockPatient: User = { 
        id: 'p-demo', 
        name: 'John Doe', 
        email: email || 'patient@cayr.com', 
        role: UserRole.PATIENT, 
        phone: '555-0123',
        dob: '1990-05-15',
        address: '123 Healthway Dr, San Francisco',
        height: 178,
        weight: 75,
        medicalHistory: 'History of hypertension managed with medication.',
        notifications: { email: true, sms: false },
        twoFactorEnabled: false
      };
      login(mockToken, mockPatient);
      setCurrentModule('Dashboard');
    } else {
      const demoDoctor = MOCK_DOCTORS[0]; 
      const mockDoctor: User = { 
        ...demoDoctor,
        email: email || demoDoctor.email,
        notifications: { email: true, sms: true },
        twoFactorEnabled: true
      };
      login(mockToken, mockDoctor);
      setCurrentModule('Overview');
    }
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    if (status === AppointmentStatus.CONFIRMED && user) {
      const app = appointments.find(a => a.id === id);
      if (app) {
        const newPayment: Payment = {
          id: 'TX-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
          patientId: app.patientId,
          patientName: app.patientName,
          doctorId: app.doctorId,
          doctorName: app.doctorName,
          amount: 100, 
          date: new Date().toISOString().split('T')[0],
          status: PaymentStatus.PENDING,
          service: 'Clinical Consultation'
        };
        setPayments(prev => [newPayment, ...prev]);
        
        const newNotif: Notification = {
          id: 'n-new-' + Date.now(),
          type: NotificationType.APPOINTMENT,
          title: 'Appointment Status Update',
          message: `Appointment for ${app.patientName} has been ${status.toLowerCase()}.`,
          timestamp: new Date().toISOString(),
          isRead: false
        };
        setNotifications(prev => [newNotif, ...prev]);
      }
    }
  };

  const updatePatientRecord = (updatedPatient: PatientRecord) => {
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
  };

  const bookAppointment = (doctorId: string, doctorNameInput: string, date: string, time: string) => {
    if (!user) return;
    const doctorObj = MOCK_DOCTORS.find(d => d.id === doctorId);
    const newApp: Appointment = {
      id: Math.random().toString(36).substr(2, 9),
      patientId: user.id,
      patientName: user.name,
      doctorId,
      doctorName: doctorObj?.name || doctorNameInput || 'Assigned Specialist',
      date,
      time,
      status: AppointmentStatus.PENDING
    };
    setAppointments(prev => [newApp, ...prev]);
    alert(`Appointment requested with ${newApp.doctorName} for ${date} at ${time}.`);
  };

  const addMedicalReport = (report: MedicalReport) => {
    setMedicalReports(prev => [report, ...prev]);
  };

  const uploadPrescription = (prescription: Prescription) => {
    setPrescriptions(prev => [prescription, ...prev]);
  };

  const handleUpdateProfile = (updatedData: Partial<User>) => {
    if (user && token) {
      const updatedUser = { ...user, ...updatedData };
      login(token, updatedUser);
    }
  };

  const initiateCall = (partnerName: string, partnerRole: string) => {
    setActiveCall({ partnerName, partnerRole });
  };

  const handleMarkAsRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  const handleDeleteNotif = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));
  const handleClearAllNotifs = () => setNotifications([]);
  const handleMarkAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7fe]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#3b5bfd] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen login-bg flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-8 left-8 flex items-center space-x-3 z-10 p-2 border border-blue-200/30 rounded-lg bg-white/20 backdrop-blur-sm">
          <div className="w-8 h-8 bg-[#3b5bfd] rounded-lg flex items-center justify-center text-white font-black">C</div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">Cayr</span>
        </div>
        <div className="max-w-[460px] w-full glass-login p-10 relative z-10 text-center animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center mb-8">
            <div className="w-14 h-14 bg-white/80 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 backdrop-blur-md text-3xl">
               🩺
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{authView === 'signin' ? 'Sign in to Cayr' : 'Join Cayr Platform'}</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-[320px] mx-auto">Access your clinical dashboard and health records instantly.</p>
          
          <div className="pill-toggle-container mb-8">
            <button onClick={() => setLoginMode(UserRole.PATIENT)} className={`pill-toggle-btn ${loginMode === UserRole.PATIENT ? 'active' : 'inactive'}`}>Patient</button>
            <button onClick={() => setLoginMode(UserRole.DOCTOR)} className={`pill-toggle-btn ${loginMode === UserRole.DOCTOR ? 'active' : 'inactive'}`}>Doctor</button>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div className="relative group">
              <input type="email" required placeholder="Email Address" className="w-full px-6 py-4 rounded-2xl auth-input text-slate-800 outline-none text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="relative group">
              <input type="password" required placeholder="Password" className="w-full px-6 py-4 rounded-2xl auth-input text-slate-800 outline-none text-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-[#3b5bfd] text-white py-4 rounded-2xl font-bold text-sm hover:bg-[#2d46e5] transition-all shadow-xl shadow-blue-100 mt-2">Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  const renderModule = () => {
    const isPatient = user.role === UserRole.PATIENT;

    switch (currentModule) {
      case 'Overview':
      case 'Dashboard':
        return isPatient ? (
          <PatientDashboard user={user} appointments={appointments} medicalReports={medicalReports} prescriptions={prescriptions} payments={payments} onBook={bookAppointment} onAddReport={addMedicalReport} onUploadPrescription={uploadPrescription} onJoinCall={(name) => initiateCall(name, 'Specialist')} view="dashboard" />
        ) : (
          <DoctorDashboard user={user} appointments={appointments} payments={payments} updateStatus={updateAppointmentStatus} patients={patients} onUpdatePatient={updatePatientRecord} initialView="Overview" />
        );
      case 'Appointment':
      case 'My Patients':
        return !isPatient ? (
          <DoctorDashboard user={user} appointments={appointments} payments={payments} updateStatus={updateAppointmentStatus} patients={patients} onUpdatePatient={updatePatientRecord} initialView={currentModule} onStartCall={(name) => initiateCall(name, 'Patient')} />
        ) : null;
      case 'Patients':
        return !isPatient ? (
          <PatientsList 
            patients={patients} 
            isLoading={isTableLoading}
            onViewDetails={handleViewPatientDetail} 
            onSendMessage={(name) => { alert(`Opening encrypted channel to ${name}...`); }}
            onSchedule={(name) => { alert(`Redirecting to scheduling system for ${name}...`); }}
          />
        ) : null;
      case 'Analytics':
        return isPatient ? (
          <PatientDashboard user={user} appointments={appointments} medicalReports={medicalReports} prescriptions={prescriptions} payments={payments} onBook={bookAppointment} onAddReport={addMedicalReport} onUploadPrescription={uploadPrescription} onJoinCall={(name) => initiateCall(name, 'Specialist')} view="analytics" />
        ) : (
          <DoctorDashboard user={user} appointments={appointments} payments={payments} updateStatus={updateAppointmentStatus} patients={patients} onUpdatePatient={updatePatientRecord} initialView="Analytics" />
        );
      case 'Payments':
        return (
          <TransactionHistory 
            user={user} 
            payments={isPatient ? payments.filter(p => p.patientId === user.id) : payments.filter(p => p.doctorId === user.id)} 
          />
        );
      case 'Profile':
        return <ProfilePage user={user} onUpdateProfile={handleUpdateProfile} onLogout={logout} />;
      case 'Notifications':
        return (
          <NotificationCenter 
            notifications={notifications} 
            onMarkAsRead={handleMarkAsRead} 
            onDelete={handleDeleteNotif} 
            onClearAll={handleClearAllNotifs} 
            onMarkAllAsRead={handleMarkAllRead} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <Layout user={user} onLogout={logout} currentModule={currentModule} onModuleChange={handleModuleChange} appointments={appointments} notifications={notifications}>
      {renderModule()}
      {activeCall && <VideoCall partnerName={activeCall.partnerName} partnerRole={activeCall.partnerRole} onEnd={() => setActiveCall(null)} />}
      
      {/* Patient Detail Modal */}
      {selectedDetailedPatient && (
        <PatientDetailModal 
          patient={selectedDetailedPatient} 
          isLoading={isModalLoading}
          onClose={() => setSelectedDetailedPatient(null)} 
          onStartConsult={(name) => initiateCall(name, 'Patient')}
          onNewEntry={() => alert('New clinical entry wizard triggered...')}
          onSchedule={() => alert('Scheduling system triggered...')}
        />
      )}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
