const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface VisitNote {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  physicalExamination: string;
  assessment: string;
  plan: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  followUpInstructions?: string;
  nextVisitDate?: string;
}

export interface PatientContext {
  name: string;
  age?: number;
  sex?: string;
  pastMedicalHistory?: string[];
  currentMedications?: Array<{
    name: string;
    dosage: string;
  }>;
  recentTestResults?: string;
  allergies?: string[];
}

export interface GenerateVisitNoteRequest {
  doctorInput: string;
  patientContext?: PatientContext;
}

export interface GenerateVisitNoteResponse {
  success: boolean;
  visitNote: VisitNote;
}

export async function generateVisitNote(
  patientId: string,
  request: GenerateVisitNoteRequest
): Promise<VisitNote> {
  const token = localStorage.getItem('auth_access_token');
  if (!token) {
    throw new Error('Not authenticated. Please login first.');
  }

  const response = await fetch(`${API_BASE_URL}/patients/${patientId}/visit-notes/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to generate visit note' }));
    throw new Error(errorData.message || 'Failed to generate visit note');
  }

  const data: GenerateVisitNoteResponse = await response.json();
  return data.visitNote;
}

