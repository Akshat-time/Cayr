
export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  ADMIN = 'ADMIN',
  AMBULANCE = 'AMBULANCE'
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  OVERDUE = 'OVERDUE'
}

export enum NotificationType {
  APPOINTMENT = 'APPOINTMENT',
  PRESCRIPTION = 'PRESCRIPTION',
  SYSTEM = 'SYSTEM',
  MESSAGE = 'MESSAGE'
}

export enum PatientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RISK = 'RISK',
  EMERGENCY = 'EMERGENCY'
}

export interface PainArea {
  id: string;
  label: string;
  intensity: number;
  notes?: string;
  side: 'Front' | 'Back';
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface Payment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  amount: number;
  date: string;
  status: PaymentStatus;
  service: string;
  description?: string;
  method?: string;
}

export interface Vitals {
  date: string;
  bp: string;
  sugar: string;
  heartRate: number;
  temp: string;
  o2?: string;
}

export interface ClinicalEntry {
  id: string;
  date: string;
  doctorName: string;
  vitals: Vitals;
  observations: string;
  treatment: string;
  recommendations: string;
  painMap?: PainArea[];
}

export interface TestResult {
  id: string;
  name: string;
  date: string;
  status: 'Pending' | 'Completed' | 'Abnormal';
  value: string;
  normalRange: string;
  interpretation: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber: string;
  expiry: string;
}

export interface MedicalReport {
  id: string;
  date: string;
  doctorName: string;
  patientId: string;
  findings: string;
  type: string;
  demographics: {
    dob: string;
    address: string;
    height: number;
    weight: number;
    age: number;
  };
  painMap?: PainArea[];
}

export interface Prescription {
  id: string;
  date: string;
  doctorName: string;
  medicationName: string;
  dosage: string;
  fileName: string;
  fileData?: string;
}

export interface HistoryEntry {
  condition: string;
  date: string;
  doctorName: string;
  type?: string;
  status?: AppointmentStatus;
}

export interface PatientRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  age: number;
  gender: string;
  bloodType: string;
  history: HistoryEntry[];
  allergies: string[];
  currentMedications: string[];
  vitalsHistory: Vitals[];
  checklists: { id: string; task: string; completed: boolean }[];
  doctorNotes: string;
  dob?: string;
  address?: string;
  height?: number;
  weight?: number;
  status?: PatientStatus;
  primaryCondition?: string;
  lastVisit?: string;
  insurance?: InsuranceInfo;
  emergencyContact?: { name: string; relation: string; phone: string };
  clinicalEntries?: ClinicalEntry[];
  testResults?: TestResult[];
  documents?: { id: string; name: string; type: string; date: string; uploadedBy: string }[];
  activePainMap?: PainArea[];
}

export interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: UserRole;
  phone?: string;
  specialty?: string;
  medicalHistory?: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  address?: string;
  addressDetails?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  preferredLanguage?: string;
  height?: number;
  weight?: number;
  bloodType?: string;
  bloodPressure?: string;
  heartRate?: number;
  symptoms?: string;
  allergies?: string[];
  conditions?: string[];
  currentMedications?: string[];
  notifications?: {
    email: boolean;
    sms: boolean;
  };
  twoFactorEnabled?: boolean;
  profilePicture?: string;
  licenseNumber?: string;
  experienceYears?: number | string;
  consultationFee?: number | string;
  clinicName?: string;
  /** Intake pipeline status — drives routing and UI badges */
  intakeStatus?: 'draft' | 'submitted' | 'skipped';
  intakeProgress?: number; // 0-100
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string;
  type?: string;
}
