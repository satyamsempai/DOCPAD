const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface SymptomAnalysis {
  symptoms: string[];
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  potentialConditions: Array<{
    condition: string;
    likelihood: 'low' | 'moderate' | 'high' | 'very high';
    explanation: string;
  }>;
  advice: string[];
  recommendedMedications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    indication: string;
    note?: string;
  }>;
  selfCareRecommendations: string[];
  doctorVisitRecommended: boolean;
  doctorVisitUrgency: 'routine' | 'soon' | 'urgent' | 'emergency';
  doctorVisitReason: string;
  warningSigns: string[];
  followUpInstructions: string;
}

export interface AnalyzeSymptomsRequest {
  symptomDescription: string;
  patientContext?: {
    age?: number;
    sex?: string;
    existingConditions?: string[];
    currentMedications?: string[];
    allergies?: string[];
  };
}

export interface AnalyzeSymptomsResponse {
  success: boolean;
  analysis: SymptomAnalysis;
}

export async function analyzeSymptoms(
  request: AnalyzeSymptomsRequest
): Promise<SymptomAnalysis> {
  const token = localStorage.getItem('auth_access_token');
  if (!token) {
    throw new Error('Not authenticated. Please login first.');
  }

  const response = await fetch(`${API_BASE_URL}/symptoms/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to analyze symptoms' }));
    throw new Error(errorData.message || 'Failed to analyze symptoms');
  }

  const data: AnalyzeSymptomsResponse = await response.json();
  return data.analysis;
}

