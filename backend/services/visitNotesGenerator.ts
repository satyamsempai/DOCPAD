import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model: GenerativeModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

const VISIT_NOTE_PROMPT = `You are an expert medical documentation AI assistant. Your task is to convert a doctor's brief clinical notes (which may be informal, incomplete, or in point form) into a comprehensive, professional, and structured visit note following SOAP format (Subjective, Objective, Assessment, Plan).

The doctor's input may include:
- Brief notes about the patient's complaint
- Observations from physical examination
- Diagnosis or assessment
- Treatment plan or medications
- Any other relevant clinical information

Your task is to structure this into a professional medical visit note with the following sections:

1. **Chief Complaint**: A concise statement of why the patient is seeking care
2. **History of Present Illness (HPI)**: Detailed narrative of the current problem, including:
   - Onset, duration, and course of symptoms
   - Location, quality, and severity
   - Aggravating and relieving factors
   - Associated symptoms
   - Previous treatments tried

3. **Physical Examination**: Structured examination findings including:
   - Vital signs (if mentioned)
   - General appearance
   - System-specific findings (cardiovascular, respiratory, abdominal, neurological, etc.)
   - Any relevant positive or negative findings

4. **Assessment**: Clinical impression/diagnosis with:
   - Primary diagnosis
   - Differential diagnoses (if applicable)
   - Clinical reasoning

5. **Plan**: Comprehensive management plan including:
   - Medications prescribed (name, dosage, frequency, duration, instructions)
   - Laboratory tests ordered
   - Imaging studies ordered
   - Specialist referrals
   - Patient education
   - Follow-up instructions
   - Next visit date (if mentioned)

Guidelines:
- Use professional medical terminology
- Be comprehensive but concise
- If information is missing, indicate it appropriately (e.g., "Not documented" or "To be assessed")
- Ensure medications are clearly specified with dosages and frequencies
- Include relevant clinical context
- Maintain accuracy to the doctor's input
- Use proper medical formatting and structure

Return the response as a JSON object with this exact structure (no markdown, just pure JSON):
{
  "chiefComplaint": "Clear, concise chief complaint",
  "historyOfPresentIllness": "Detailed HPI narrative",
  "physicalExamination": "Structured examination findings",
  "assessment": "Clinical impression with reasoning",
  "plan": "Comprehensive management plan",
  "medications": [
    {
      "name": "Medication name",
      "dosage": "Dosage (e.g., 500mg)",
      "frequency": "Frequency (e.g., twice daily)",
      "duration": "Duration (e.g., 7 days)",
      "instructions": "Special instructions (e.g., after meals)"
    }
  ],
  "followUpInstructions": "Detailed follow-up instructions",
  "nextVisitDate": "YYYY-MM-DD format or null if not specified"
}

If a section cannot be determined from the input, use an appropriate placeholder like "Not documented" or "To be assessed" rather than making up information.`;

export async function generateVisitNote(
  doctorInput: string,
  patientContext?: PatientContext
): Promise<VisitNote> {
  try {
    // Build context-aware prompt
    let fullPrompt = VISIT_NOTE_PROMPT;
    
    if (patientContext) {
      fullPrompt += `\n\nPatient Context:\n`;
      fullPrompt += `- Name: ${patientContext.name}\n`;
      if (patientContext.age) fullPrompt += `- Age: ${patientContext.age}\n`;
      if (patientContext.sex) fullPrompt += `- Sex: ${patientContext.sex}\n`;
      if (patientContext.pastMedicalHistory && patientContext.pastMedicalHistory.length > 0) {
        fullPrompt += `- Past Medical History: ${patientContext.pastMedicalHistory.join(', ')}\n`;
      }
      if (patientContext.currentMedications && patientContext.currentMedications.length > 0) {
        fullPrompt += `- Current Medications: ${patientContext.currentMedications.map(m => `${m.name} ${m.dosage}`).join(', ')}\n`;
      }
      if (patientContext.recentTestResults) {
        fullPrompt += `- Recent Test Results: ${patientContext.recentTestResults}\n`;
      }
      if (patientContext.allergies && patientContext.allergies.length > 0) {
        fullPrompt += `- Allergies: ${patientContext.allergies.join(', ')}\n`;
      }
    }
    
    fullPrompt += `\n\nDoctor's Clinical Notes:\n${doctorInput}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    let text = response.text();
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    
    // Clean up the JSON text
    let cleanedJson = jsonText.trim();
    cleanedJson = cleanedJson.replace(/^\s+|\s+$/g, '');
    
    const visitNote: VisitNote = JSON.parse(cleanedJson);
    return visitNote;
  } catch (error) {
    console.error('Error generating visit note:', error);
    throw new Error(`Failed to generate visit note: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

