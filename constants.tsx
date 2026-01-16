
import { User, UserRole, Appointment, AppointmentStatus } from './types';

export const MOCK_DOCTORS: User[] = [
  { id: 'd1', name: 'Dr. Sarah Wilson', email: 'sarah.w@med.com', role: UserRole.DOCTOR, specialty: 'Cardiology' },
  { id: 'd2', name: 'Dr. James Chen', email: 'james.c@med.com', role: UserRole.DOCTOR, specialty: 'Pediatrics' },
  { id: 'd3', name: 'Dr. Emily Blunt', email: 'emily.b@med.com', role: UserRole.DOCTOR, specialty: 'Neurology' },
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
