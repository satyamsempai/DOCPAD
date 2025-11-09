export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: 'M' | 'F' | 'O';
  village: string;
  phone: string;
  lastVisit: string;
  confidence?: number;
}

export interface DoctorReport {
  id: string;
  date: string;
  type: string;
  snippet: string;
  content: string;
}

export interface TestReport {
  id: string;
  date: string;
  type: string;
  snippet: string;
  content: string;
  aiAnalysis?: {
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
    confidence: number;
  };
}

const mockPatients: Patient[] = [
  {
    id: 'MHR-01-2024-7',
    name: 'Rajesh Kumar',
    age: 54,
    sex: 'M',
    village: 'Kalyanpur',
    phone: '9876543210',
    lastVisit: '2024-01-15',
    confidence: 1.0,
  },
  {
    id: 'MHR-01-2024-8',
    name: 'Sunita Devi',
    age: 47,
    sex: 'F',
    village: 'Ramgarh',
    phone: '9876543211',
    lastVisit: '2024-01-14',
    confidence: 0.95,
  },
  {
    id: 'MHR-01-2024-9',
    name: 'Amit Singh',
    age: 62,
    sex: 'M',
    village: 'Kalyanpur',
    phone: '9876543212',
    lastVisit: '2024-01-10',
    confidence: 0.9,
  },
  {
    id: 'MHR-01-2024-A',
    name: 'Priya Sharma',
    age: 34,
    sex: 'F',
    village: 'Ramgarh',
    phone: '9876543213',
    lastVisit: '2024-01-16',
    confidence: 0.92,
  },
  {
    id: 'MHR-01-2024-B',
    name: 'Vikram Patel',
    age: 45,
    sex: 'M',
    village: 'Sitapur',
    phone: '9876543214',
    lastVisit: '2024-01-12',
    confidence: 0.88,
  },
  {
    id: 'MHR-01-2024-C',
    name: 'Anita Verma',
    age: 39,
    sex: 'F',
    village: 'Kalyanpur',
    phone: '9876543215',
    lastVisit: '2024-01-13',
    confidence: 0.93,
  },
  {
    id: 'MHR-01-2024-D',
    name: 'Ramesh Yadav',
    age: 58,
    sex: 'M',
    village: 'Gopalpur',
    phone: '9876543216',
    lastVisit: '2024-01-11',
    confidence: 0.87,
  },
  {
    id: 'MHR-01-2024-E',
    name: 'Kavita Singh',
    age: 42,
    sex: 'F',
    village: 'Ramgarh',
    phone: '9876543217',
    lastVisit: '2024-01-09',
    confidence: 0.91,
  },
  {
    id: 'MHR-01-2024-F',
    name: 'Deepak Gupta',
    age: 51,
    sex: 'M',
    village: 'Sitapur',
    phone: '9876543218',
    lastVisit: '2024-01-08',
    confidence: 0.89,
  },
  {
    id: 'MHR-01-2024-G',
    name: 'Meera Reddy',
    age: 36,
    sex: 'F',
    village: 'Kalyanpur',
    phone: '9876543219',
    lastVisit: '2024-01-07',
    confidence: 0.94,
  },
  {
    id: 'MHR-01-2024-H',
    name: 'Suresh Joshi',
    age: 65,
    sex: 'M',
    village: 'Gopalpur',
    phone: '9876543220',
    lastVisit: '2024-01-05',
    confidence: 0.86,
  },
  {
    id: 'MHR-01-2024-I',
    name: 'Pooja Mishra',
    age: 29,
    sex: 'F',
    village: 'Ramgarh',
    phone: '9876543221',
    lastVisit: '2024-01-04',
    confidence: 0.90,
  },
  {
    id: 'MHR-01-2024-J',
    name: 'Arun Kumar',
    age: 48,
    sex: 'M',
    village: 'Sitapur',
    phone: '9876543222',
    lastVisit: '2024-01-03',
    confidence: 0.85,
  },
  {
    id: 'MHR-01-2024-K',
    name: 'Geeta Nair',
    age: 55,
    sex: 'F',
    village: 'Kalyanpur',
    phone: '9876543223',
    lastVisit: '2024-01-02',
    confidence: 0.88,
  },
  {
    id: 'MHR-01-2024-L',
    name: 'Manoj Thakur',
    age: 41,
    sex: 'M',
    village: 'Gopalpur',
    phone: '9876543224',
    lastVisit: '2024-01-01',
    confidence: 0.92,
  },
];

