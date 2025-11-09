# Backend Integration Guide

This document explains how to transition from mock data to a real backend API.

## Current Architecture

The app uses a clean separation between UI and data:
- **UI Components**: React components in `src/components/` and `src/pages/`
- **API Layer**: `src/api/mockApi.ts` - single source of truth for data access
- **Type Definitions**: TypeScript interfaces in `mockApi.ts`

## Integration Steps

### Step 1: Set Up Backend API

Create endpoints that match these interfaces:

```typescript
// GET /api/patients/search?q={query}
interface SearchResponse {
  patients: Patient[];
}

// GET /api/patients/{id}
interface PatientResponse {
  patient: Patient;
}

// GET /api/patients/{id}/doctor-reports
interface DoctorReportsResponse {
  reports: DoctorReport[];
}

// GET /api/patients/{id}/test-reports
interface TestReportsResponse {
  reports: TestReport[];
}
```

### Step 2: Create API Client

Create `src/api/apiClient.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      // Add auth token if needed:
      // 'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

export default fetchAPI;
```

### Step 3: Update mockApi.ts

Replace mock implementations with real API calls:

```typescript
import fetchAPI from './apiClient';

export async function searchPatients(query: string): Promise<Patient[]> {
  const data = await fetchAPI<{ patients: Patient[] }>(
    `/patients/search?q=${encodeURIComponent(query)}`
  );
  return data.patients;
}

export async function getPatient(id: string): Promise<Patient | null> {
  try {
    const data = await fetchAPI<{ patient: Patient }>(`/patients/${id}`);
    return data.patient;
  } catch (error) {
    console.error('Failed to fetch patient:', error);
    return null;
  }
}

export async function getDoctorReports(patientId: string): Promise<DoctorReport[]> {
  const data = await fetchAPI<{ reports: DoctorReport[] }>(
    `/patients/${patientId}/doctor-reports`
  );
  return data.reports;
}

export async function getTestReports(patientId: string): Promise<TestReport[]> {
  const data = await fetchAPI<{ reports: TestReport[] }>(
    `/patients/${patientId}/test-reports`
  );
  return data.reports;
}
```

### Step 4: Environment Variables

Add to `.env.local`:

```bash
VITE_API_BASE_URL=https://your-backend-api.com/api
```

### Step 5: Error Handling

Add proper error handling in components:

```typescript
// In SearchPage.tsx
try {
  const patients = await searchPatients(query);
  setResults(patients);
} catch (error) {
  console.error('Search error:', error);
  toast({
    title: "Search failed",
    description: "Unable to search patients. Please try again.",
    variant: "destructive",
  });
}
```

## Using Supabase Backend

If using Supabase (Lovable Cloud):

### Database Schema

```sql
-- Patients table
CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  sex TEXT CHECK (sex IN ('M', 'F', 'O')),
  village TEXT NOT NULL,
  phone TEXT NOT NULL,
  last_visit DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Doctor reports table
CREATE TABLE doctor_reports (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id),
  date DATE NOT NULL,
  type TEXT NOT NULL,
  snippet TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Test reports table
CREATE TABLE test_reports (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id),
  date DATE NOT NULL,
  type TEXT NOT NULL,
  snippet TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_patients_name ON patients USING gin(to_tsvector('english', name));
CREATE INDEX idx_doctor_reports_patient_id ON doctor_reports(patient_id);
CREATE INDEX idx_test_reports_patient_id ON test_reports(patient_id);
```

### Supabase Client Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Update API Functions

```typescript
import { supabase } from '@/lib/supabase';

export async function searchPatients(query: string): Promise<Patient[]> {
  // Check if it's a patient ID
  const idPattern = /^[A-Z]{3}-\d{2}-\d{4}-[0-9X]$/i;
  
  if (idPattern.test(query)) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', query.toUpperCase())
      .limit(1);
    
    if (error) throw error;
    return data || [];
  }

  // Search by name
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('last_visit', { ascending: false })
    .limit(8);

  if (error) throw error;
  return data || [];
}

export async function getPatient(id: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch patient:', error);
    return null;
  }

  return data;
}

export async function getDoctorReports(patientId: string): Promise<DoctorReport[]> {
  const { data, error } = await supabase
    .from('doctor_reports')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTestReports(patientId: string): Promise<TestReport[]> {
  const { data, error } = await supabase
    .from('test_reports')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}
```

## Testing Backend Integration

1. **Keep mock data during development**: Use environment variable to switch between mock and real API

```typescript
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export async function searchPatients(query: string): Promise<Patient[]> {
  if (USE_MOCK_DATA) {
    return mockSearchPatients(query);
  }
  return realSearchPatients(query);
}
```

2. **Test incrementally**: Start with one endpoint, verify it works, then move to next

3. **Add loading states**: Ensure UI handles loading/error states gracefully

4. **Monitor network**: Use browser DevTools to verify API calls

## Common Issues

### CORS Errors
Add CORS headers on backend:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

### Authentication
Add token to requests:
```typescript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
}
```

