
import { User, UserRole, Appointment, AppointmentStatus } from './types';

export const MOCK_DOCTORS: User[] = [
  {
    id: 'd1', name: 'Dr. Sarah Wilson', email: 'sarah.w@med.com', role: UserRole.DOCTOR, specialty: 'Cardiology',
    addressDetails: { zip: '110001', city: 'New Delhi', state: 'Delhi' }
  },
  {
    id: 'd2', name: 'Dr. James Chen', email: 'james.c@med.com', role: UserRole.DOCTOR, specialty: 'Pediatrics',
    addressDetails: { zip: '400001', city: 'Mumbai', state: 'Maharashtra' }
  },
  {
    id: 'd3', name: 'Dr. Emily Blunt', email: 'emily.b@med.com', role: UserRole.DOCTOR, specialty: 'Neurology',
    addressDetails: { zip: '110001', city: 'New Delhi', state: 'Delhi' }
  },
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    patientId: 'p1',
    patientName: 'John Doe',
    doctorId: 'd1',
    doctorName: 'Dr. Sarah Wilson',
    date: '2024-05-20',
    time: '10:00 AM',
    status: AppointmentStatus.CONFIRMED,
  },
  {
    id: 'a2',
    patientId: 'p1',
    patientName: 'John Doe',
    doctorId: 'd2',
    doctorName: 'Dr. James Chen',
    date: '2024-05-22',
    time: '02:30 PM',
    status: AppointmentStatus.PENDING,
  }
];

// ── PDF Extraction Configuration ─────────────────────────────────────────────

export const EXTRACTION_CONFIDENCE_THRESHOLD = 0.8; // Fields ≥ 80% auto-checked in preview

export interface ValidationRange { min: number; max: number; unit: string; label: string; }
export const MEDICAL_VALIDATION_RANGES: Record<string, ValidationRange> = {
  heartRate: { min: 20, max: 200, unit: 'bpm', label: 'Heart rate' },
  glucose: { min: 20, max: 800, unit: 'mg/dL', label: 'Blood glucose' },
  hemoglobin: { min: 3, max: 25, unit: 'g/dL', label: 'Hemoglobin' },
  height: { min: 50, max: 250, unit: 'cm', label: 'Height' },
  weight: { min: 2, max: 300, unit: 'kg', label: 'Weight' },
  bpSystolic: { min: 40, max: 250, unit: 'mmHg', label: 'Blood pressure (systolic)' },
  bpDiastolic: { min: 20, max: 150, unit: 'mmHg', label: 'Blood pressure (diastolic)' },
};

// Maps extracted field keys → human-readable form field labels
export const EXTRACTION_FIELD_LABELS: Record<string, string> = {
  patientName: 'Patient Name',
  age: 'Age',
  gender: 'Gender',
  doctorName: 'Doctor Name',
  reportDate: 'Report Date',
  bloodPressure: 'Blood Pressure',
  heartRate: 'Heart Rate (bpm)',
  glucose: 'Blood Glucose (mg/dL)',
  hemoglobin: 'Hemoglobin (g/dL)',
  height: 'Height (cm)',
  weight: 'Weight (kg)',
  bloodType: 'Blood Type',
  allergies: 'Allergies',
  conditions: 'Pre-existing Conditions',
  medications: 'Current Medications',
  medicalHistory: 'Medical History',
  symptoms: 'Symptoms',
};