const mockDoctorReports: Record<string, DoctorReport[]> = {
  'MHR-01-2024-7': [
    {
      id: 'dr-1',
      date: '2024-01-15',
      type: 'Follow-up Visit',
      snippet: 'Patient reports improved blood sugar control...',
      content: `Chief complaint: Follow-up for diabetes management
      
History: Patient with Type 2 Diabetes for 8 years. Reports better adherence to medications. Occasional episodes of hypoglycemia in morning.

Examination: BP 138/88, HR 76, Weight 78kg. No acute distress. Cardiovascular and respiratory examination normal.

Assessment: Type 2 Diabetes Mellitus - fair control, mild hypertension

Plan: Continue Metformin 500mg BD, Added Amlodipine 5mg OD for BP control. Advised dietary modifications. RBS monitoring. Follow-up in 4 weeks.`,
    },
    {
      id: 'dr-2',
      date: '2024-01-08',
      type: 'Regular Checkup',
      snippet: 'Routine diabetes monitoring visit...',
      content: 'Routine checkup note. Patient stable on current medications. Advised continued monitoring.',
    },
  ],
  'MHR-01-2024-8': [
    {
      id: 'dr-3',
      date: '2024-01-14',
      type: 'Initial Consultation',
      snippet: 'New patient presenting with fatigue and weight loss...',
      content: `Chief complaint: Fatigue and unintended weight loss for 3 months
      
History: 47-year-old female with progressive fatigue, increased thirst, frequent urination. Weight loss of 6kg in 3 months. No fever or other systemic symptoms.

Examination: BP 128/82, HR 82, Weight 58kg, BMI 22. Alert and oriented. Mild pallor noted. Systemic examination unremarkable.

Assessment: ? New-onset diabetes mellitus, ? Thyroid disorder

Plan: Ordered FBS, HbA1c, Thyroid profile, CBC. Counseled on lifestyle modifications. Review with reports in 3 days.`,
    },
  ],
  'MHR-01-2024-A': [
    {
      id: 'dr-4',
      date: '2024-01-16',
      type: 'Prenatal Visit',
      snippet: 'Regular prenatal checkup, 24 weeks gestation...',
      content: `Chief complaint: Routine prenatal visit

History: 34-year-old G2P1 at 24 weeks gestation. Previous normal delivery. No complications this pregnancy.

Examination: BP 118/76, Weight 62kg (appropriate gain), Fundal height 24cm. Fetal heart rate 142 bpm. No edema.

Assessment: Healthy pregnancy progressing well

Plan: Continue prenatal vitamins, Iron supplementation. Next visit at 28 weeks. Glucose screening scheduled.`,
    },
  ],
  'MHR-01-2024-H': [
    {
      id: 'dr-5',
      date: '2024-01-05',
      type: 'Follow-up Visit',
      snippet: 'Hypertension management, medication adjustment...',
      content: `Chief complaint: Follow-up for hypertension

History: 65-year-old male with essential hypertension for 10 years. Reports good medication compliance. Occasional dizziness.

Examination: BP 152/94, HR 68, Weight 72kg. Cardiovascular examination shows regular rhythm.

Assessment: Uncontrolled hypertension

Plan: Increased Amlodipine to 10mg OD. Added Atenolol 25mg OD. Home BP monitoring advised. Review in 2 weeks.`,
    },
  ],
};

