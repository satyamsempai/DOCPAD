import { LabTest } from "@/utils/labParser";
import { authenticatedFetch } from "@/services/authService";

export interface IdentifiedCondition {
  conditionName: string;
  likelihood: 'Low' | 'Moderate' | 'High' | 'Very High';
  explanation: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
}

export interface ReportAnalysis {
  extractedData: {
    tests: LabTest[];
    overallSeverity: 'Low' | 'Moderate' | 'High' | 'Critical';
    identifiedConditions?: IdentifiedCondition[];
  };
  aiSummary: {
    severityAssessment: string;
    diseaseAnalysis?: string;
    deviationFromNormal: string;
    recommendedMedicines: string[];
    precautions: string[];
    lifestyleRecommendations?: {
      diet: string[];
      exercise: string[];
      monitoring: string[];
      warningSigns: string[];
    };
    additionalRecommendations?: {
      specialistReferrals: string[];
      furtherTests: string[];
      followUp: string;
    };
  };
  confidence: number;
  reportId: string;
  date: string;
  modelPrediction?: {
    probability: number;
    prediction: number;
    severity: string;
    note?: string;
  };
  alerts?: Array<{
    id: string;
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    message: string;
    testName?: string;
    testValue?: string;
    conditionName?: string;
    timestamp: string;
  }>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Check if backend is available
async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

export async function uploadAndAnalyzeReport(
  patientId: string,
  file: File
): Promise<ReportAnalysis> {
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

  // Check backend health first
  const isBackendHealthy = await checkBackendHealth();
  if (!isBackendHealthy) {
    throw new Error('Backend server is not reachable. Please ensure the backend is running on http://localhost:3000');
  }

  // Upload and analyze
  try {
    console.log(`Uploading report for patient ${patientId} to ${API_BASE_URL}/patients/${patientId}/test-reports/upload`);
    
    // Use authenticated fetch for protected endpoint
    const token = localStorage.getItem('auth_access_token');
    if (!token) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/test-reports/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed', error: 'Unknown error' }));
      console.error('Upload failed:', errorData);
      // Show the detailed error if available, otherwise show the message
      const errorMessage = errorData.error || errorData.message || `Upload failed: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Upload successful:', data);
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend server. Please ensure the backend is running on http://localhost:3000');
    }
    // Re-throw other errors
    throw error;
  }
}

