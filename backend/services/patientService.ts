const bcrypt = require('bcrypt');

export interface Patient {
  id: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  name: string;
  patientId: string; // Medical record ID like MHR-01-2024-7
  dateOfBirth?: Date;
  sex?: 'M' | 'F' | 'Other';
  village?: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

// In-memory patient store (replace with database in production)
const patients: Map<string, Patient> = new Map();

// Initialize with default patients (for development/demo)
const SALT_ROUNDS = 10;

async function initializeDefaultPatients() {
  // Patient 1: Rajesh Kumar (MHR-01-2024-7)
  const patient1Password = await bcrypt.hash('patient123', SALT_ROUNDS);
  patients.set('MHR-01-2024-7', {
    id: 'patient-001',
    email: 'rajesh.kumar@example.com',
    phone: '+91-9876543210',
    passwordHash: patient1Password,
    name: 'Rajesh Kumar',
    patientId: 'MHR-01-2024-7',
    dateOfBirth: new Date('1975-05-15'),
    sex: 'M',
    village: 'Village A',
    createdAt: new Date(),
    isActive: true,
  });

  // Patient 2: Sunita Devi (MHR-01-2024-8)
  const patient2Password = await bcrypt.hash('patient123', SALT_ROUNDS);
  patients.set('MHR-01-2024-8', {
    id: 'patient-002',
    email: 'sunita.devi@example.com',
    phone: '+91-9876543211',
    passwordHash: patient2Password,
    name: 'Sunita Devi',
    patientId: 'MHR-01-2024-8',
    dateOfBirth: new Date('1980-08-20'),
    sex: 'F',
    village: 'Village B',
    createdAt: new Date(),
    isActive: true,
  });

  // Patient 3: Amit Singh (MHR-01-2024-9)
  const patient3Password = await bcrypt.hash('patient123', SALT_ROUNDS);
  patients.set('MHR-01-2024-9', {
    id: 'patient-003',
    email: 'amit.singh@example.com',
    phone: '+91-9876543212',
    passwordHash: patient3Password,
    name: 'Amit Singh',
    patientId: 'MHR-01-2024-9',
    dateOfBirth: new Date('1990-12-10'),
    sex: 'M',
    village: 'Village C',
    createdAt: new Date(),
    isActive: true,
  });

  console.log('✅ Default patients initialized');
  console.log('   Patient 1: MHR-01-2024-7 / patient123');
  console.log('   Patient 2: MHR-01-2024-8 / patient123');
  console.log('   Patient 3: MHR-01-2024-9 / patient123');
}

// Initialize on module load
initializeDefaultPatients().catch(console.error);

/**
 * Find patient by patient ID
 */
export async function findPatientByPatientId(patientId: string): Promise<Patient | null> {
  const patient = patients.get(patientId.toUpperCase());
  return patient || null;
}

/**
 * Find patient by email
 */
export async function findPatientByEmail(email: string): Promise<Patient | null> {
  for (const patient of patients.values()) {
    if (patient.email && patient.email.toLowerCase() === email.toLowerCase()) {
      return patient;
    }
  }
  return null;
}

/**
 * Find patient by phone
 */
export async function findPatientByPhone(phone: string): Promise<Patient | null> {
  for (const patient of patients.values()) {
    if (patient.phone && patient.phone === phone) {
      return patient;
    }
  }
  return null;
}

/**
 * Find patient by ID
 */
export async function findPatientById(id: string): Promise<Patient | null> {
  for (const patient of patients.values()) {
    if (patient.id === id) {
      return patient;
    }
  }
  return null;
}

/**
 * Verify patient password
 */
export async function verifyPatientPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Create new patient account
 */
export async function createPatient(
  patientId: string,
  password: string,
  name: string,
  email?: string,
  phone?: string
): Promise<Patient> {
  const existingPatient = await findPatientByPatientId(patientId);
  if (existingPatient) {
    throw new Error('Patient with this ID already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const patient: Patient = {
    id: `patient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    email,
    phone,
    passwordHash,
    name,
    patientId: patientId.toUpperCase(),
    createdAt: new Date(),
    isActive: true,
  };

  patients.set(patient.patientId, patient);
  return patient;
}

/**
 * Update patient last login
 */
export async function updatePatientLastLogin(patientId: string): Promise<void> {
  const patient = await findPatientByPatientId(patientId);
  if (patient) {
    patient.lastLogin = new Date();
    patients.set(patient.patientId, patient);
  }
}

