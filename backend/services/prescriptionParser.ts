import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: string;
}

export interface PrescriptionData {
  medications: Medication[];
  doctorName?: string;
  date?: string;
  patientName?: string;
  diagnosis?: string;
  additionalNotes?: string;
}

/**
 * Parse prescription from image or PDF using Gemini Vision
 */
export async function parsePrescription(
  imageBuffer: Buffer,
  mimeType: string
): Promise<PrescriptionData> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const base64Data = imageBuffer.toString('base64');

  const prompt = `You are an expert medical AI assistant. Analyze this prescription image and extract all medication information accurately.

Extract the following information:

1. **Medications**: For each medication, extract:
   - Medication name (generic or brand name)
   - Dosage (e.g., "500mg", "10ml", "1 tablet")
   - Frequency (e.g., "twice daily", "once a day", "every 8 hours")
   - Duration (e.g., "7 days", "2 weeks", "as needed")
   - Instructions (e.g., "after meals", "before bedtime", "with water")
   - Quantity (if mentioned)

2. **Prescription Details**:
   - Doctor's name
   - Date of prescription
   - Patient name (if visible)
   - Diagnosis or condition
   - Any additional notes or instructions

Return the response as a JSON object with this exact structure (no markdown, just pure JSON):
{
  "medications": [
    {
      "name": "Medication Name",
      "dosage": "Dosage information",
      "frequency": "Frequency (e.g., twice daily)",
      "duration": "Duration (e.g., 7 days)",
      "instructions": "Special instructions if any",
      "quantity": "Quantity if mentioned"
    }
  ],
  "doctorName": "Doctor's name if visible",
  "date": "Prescription date if visible",
  "patientName": "Patient name if visible",
  "diagnosis": "Diagnosis or condition if mentioned",
  "additionalNotes": "Any additional notes or instructions"
}

Important:
- Extract ALL medications visible in the prescription
- Be accurate with dosages and frequencies
- If information is not visible, use null or empty string
- Handle both handwritten and printed prescriptions
- Extract generic names when possible, but preserve brand names if that's what's written`;

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  try {
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response
    let prescriptionData: PrescriptionData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      
      // Clean up the JSON text
      let cleanedJson = jsonText.trim();
      cleanedJson = cleanedJson.replace(/^\s+|\s+$/g, '');
      
      prescriptionData = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Full response text:', text);
      
      // If direct parse fails, try to extract JSON object
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          prescriptionData = JSON.parse(jsonMatch[0]);
        } catch (secondParseError) {
          throw new Error(`Failed to parse prescription data. Response preview: ${text.substring(0, 200)}...`);
        }
      } else {
        throw new Error(`Failed to parse prescription data. No JSON object found. Response preview: ${text.substring(0, 200)}...`);
      }
    }

    // Validate and normalize the response
    if (!prescriptionData.medications || !Array.isArray(prescriptionData.medications)) {
      prescriptionData.medications = [];
    }

    // Ensure all medications have required fields
    prescriptionData.medications = prescriptionData.medications.map((med: any) => ({
      name: med.name || 'Unknown Medication',
      dosage: med.dosage || '',
      frequency: med.frequency || '',
      duration: med.duration || '',
      instructions: med.instructions || '',
      quantity: med.quantity || '',
    }));

    return prescriptionData;
  } catch (error) {
    console.error('Prescription parsing error:', error);
    throw new Error(`Failed to parse prescription: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse prescription from PDF text
 */
export async function parsePrescriptionFromText(text: string): Promise<PrescriptionData> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are an expert medical AI assistant. Analyze this prescription text and extract all medication information accurately.

Extracted text from prescription:
${text.substring(0, 100000)} // Limit to 100k chars

Extract the following information:

1. **Medications**: For each medication, extract:
   - Medication name (generic or brand name)
   - Dosage (e.g., "500mg", "10ml", "1 tablet")
   - Frequency (e.g., "twice daily", "once a day", "every 8 hours")
   - Duration (e.g., "7 days", "2 weeks", "as needed")
   - Instructions (e.g., "after meals", "before bedtime", "with water")
   - Quantity (if mentioned)

2. **Prescription Details**:
   - Doctor's name
   - Date of prescription
   - Patient name (if visible)
   - Diagnosis or condition
   - Any additional notes or instructions

Return the response as a JSON object with this exact structure (no markdown, just pure JSON):
{
  "medications": [
    {
      "name": "Medication Name",
      "dosage": "Dosage information",
      "frequency": "Frequency (e.g., twice daily)",
      "duration": "Duration (e.g., 7 days)",
      "instructions": "Special instructions if any",
      "quantity": "Quantity if mentioned"
    }
  ],
  "doctorName": "Doctor's name if visible",
  "date": "Prescription date if visible",
  "patientName": "Patient name if visible",
  "diagnosis": "Diagnosis or condition if mentioned",
  "additionalNotes": "Any additional notes or instructions"
}

Important:
- Extract ALL medications visible in the prescription
- Be accurate with dosages and frequencies
- If information is not visible, use null or empty string
- Handle both handwritten and printed prescriptions`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();

    // Parse JSON from response
    let prescriptionData: PrescriptionData;
    try {
      const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/) || textResponse.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : textResponse;
      let cleanedJson = jsonText.trim();
      cleanedJson = cleanedJson.replace(/^\s+|\s+$/g, '');
      
      prescriptionData = JSON.parse(cleanedJson);
    } catch (parseError) {
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        prescriptionData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Failed to parse prescription data. Response preview: ${textResponse.substring(0, 200)}...`);
      }
    }

    // Validate and normalize
    if (!prescriptionData.medications || !Array.isArray(prescriptionData.medications)) {
      prescriptionData.medications = [];
    }

    prescriptionData.medications = prescriptionData.medications.map((med: any) => ({
      name: med.name || 'Unknown Medication',
      dosage: med.dosage || '',
      frequency: med.frequency || '',
      duration: med.duration || '',
      instructions: med.instructions || '',
      quantity: med.quantity || '',
    }));

    return prescriptionData;
  } catch (error) {
    console.error('Prescription parsing error:', error);
    throw new Error(`Failed to parse prescription: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