### Rate Limiting
Add exponential backoff for retries:
```typescript
async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

## Test Report Upload with AI Analysis

### New Endpoint: Upload and Analyze Test Report

**Endpoint:** `POST /api/patients/{patientId}/test-reports/upload`

**Content-Type:** `multipart/form-data`

**Request Body:**
```
file: File (image: JPG, PNG, WebP or PDF, max 10MB)
```

**Response:**
```typescript
{
  reportId: string;
  date: string; // ISO date string
  extractedData: {
    tests: Array<{
      name: string;
      value: number;
      unit: string;
      severity: 'normal' | 'moderate' | 'high';
      threshold?: string;
    }>;
    overallSeverity: 'Low' | 'Moderate' | 'High';
  };
  aiSummary: {
    severityAssessment: string;
    deviationFromNormal: string;
    recommendedMedicines: string[];
    precautions: string[];
  };
  confidence: number; // 0-1
}
```

### Backend Implementation with Google Gemini

#### Step 1: Install Dependencies

```bash
npm install @google/generative-ai
```

#### Step 2: Set Up Google Gemini API

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to environment variables:
```bash
GOOGLE_AI_API_KEY=your_api_key_here
```

#### Step 3: Backend Implementation Example (Node.js/Express)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

app.post('/api/patients/:patientId/test-reports/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { patientId } = req.params;
    const filePath = req.file.path;
    const fileType = req.file.mimetype;

    // Read file as base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    // Prepare image part for Gemini
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: fileType,
      },
    };

    // Create prompt for Gemini
    const prompt = `Analyze this medical test report image/PDF and extract the following information:

1. Extract all lab test values (HbA1c, FBS, Blood Pressure, LDL, Creatinine, etc.) with their values, units, and reference ranges
2. Assess the severity of each test (normal, moderate, high) based on standard medical thresholds
3. Provide an overall severity assessment (Low, Moderate, High)
4. Generate a detailed severity assessment explaining how concerning the results are
5. Explain how much each value deviates from normal ranges
6. Suggest recommended medicines (if any abnormalities are found)
7. List precautions the patient should take

Return the response as a JSON object with this exact structure:
{
  "extractedData": {
    "tests": [
      {
        "name": "Test Name",
        "value": number,
        "unit": "unit",
        "severity": "normal" | "moderate" | "high",
        "threshold": "reference range description"
      }
    ],
    "overallSeverity": "Low" | "Moderate" | "High"
  },
  "aiSummary": {
    "severityAssessment": "Detailed explanation of how concerning the results are",
    "deviationFromNormal": "Explanation of how values deviate from normal ranges",
    "recommendedMedicines": ["Medicine 1", "Medicine 2"],
    "precautions": ["Precaution 1", "Precaution 2"]
  },
  "confidence": 0.85
}`;

    // Call Gemini API
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response (may need to extract JSON from markdown code blocks)
    let analysisData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      analysisData = JSON.parse(jsonText.trim());
    } catch (parseError) {
      // If direct parse fails, try to extract JSON object
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Generate report ID and date
    const reportId = `tr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const date = new Date().toISOString();

    // Return response
    res.json({
      reportId,
      date,
      extractedData: analysisData.extractedData,
      aiSummary: analysisData.aiSummary,
      confidence: analysisData.confidence || 0.85,
    });
  } catch (error) {
    console.error('Error processing report:', error);
    res.status(500).json({
      message: 'Failed to analyze report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

#### Step 4: Error Handling

- File size validation (max 10MB)
- File type validation
- Gemini API error handling
- JSON parsing error handling
- Network timeout handling

#### Step 5: Alternative: Using Gemini Pro (Text-only)

If you need to extract text first (for PDFs), you can use OCR or PDF parsing libraries, then use `gemini-pro` model:

```typescript
const textModel = genAI.getGenerativeModel({ model: 'gemini-pro' });

// First extract text from PDF/image using OCR
const extractedText = await extractTextFromFile(filePath);

// Then analyze with Gemini
const result = await textModel.generateContent([prompt, extractedText]);
```

### Testing the Upload Endpoint

```bash
curl -X POST http://localhost:3000/api/patients/MHR-01-2024-7/test-reports/upload \
  -F "file=@/path/to/test-report.jpg" \
  -H "Content-Type: multipart/form-data"
```

## Deployment Checklist

- [ ] Replace all mock data imports with real API calls
- [ ] Add proper error handling and loading states
- [ ] Set up environment variables for API URLs
- [ ] Configure CORS on backend
- [ ] Add authentication if needed
- [ ] Test all CRUD operations
- [ ] Add proper logging for debugging
- [ ] Set up monitoring/alerting
- [ ] Document API endpoints
- [ ] Add API rate limiting handling
- [ ] Set up Google Gemini API key
- [ ] Implement file upload endpoint with AI analysis
- [ ] Test file upload with various formats (JPG, PNG, PDF)
- [ ] Add file size and type validation
- [ ] Implement error handling for AI API failures

## Contact

For help with backend integration, refer to:
- Supabase docs: https://supabase.com/docs
- React Query docs (for caching): https://tanstack.com/query/latest
