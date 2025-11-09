const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: string;
}

export interface DrugInteraction {
  severity: 'mild' | 'moderate' | 'severe' | 'contraindicated';
  description: string;
  recommendation: string;
}

export interface InteractionCheck {
  hasInteractions: boolean;
  interactions: Array<{
    medications: string[];
    interaction: DrugInteraction;
  }>;
}

export interface PrescriptionData {
  prescriptionId: string;
  date: string;
  medications: Medication[];
  doctorName?: string;
  patientName?: string;
  diagnosis?: string;
  additionalNotes?: string;
  interactions: InteractionCheck;
}

/**
 * Upload and analyze prescription
 */
export async function uploadAndAnalyzePrescription(
  patientId: string,
  file: File
): Promise<PrescriptionData> {
  // Validate file type
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const validPdfType = 'application/pdf';
  const isValidType = validImageTypes.includes(file.type) || file.type === validPdfType;

  if (!isValidType) {
    throw new Error('Invalid file type. Please upload an image (JPG, PNG, WebP) or PDF file.');
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit. Please upload a smaller file.');
  }

  // Create FormData
  const formData = new FormData();
  formData.append('file', file);

  // Get auth token
  const token = localStorage.getItem('auth_access_token');
  if (!token) {
    throw new Error('Not authenticated. Please login first.');
  }

  // Upload and analyze
  try {
    console.log(`Uploading prescription for patient ${patientId} to ${API_BASE_URL}/patients/${patientId}/prescriptions/upload`);
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/prescriptions/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed', error: 'Unknown error' }));
      console.error('Upload failed:', errorData);
      const errorMessage = errorData.error || errorData.message || `Upload failed: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Upload successful:', data);
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend server. Please ensure the backend is running on http://localhost:3000');
    }
    throw error;
  }
}

