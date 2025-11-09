import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY);

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

const SYMPTOM_ANALYSIS_PROMPT = `You are an expert medical AI assistant. Analyze the patient's symptoms and provide comprehensive medical advice, treatment recommendations, and guidance on whether they need to see a doctor.

IMPORTANT GUIDELINES:
1. Be thorough but practical in your analysis
2. Provide evidence-based recommendations
3. Always err on the side of caution for serious symptoms
4. Consider common conditions first, but don't ignore serious possibilities
5. Provide clear, actionable advice
6. Recommend doctor visit for:
   - Severe symptoms (high fever, chest pain, difficulty breathing, severe pain)
   - Symptoms lasting more than a few days without improvement
   - Chronic or recurring symptoms
   - Symptoms affecting daily activities
   - Any red flag symptoms

Analyze the following patient input and provide:

1. **Symptoms Identified**: List all symptoms mentioned
2. **Severity Assessment**: Overall severity (mild, moderate, severe, critical)
3. **Potential Conditions**: Possible diagnoses with likelihood and brief explanation
4. **Medical Advice**: General advice for the condition
5. **Recommended Medications**: Over-the-counter or common medications (with dosages if appropriate)
6. **Self-Care Recommendations**: Home remedies, lifestyle changes, rest advice
7. **Doctor Visit Recommendation**: Whether a doctor visit is needed and urgency level
8. **Warning Signs**: Red flag symptoms to watch for
9. **Follow-Up Instructions**: What to do next, when to seek help

Return the response as a JSON object with this exact structure (no markdown, just pure JSON):
{
  "symptoms": ["symptom1", "symptom2"],
  "severity": "mild" | "moderate" | "severe" | "critical",
  "potentialConditions": [
    {
      "condition": "Condition Name",
      "likelihood": "low" | "moderate" | "high" | "very high",
      "explanation": "Why this condition is possible"
    }
  ],
  "advice": ["Advice point 1", "Advice point 2"],
  "recommendedMedications": [
    {
      "name": "Medication Name",
      "dosage": "Dosage if applicable (e.g., 500mg)",
      "frequency": "Frequency if applicable (e.g., twice daily)",
      "indication": "Why this medication is recommended",
      "note": "Important notes or warnings"
    }
  ],
  "selfCareRecommendations": ["Self-care tip 1", "Self-care tip 2"],
  "doctorVisitRecommended": true | false,
  "doctorVisitUrgency": "routine" | "soon" | "urgent" | "emergency",
  "doctorVisitReason": "Clear explanation of why doctor visit is recommended",
  "warningSigns": ["Warning sign 1", "Warning sign 2"],
  "followUpInstructions": "Detailed follow-up instructions"
}

If the condition is severe or critical, doctorVisitRecommended MUST be true and doctorVisitUrgency should be "urgent" or "emergency".

Be specific and practical in your recommendations. Only suggest medications that are commonly available over-the-counter or commonly prescribed for the condition. Always include warnings about when to seek immediate medical attention.`;

export async function analyzeSymptoms(patientInput: string, patientContext?: {
  age?: number;
  sex?: string;
  existingConditions?: string[];
  currentMedications?: string[];
  allergies?: string[];
}): Promise<SymptomAnalysis> {
  try {
    let fullPrompt = SYMPTOM_ANALYSIS_PROMPT;
    
    if (patientContext) {
      fullPrompt += `\n\nPatient Context:\n`;
      if (patientContext.age) fullPrompt += `- Age: ${patientContext.age}\n`;
      if (patientContext.sex) fullPrompt += `- Sex: ${patientContext.sex}\n`;
      if (patientContext.existingConditions && patientContext.existingConditions.length > 0) {
        fullPrompt += `- Existing Conditions: ${patientContext.existingConditions.join(', ')}\n`;
      }
      if (patientContext.currentMedications && patientContext.currentMedications.length > 0) {
        fullPrompt += `- Current Medications: ${patientContext.currentMedications.join(', ')}\n`;
      }
      if (patientContext.allergies && patientContext.allergies.length > 0) {
        fullPrompt += `- Allergies: ${patientContext.allergies.join(', ')}\n`;
      }
    }
    
    fullPrompt += `\n\nPatient's Symptom Description:\n${patientInput}`;
    
    // Try different model names - newer API versions may use different names
    // Try with and without version suffixes
    const modelNames = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-pro',
      'gemini-pro-latest',
      'models/gemini-1.5-flash',
      'models/gemini-1.5-pro',
      'models/gemini-pro'
    ];
    let lastError: Error | null = null;
    
    for (const modelName of modelNames) {
      try {
        console.log(`Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        let text = response.text();
        
        console.log(`Successfully used model: ${modelName}`);
        
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : text;
        
        // Clean up the JSON text
        let cleanedJson = jsonText.trim();
        cleanedJson = cleanedJson.replace(/^\s+|\s+$/g, '');
        
        const analysis: SymptomAnalysis = JSON.parse(cleanedJson);
        return analysis;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`Model ${modelName} failed: ${errorMsg}`);
        lastError = error instanceof Error ? error : new Error(String(error));
        // Continue to next model
        continue;
      }
    }
    
    // If all models failed, provide helpful error message
    const errorDetails = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`All Gemini models failed. Please check your API key and ensure you have access to Gemini models. Last error: ${errorDetails}. Try checking available models in Google AI Studio.`);
  } catch (error) {
    console.error('Error analyzing symptoms:', error);
    
    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        throw new Error(`Gemini model not found. Please check your API key and ensure you have access to Gemini models. Error: ${error.message}`);
      } else if (error.message.includes('API key')) {
        throw new Error(`Invalid API key. Please check your GOOGLE_AI_API_KEY environment variable. Error: ${error.message}`);
      } else {
        throw new Error(`Failed to analyze symptoms: ${error.message}`);
      }
    }
    
    throw new Error(`Failed to analyze symptoms: ${String(error)}`);
  }
}