const mockTestReports: Record<string, TestReport[]> = {
  'MHR-01-2024-7': [
    {
      id: 'tr-1',
      date: '2024-01-15',
      type: 'Blood Tests',
      snippet: 'HbA1c: 8.2%, FBS: 145 mg/dL',
      content: `Laboratory Report
Date: 15-Jan-2024

HbA1c: 8.2% (Reference: <7%)
FBS: 145 mg/dL (Reference: 70-100)
Creatinine: 1.1 mg/dL (Reference: 0.7-1.3)
LDL: 125 mg/dL (Reference: <100)
BP: 138/88 mmHg`,
    },
    {
      id: 'tr-2',
      date: '2024-01-08',
      type: 'Blood Tests',
      snippet: 'HbA1c: 8.5%, FBS: 158 mg/dL',
      content: `Laboratory Report
Date: 08-Jan-2024

HbA1c: 8.5%
FBS: 158 mg/dL
Creatinine: 1.2 mg/dL`,
    },
  ],
  'MHR-01-2024-8': [
    {
      id: 'tr-3',
      date: '2024-01-14',
      type: 'Blood Tests',
      snippet: 'FBS: 198 mg/dL, pending HbA1c',
      content: `Laboratory Report
Date: 14-Jan-2024

FBS: 198 mg/dL (Reference: 70-100)
HbA1c: 9.1% (Reference: <7%)
Creatinine: 0.9 mg/dL (Reference: 0.7-1.3)
Thyroid profile: Within normal limits`,
    },
  ],
  'MHR-01-2024-A': [
    {
      id: 'tr-4',
      date: '2024-01-16',
      type: 'Blood Tests',
      snippet: 'Complete blood count, normal results',
      content: `Laboratory Report
Date: 16-Jan-2024

Hemoglobin: 11.8 g/dL (Reference: 12-15)
WBC: 8200/μL (Reference: 4000-11000)
Platelets: 245000/μL (Reference: 150000-450000)
Blood Group: O Positive`,
    },
  ],
  'MHR-01-2024-H': [
    {
      id: 'tr-5',
      date: '2024-01-05',
      type: 'Blood Tests',
      snippet: 'Lipid profile, elevated cholesterol',
      content: `Laboratory Report
Date: 05-Jan-2024

FBS: 98 mg/dL (Reference: 70-100)
LDL: 145 mg/dL (Reference: <100)
HDL: 38 mg/dL (Reference: >40)
Triglycerides: 185 mg/dL (Reference: <150)
Creatinine: 1.3 mg/dL (Reference: 0.7-1.3)
BP: 152/94 mmHg`,
    },
  ],
};

// ============================================
// BACKEND INTEGRATION GUIDE
// ============================================
// To connect to your backend API, replace these functions with actual API calls.
// 
// Example with fetch:
// export async function searchPatients(query: string): Promise<Patient[]> {
//   const response = await fetch(`${API_BASE_URL}/patients/search?q=${encodeURIComponent(query)}`);
//   if (!response.ok) throw new Error('Search failed');
//   return response.json();
// }
//
// Example with Supabase:
// import { supabase } from '@/lib/supabase';
// export async function searchPatients(query: string): Promise<Patient[]> {
//   const { data, error } = await supabase
//     .from('patients')
//     .select('*')
//     .or(`id.eq.${query},name.ilike.%${query}%`)
//     .limit(8);
//   if (error) throw error;
//   return data;
// }
// ============================================

export async function searchPatients(query: string): Promise<Patient[]> {
  // Simulate API delay (remove this in production)
  await new Promise(resolve => setTimeout(resolve, 250));

  const normalizedQuery = query.toLowerCase().trim();
  
  // Check if it's a patient ID
  const idPattern = /^[A-Z]{3}-\d{2}-\d{4}-[0-9X]$/i;
  if (idPattern.test(query)) {
    const patient = mockPatients.find(p => p.id.toLowerCase() === normalizedQuery);
    return patient ? [{ ...patient, confidence: 1.0 }] : [];
  }

  // Search by name
  if (normalizedQuery.length < 2) return [];
  
  return mockPatients
    .filter(p => p.name.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 8); // Limit to 8 results
}

export async function getPatient(id: string): Promise<Patient | null> {
  // Simulate API delay (remove in production)
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // BACKEND: Replace with: 
  // const response = await fetch(`${API_BASE_URL}/patients/${id}`);
  // return response.json();
  
  return mockPatients.find(p => p.id === id) || null;
}

export async function getDoctorReports(patientId: string): Promise<DoctorReport[]> {
  // Simulate API delay (remove in production)
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // BACKEND: Replace with:
  // const response = await fetch(`${API_BASE_URL}/patients/${patientId}/doctor-reports`);
  // return response.json();
  
  return mockDoctorReports[patientId] || [];
}

export async function getTestReports(patientId: string): Promise<TestReport[]> {
  // Simulate API delay (remove in production)
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // BACKEND: Replace with:
  // const response = await fetch(`${API_BASE_URL}/patients/${patientId}/test-reports`);
  // return response.json();
  
  return mockTestReports[patientId] || [];
}
