import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadModel } from './services/modelTrainer';
import { predict, generateRecommendations, LabValues } from './services/predictor';
import { RAGService } from './services/ragService';
import { generateAlertsFromAnalysis } from './services/alertGenerator';
import { authenticate, authorize } from './middleware/auth';
import { findUserByEmail, verifyPassword, getUserTokenPayload, updateLastLogin } from './services/userService';
import { findPatientByPatientId, findPatientByEmail, verifyPatientPassword, updatePatientLastLogin } from './services/patientService';
import { generateAccessToken, generateRefreshToken } from './services/jwtService';
import { logAuthEvent, logDataAccess } from './services/auditLogger';
import { parsePrescription, parsePrescriptionFromText } from './services/prescriptionParser';
import { checkDrugInteractions } from './services/drugInteractionChecker';
import { generateVisitNote, PatientContext } from './services/visitNotesGenerator';
import { analyzeSymptoms } from './services/symptomAnalyzer';

// Import pdf-parse using require for CommonJS compatibility
const pdfParse = require('pdf-parse');

// Load environment variables
dotenv.config();

// Validate API key
if (!process.env.GOOGLE_AI_API_KEY) {
  console.error('ERROR: GOOGLE_AI_API_KEY is not set in environment variables');
  console.error('Please create a .env file in the backend directory with:');
  console.error('GOOGLE_AI_API_KEY=your_api_key_here');
  process.exit(1);
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
}));
app.use(express.json());

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Initialize RAG Service for medical knowledge retrieval
const ragService = new RAGService(process.env.GOOGLE_AI_API_KEY);
ragService.initialize().catch(err => {
  console.error('Failed to initialize RAG service:', err);
});

// List of models to try in order (newest first, then fallback to older models)
// Note: Model names may vary - the system will try all until one works
const AVAILABLE_MODELS = [
  'gemini-2.5-flash',          // Gemini 2.5 Flash (if you have access)
  'gemini-2.0-flash-exp',      // Gemini 2.0 Flash (experimental)
  'gemini-2.0-flash-thinking-exp', // Gemini 2.0 Flash Thinking
  'gemini-1.5-flash-latest',   // Latest 1.5 Flash
  'gemini-1.5-flash',          // Stable 1.5 Flash
  'gemini-1.5-pro-latest',     // Latest 1.5 Pro
  'gemini-1.5-pro',            // Stable 1.5 Pro
  'gemini-pro',                 // Legacy Pro
];

// Function to find a working model
async function findWorkingModel(): Promise<string | null> {
  console.log('Testing available Gemini models...');
  for (const modelName of AVAILABLE_MODELS) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const testModel = genAI.getGenerativeModel({ model: modelName });
      // Try a simple test call
      const result = await testModel.generateContent('test');
      await result.response;
      console.log(`✅ Model ${modelName} is available and working`);
      return modelName;
    } catch (error) {
      console.log(`❌ Model ${modelName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      continue;
    }
  }
  return null;
}

// Find working model on startup
let workingModel: string | null = null;
findWorkingModel().then(model => {
  if (model) {
    workingModel = model;
    console.log(`✅ Using model: ${model}`);
  } else {
    console.error('❌ No working Gemini models found. Please check your API key.');
  }
});

// Use Gemini models - will be set dynamically based on availability
let visionModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
let textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Helper to get model with fallback on error
async function callWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  errorMsg: string
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    console.warn(`${errorMsg}, trying fallback model...`);
    try {
      return await fallback();
    } catch (fallbackError) {
      throw new Error(`${errorMsg}. Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
    }
  }
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Load trained model (if available)
const MODEL_PATH = path.join(__dirname, 'data', 'trained-model.json');
let trainedModel: any = null;

try {
  if (fs.existsSync(MODEL_PATH)) {
    trainedModel = loadModel(MODEL_PATH);
    console.log('✅ Trained heart disease model loaded successfully');
    console.log(`📊 Model accuracy: ${((trainedModel.accuracy || 0) * 100).toFixed(2)}%`);
  } else {
    console.warn('⚠️  Trained model not found. Run "npm run train" to train the model from heart.csv');
    console.warn('   Analysis will use Gemini AI only (no model-based predictions)');
  }
} catch (error) {
  console.warn('⚠️  Failed to load trained model:', error);
  console.warn('   Analysis will use Gemini AI only');
}

// Configure multer for file uploads
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload an image (JPG, PNG, WebP) or PDF file.'));
    }
  },
});

// Provider login endpoint (admin/doctor/nurse)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Email and password are required' 
      });
    }

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      logAuthEvent('login_failed', undefined, email, false, 'User not found', req.ip, req.get('user-agent'));
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid email or password' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      logAuthEvent('login_failed', user.id, user.email, false, 'User account is inactive', req.ip, req.get('user-agent'));
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Account is inactive. Please contact administrator.' 
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      logAuthEvent('login_failed', user.id, user.email, false, 'Invalid password', req.ip, req.get('user-agent'));
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid email or password' 
      });
    }

    // Generate tokens
    const tokenPayload = getUserTokenPayload(user);
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update last login
    await updateLastLogin(user.id);

    // Log successful login
    logAuthEvent('login', user.id, user.email, true, undefined, req.ip, req.get('user-agent'));

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        userType: 'provider',
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to process login request' 
    });
  }
});

// Patient login endpoint
app.post('/api/auth/patient/login', async (req, res) => {
  try {
    const { patientId, password } = req.body;

    if (!patientId || !password) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Patient ID and password are required' 
      });
    }

    // Find patient by patient ID
    const patient = await findPatientByPatientId(patientId);
    if (!patient) {
      logAuthEvent('login_failed', undefined, patientId, false, 'Patient not found', req.ip, req.get('user-agent'));
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid Patient ID or password' 
      });
    }

    // Check if patient is active
    if (!patient.isActive) {
      logAuthEvent('login_failed', patient.id, patient.patientId, false, 'Patient account is inactive', req.ip, req.get('user-agent'));
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Account is inactive. Please contact administrator.' 
      });
    }

    // Check if patient has password set
    if (!patient.passwordHash) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Password not set. Please contact administrator to set up your account.' 
      });
    }

    // Verify password
    const isValidPassword = await verifyPatientPassword(password, patient.passwordHash);
    if (!isValidPassword) {
      logAuthEvent('login_failed', patient.id, patient.patientId, false, 'Invalid password', req.ip, req.get('user-agent'));
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid Patient ID or password' 
      });
    }

    // Generate tokens with patient role
    const tokenPayload = {
      userId: patient.id,
      email: patient.email || patient.patientId,
      role: 'patient' as const,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update last login
    await updatePatientLastLogin(patient.patientId);

    // Log successful login
    logAuthEvent('login', patient.id, patient.patientId, true, undefined, req.ip, req.get('user-agent'));

    res.json({
      success: true,
      user: {
        id: patient.id,
        email: patient.email,
        name: patient.name,
        role: 'patient',
        patientId: patient.patientId,
        userType: 'patient',
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Patient login error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to process login request' 
    });
  }
});

// Get current user (protected)
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const userRole = req.user!.role;
    
    if (userRole === 'patient') {
      // Get patient info
      const { findPatientById } = await import('./services/patientService');
      const patient = await findPatientById(req.user!.userId);
      
      if (!patient) {
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'Patient not found' 
        });
      }

      res.json({
        id: patient.id,
        email: patient.email,
        name: patient.name,
        role: 'patient',
        patientId: patient.patientId,
        userType: 'patient',
        lastLogin: patient.lastLogin,
      });
    } else {
      // Get provider info
      const { findUserById } = await import('./services/userService');
      const user = await findUserById(req.user!.userId);
      
      if (!user) {
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'User not found' 
        });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        userType: 'provider',
        lastLogin: user.lastLogin,
      });
    }
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to get user information' 
    });
  }
});

// Refresh token endpoint
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Refresh token is required' 
      });
    }

    const { verifyRefreshToken } = await import('./services/jwtService');
    
    const payload = verifyRefreshToken(refreshToken);
    
    let newAccessToken: string;
    
    if (payload.role === 'patient') {
      // Handle patient token refresh
      const { findPatientById } = await import('./services/patientService');
      const patient = await findPatientById(payload.userId);
      
      if (!patient || !patient.isActive) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Invalid refresh token' 
        });
      }
      
      const tokenPayload = {
        userId: patient.id,
        email: patient.email || patient.patientId,
        role: 'patient' as const,
      };
      newAccessToken = generateAccessToken(tokenPayload);
      
      // Log patient token refresh
      logAuthEvent('token_refresh', patient.id, patient.email || patient.patientId, true, undefined, req.ip, req.get('user-agent'));
    } else {
      // Handle provider token refresh
      const { findUserById, getUserTokenPayload } = await import('./services/userService');
      const user = await findUserById(payload.userId);
      
      if (!user || !user.isActive) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Invalid refresh token' 
        });
      }
      
      const tokenPayload = getUserTokenPayload(user);
      newAccessToken = generateAccessToken(tokenPayload);
      
      logAuthEvent('token_refresh', user.id, user.email, true, undefined, req.ip, req.get('user-agent'));
    }

    res.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or expired refresh token' 
    });
  }
});

// Logout endpoint (client-side token removal, but we log it)
app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    logAuthEvent('logout', req.user!.userId, req.user!.email, true, undefined, req.ip, req.get('user-agent'));
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to logout' 
    });
  }
});

// RAG Knowledge Base Management Endpoint
app.get('/api/rag/stats', authenticate, async (req, res) => {
  try {
    const stats = ragService.getStats();
    res.json({
      status: 'ok',
      ...stats
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get RAG stats' });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  // Test API key and model availability
  let geminiStatus = 'unknown';
  let availableModel = null;
  
  if (workingModel) {
    geminiStatus = 'working';
    availableModel = workingModel;
  } else {
    // Try to find a working model
    const model = await findWorkingModel();
    if (model) {
      workingModel = model;
      geminiStatus = 'working';
      availableModel = model;
    } else {
      geminiStatus = 'failed';
    }
  }
  
  res.json({ 
    status: 'ok', 
    message: 'Backend server is running',
    modelLoaded: trainedModel !== null,
    modelAccuracy: trainedModel?.accuracy ? ((trainedModel.accuracy * 100).toFixed(2) + '%') : null,
    gemini: {
      status: geminiStatus,
      model: availableModel,
    },
  });
});

// Upload and analyze test report endpoint (protected)
app.post('/api/patients/:patientId/test-reports/upload', authenticate, upload.single('file'), async (req, res) => {
  let filePath: string | null = null;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { patientId } = req.params;
    filePath = req.file.path;
    const fileType = req.file.mimetype;

    console.log(`Processing upload for patient ${patientId}, file type: ${fileType}`);

    // Step 1: Extract initial test values for RAG retrieval (if image, we'll do this after OCR)
    // For now, we'll retrieve knowledge after getting initial analysis
    // This is a two-pass approach: first get test values, then retrieve relevant knowledge, then final analysis

    // Create comprehensive prompt for Gemini to analyze ANY disease type
    let basePrompt = `You are an expert medical AI assistant. Analyze this medical test report comprehensively and provide detailed analysis for ANY type of disease or condition found.

IMPORTANT: Analyze ALL types of diseases and conditions, not limited to any specific dataset. Consider:
- Cardiovascular diseases (hypertension, heart disease, cholesterol issues)
- Metabolic disorders (diabetes, thyroid, kidney function)
- Liver diseases (hepatitis, liver function)
- Blood disorders (anemia, clotting issues)
- Infections (bacterial, viral markers)
- Autoimmune conditions
- Cancer markers
- Hormonal imbalances
- Nutritional deficiencies
- Any other conditions indicated by the test results

Extract and analyze:

1. ALL lab test values with their:
   - Test name
   - Value (numeric)
   - Unit
   - Reference/normal range
   - Severity assessment (normal, moderate, high, critical)
   - Clinical significance

2. Disease Analysis:
   - Identify ALL potential diseases/conditions suggested by abnormal values
   - For each condition, provide:
     * Condition name
     * Likelihood/confidence level
     * Explanation of why this condition is suspected
     * Severity of the condition (Low, Moderate, High, Critical)

3. Overall Health Assessment:
   - Overall severity (Low, Moderate, High, Critical)
   - Summary of health status
   - Most concerning findings
   - Areas that need immediate attention

4. Detailed Medical Analysis:
   - Comprehensive explanation of what the results mean
   - How each abnormal value relates to potential diseases
   - Clinical interpretation of the findings
   - Risk factors identified

5. Recommended Medications:
   - Specific medication names with dosages (if applicable)
   - Indication for each medication
   - Important: Only suggest medications if clearly indicated by the test results
   - Include both prescription and over-the-counter options where appropriate

6. Comprehensive Precautions & Lifestyle Recommendations:
   - Dietary modifications (specific foods to avoid/include)
   - Exercise recommendations
   - Lifestyle changes needed
   - Monitoring requirements (what to track, how often)
   - Warning signs to watch for
   - When to seek immediate medical attention
   - Follow-up testing recommendations

7. Additional Recommendations:
   - Specialist referrals needed (if any)
   - Further diagnostic tests recommended
   - Preventive measures

Return the response as a JSON object with this exact structure (no markdown, just pure JSON):
{
  "extractedData": {
    "tests": [
      {
        "name": "Test Name",
        "value": number,
        "unit": "unit",
        "referenceRange": "normal range description",
        "severity": "normal" | "moderate" | "high" | "critical",
        "clinicalSignificance": "What this value means clinically"
      }
    ],
    "overallSeverity": "Low" | "Moderate" | "High" | "Critical",
    "identifiedConditions": [
      {
        "conditionName": "Disease/Condition Name",
        "likelihood": "Low" | "Moderate" | "High" | "Very High",
        "explanation": "Why this condition is suspected",
        "severity": "Low" | "Moderate" | "High" | "Critical"
      }
    ]
  },
  "aiSummary": {
    "severityAssessment": "Comprehensive detailed explanation of overall health status and how concerning the results are",
    "diseaseAnalysis": "Detailed analysis of all potential diseases/conditions identified, with clinical interpretation",
    "deviationFromNormal": "Comprehensive explanation of how values deviate from normal ranges and what this means",
    "recommendedMedicines": [
      {
        "name": "Medication Name",
        "dosage": "Dosage information if applicable",
        "indication": "Why this medication is recommended"
      }
    ],
    "precautions": [
      "Specific precaution 1 with details",
      "Specific precaution 2 with details"
    ],
    "lifestyleRecommendations": {
      "diet": ["Dietary recommendation 1", "Dietary recommendation 2"],
      "exercise": ["Exercise recommendation 1", "Exercise recommendation 2"],
      "monitoring": ["What to monitor and how often"],
      "warningSigns": ["Warning signs to watch for"]
    },
    "additionalRecommendations": {
      "specialistReferrals": ["Specialist type if needed"],
      "furtherTests": ["Additional tests recommended"],
      "followUp": "Follow-up recommendations"
    }
  },
  "confidence": 0.85
}`;

    // Step 2: Retrieve relevant medical knowledge using RAG
    console.log('Retrieving relevant medical knowledge using RAG...');
    let retrievedKnowledge = '';
    
    try {
      // Retrieve knowledge based on common medical analysis needs
      // In a production system, you could do a two-pass: quick extraction first, then targeted retrieval
      const retrievalQuery = 'medical test analysis guidelines precautions medications disease management';
      const retrievalResult = await ragService.retrieveWithSemanticSearch(retrievalQuery, 5);
      
      if (retrievalResult.chunks.length > 0) {
        retrievedKnowledge = ragService.formatKnowledgeForPrompt(retrievalResult.chunks);
        console.log(`✅ Retrieved ${retrievalResult.chunks.length} relevant knowledge chunks for RAG`);
      }
    } catch (ragError) {
      console.warn('⚠️ RAG retrieval failed, continuing without retrieved knowledge:', ragError);
    }

    // Combine base prompt with retrieved knowledge
    const prompt = basePrompt + retrievedKnowledge;

    console.log('Calling Google Gemini API with RAG-enhanced context...');

    let text: string = '';

    // Handle PDFs differently - extract text first, then use text model
    if (fileType === 'application/pdf') {
      console.log('Processing PDF file...');
      try {
        const fileBuffer = fs.readFileSync(filePath);
        
        // Extract text from PDF
        console.log('Extracting text from PDF...');
        const pdfData = await pdfParse(fileBuffer);
        const extractedText = pdfData.text;
        
        if (!extractedText || extractedText.trim().length === 0) {
          console.warn('PDF appears to be image-based (scanned). Attempting to use vision model...');
          
          // If PDF is image-based, try to convert first page to image and use vision model
          // For now, throw a helpful error
          throw new Error('Could not extract text from PDF. The PDF might be image-based (scanned). Please try converting the PDF pages to images (JPG/PNG) and upload those instead.');
        }

        console.log(`Extracted ${extractedText.length} characters from PDF`);
        console.log('First 200 chars:', extractedText.substring(0, 200));

        // Use text model for PDFs with extracted text
        const fullPrompt = prompt + '\n\nExtracted text from PDF:\n' + extractedText.substring(0, 100000); // Limit to 100k chars to avoid token limits
        console.log('Sending to Gemini text model...');
        console.log(`Prompt length: ${fullPrompt.length} characters`);
        
        try {
          // Try multiple models until one works
          let lastError: Error | null = null;
          let success = false;
          
          for (const modelName of AVAILABLE_MODELS) {
            try {
              console.log(`Trying text model: ${modelName}...`);
              const model = genAI.getGenerativeModel({ model: modelName });
              const result = await model.generateContent(fullPrompt);
              const response = await result.response;
              text = response.text();
              console.log(`✅ Successfully used text model: ${modelName}`);
              workingModel = modelName; // Cache the working model
              success = true;
              break;
            } catch (error) {
              console.log(`❌ Text model ${modelName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
              lastError = error instanceof Error ? error : new Error('Unknown error');
              continue;
            }
          }
          
          if (!success) {
            throw lastError || new Error('All text models failed');
          }
        } catch (apiError) {
          console.error('Gemini API error:', apiError);
          if (apiError instanceof Error) {
            if (apiError.message.includes('quota') || apiError.message.includes('429')) {
              throw new Error('API quota exceeded. Please try again later.');
            }
            if (apiError.message.includes('permission') || apiError.message.includes('403')) {
              throw new Error('API permission denied. Please check your API key in backend/.env file.');
            }
            if (apiError.message.includes('404') || apiError.message.includes('not found')) {
              throw new Error('No Gemini models are available. Please check your API key and ensure you have access to Gemini models. Visit https://makersuite.google.com/app/apikey to verify your API key.');
            }
            if (apiError.message.includes('invalid') || apiError.message.includes('400')) {
              throw new Error(`Invalid API request: ${apiError.message}`);
            }
          }
          throw new Error(`Gemini API error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
        }
      } catch (pdfError) {
        console.error('PDF processing error:', pdfError);
        
        if (pdfError instanceof Error) {
          if (pdfError.message.includes('Could not extract text')) {
            throw pdfError;
          }
          // Check if it's a Gemini API error
          if (pdfError.message.includes('API') || pdfError.message.includes('quota') || pdfError.message.includes('permission')) {
            throw new Error(`Gemini API error: ${pdfError.message}`);
          }
          throw new Error(`Failed to process PDF: ${pdfError.message}`);
        }
        throw new Error(`Failed to process PDF: Unknown error`);
      }
    } else {
      // Handle images - use vision model
      console.log('Processing image file...');
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');

      // Prepare image part for Gemini
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: fileType,
        },
      };

      // Use vision model for images
      console.log('Sending to Gemini vision model...');
      
      // Try multiple models until one works
      let lastError: Error | null = null;
      let success = false;
      
      for (const modelName of AVAILABLE_MODELS) {
        try {
          console.log(`Trying model: ${modelName}...`);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([prompt, imagePart]);
          const response = await result.response;
          text = response.text();
          console.log(`✅ Successfully used model: ${modelName}`);
          workingModel = modelName; // Cache the working model
          success = true;
          break;
        } catch (error) {
          console.log(`❌ Model ${modelName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          lastError = error instanceof Error ? error : new Error('Unknown error');
          continue;
        }
      }
      
      if (!success) {
        console.error('All models failed. Last error:', lastError);
        if (lastError) {
          if (lastError.message.includes('quota') || lastError.message.includes('429')) {
            throw new Error('API quota exceeded. Please try again later.');
          }
          if (lastError.message.includes('permission') || lastError.message.includes('403')) {
            throw new Error('API permission denied. Please check your API key in backend/.env file.');
          }
          if (lastError.message.includes('404') || lastError.message.includes('not found')) {
            throw new Error('No Gemini models are available. Please check your API key and ensure you have access to Gemini models. Visit https://makersuite.google.com/app/apikey to verify your API key.');
          }
          if (lastError.message.includes('invalid') || lastError.message.includes('400')) {
            throw new Error(`Invalid API request: ${lastError.message}`);
          }
        }
        throw new Error(`All Gemini models failed. Please check your API key. Last error: ${lastError?.message || 'Unknown error'}`);
      }
    }

    // Ensure text was assigned
    if (!text || text.length === 0) {
      throw new Error('Failed to get response from Gemini API. No text was generated.');
    }

    console.log('Received response from Gemini, parsing...');
    console.log('Response length:', text.length);
    console.log('First 500 chars:', text.substring(0, 500));

    // Parse JSON from response
    let analysisData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      
      // Clean up the JSON text
      let cleanedJson = jsonText.trim();
      // Remove any leading/trailing whitespace or newlines
      cleanedJson = cleanedJson.replace(/^\s+|\s+$/g, '');
      
      analysisData = JSON.parse(cleanedJson);
      console.log('Successfully parsed JSON response');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Full response text:', text);
      
      // If direct parse fails, try to extract JSON object
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysisData = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed JSON from extracted match');
        } catch (secondParseError) {
          console.error('Second parse attempt failed:', secondParseError);
          throw new Error(`Failed to parse AI response as JSON. The AI may not have returned valid JSON. Response preview: ${text.substring(0, 200)}...`);
        }
      } else {
        throw new Error(`Failed to parse AI response. No JSON object found in response. Response preview: ${text.substring(0, 200)}...`);
      }
    }

    // Validate the response structure
    if (!analysisData.extractedData || !analysisData.aiSummary) {
      throw new Error('Invalid response structure from AI');
    }

    // Normalize the response structure (handle both old and new formats)
    // Ensure backward compatibility while supporting new comprehensive format
    const normalizedAnalysis = {
      ...analysisData,
      extractedData: {
        ...analysisData.extractedData,
        // Ensure identifiedConditions exists (new field)
        identifiedConditions: analysisData.extractedData.identifiedConditions || [],
        // Ensure tests have all required fields
        tests: (analysisData.extractedData.tests || []).map((test: any) => ({
          ...test,
          referenceRange: test.referenceRange || test.threshold || 'Not specified',
          clinicalSignificance: test.clinicalSignificance || 'No specific clinical significance noted',
        })),
      },
      aiSummary: {
        ...analysisData.aiSummary,
        // Ensure diseaseAnalysis exists (new field)
        diseaseAnalysis: analysisData.aiSummary.diseaseAnalysis || analysisData.aiSummary.severityAssessment || '',
        // Normalize recommendedMedicines (handle both string array and object array)
        // Keep as string array for backward compatibility with frontend
        recommendedMedicines: Array.isArray(analysisData.aiSummary.recommendedMedicines)
          ? analysisData.aiSummary.recommendedMedicines.map((med: any) => 
              typeof med === 'string' ? med : `${med.name}${med.dosage ? ` (${med.dosage})` : ''}${med.indication ? ` - ${med.indication}` : ''}`
            )
          : [],
        // Ensure lifestyleRecommendations exists
        lifestyleRecommendations: analysisData.aiSummary.lifestyleRecommendations || {
          diet: [],
          exercise: [],
          monitoring: [],
          warningSigns: [],
        },
        // Ensure additionalRecommendations exists
        additionalRecommendations: analysisData.aiSummary.additionalRecommendations || {
          specialistReferrals: [],
          furtherTests: [],
          followUp: '',
        },
      },
    };

    // Use trained model for predictions if available (OPTIONAL - only for heart disease)
    // The comprehensive Gemini analysis is the primary source
    let finalAnalysis = normalizedAnalysis;
    
    // Optional: Use trained model ONLY for heart disease cases as supplementary info
    // The comprehensive Gemini analysis remains the PRIMARY source
    if (trainedModel) {
      try {
        // Check if heart-related tests are present
        const hasHeartRelatedTests = normalizedAnalysis.extractedData.tests.some((test: any) => {
          const testName = test.name.toLowerCase();
          return testName.includes('blood pressure') || 
                 testName.includes('bp') || 
                 testName.includes('cholesterol') || 
                 testName.includes('ldl') ||
                 testName.includes('heart rate');
        });

        if (hasHeartRelatedTests) {
          console.log('Heart-related tests detected. Adding supplementary heart disease risk assessment...');
          
          const labValues: LabValues = {
            age: 50, // Default - should fetch from patient data
            sex: 'M', // Default - should fetch from patient data
          };

          // Map extracted tests to lab values
          for (const test of normalizedAnalysis.extractedData.tests) {
            const testName = test.name.toLowerCase();
            if (testName.includes('blood pressure') || testName.includes('bp')) {
              const bpMatch = test.unit.match(/(\d+)\/(\d+)/);
              if (bpMatch) {
                labValues.bloodPressure = {
                  systolic: parseInt(bpMatch[1]),
                  diastolic: parseInt(bpMatch[2]),
                };
              }
            } else if (testName.includes('cholesterol') || testName.includes('ldl')) {
              labValues.cholesterol = test.value;
            } else if (testName.includes('fbs') || testName.includes('fasting blood sugar')) {
              labValues.fbs = test.value;
            } else if (testName.includes('heart rate') || testName.includes('thalach')) {
              labValues.maxHeartRate = test.value;
            }
          }

          const modelPrediction = predict(labValues, trainedModel);
          console.log(`Supplementary heart disease risk: ${modelPrediction.severity} (${(modelPrediction.probability * 100).toFixed(2)}% probability)`);

          // Add as supplementary info, don't override comprehensive analysis
          finalAnalysis = {
            ...normalizedAnalysis,
            modelPrediction: {
              probability: modelPrediction.probability,
              prediction: modelPrediction.prediction,
              severity: modelPrediction.severity,
              note: 'Supplementary heart disease risk assessment. Primary analysis is comprehensive AI review above.',
            },
          };
        }
      } catch (modelError) {
        console.error('Model prediction error (non-critical):', modelError);
        // Continue with comprehensive Gemini analysis
      }
    }

    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Generate report ID and date
    const reportId = `tr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const date = new Date().toISOString();

    // Generate alerts from analysis
    const alerts = generateAlertsFromAnalysis({
      extractedData: finalAnalysis.extractedData,
      reportId,
    });

    console.log('Successfully processed report:', reportId);
    console.log(`Generated ${alerts.length} alerts`);

    // Log data access
    if (req.user) {
      logDataAccess(
        'create',
        'test_report',
        reportId,
        req.user.userId,
        req.user.email,
        true,
        undefined,
        req.ip,
        req.get('user-agent')
      );
    }

    // Return response
    res.json({
      reportId,
      date,
      extractedData: finalAnalysis.extractedData,
      aiSummary: finalAnalysis.aiSummary,
      confidence: finalAnalysis.confidence || 0.85,
      alerts: alerts, // Include alerts in response
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError);
      }
    }

    console.error('Error processing report:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Unknown error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific error types
      if (error.message.includes('Invalid file type')) {
        statusCode = 400;
      } else if (error.message.includes('Could not extract text from PDF')) {
        statusCode = 400;
      } else if (error.message.includes('Failed to parse PDF')) {
        statusCode = 400;
      } else if (error.message.includes('API') || error.message.includes('Gemini')) {
        statusCode = 502; // Bad Gateway for API errors
      }
    }
    
    res.status(statusCode).json({
      message: 'Failed to analyze report',
      error: errorMessage,
    });
  }
});

// Upload and analyze prescription endpoint (protected)
app.post('/api/patients/:patientId/prescriptions/upload', authenticate, upload.single('file'), async (req, res) => {
  let filePath: string | null = null;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { patientId } = req.params;
    filePath = req.file.path;
    const fileType = req.file.mimetype;

    console.log(`Processing prescription upload for patient ${patientId}, file type: ${fileType}`);

    let prescriptionData;

    // Handle PDFs differently - extract text first
    if (fileType === 'application/pdf') {
      console.log('Processing PDF prescription...');
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(fileBuffer);
        const extractedText = pdfData.text;

        if (!extractedText || extractedText.trim().length === 0) {
          // If PDF is image-based, use vision model
          console.log('PDF appears to be image-based. Using vision model...');
          prescriptionData = await parsePrescription(fileBuffer, fileType);
        } else {
          console.log(`Extracted ${extractedText.length} characters from PDF`);
          prescriptionData = await parsePrescriptionFromText(extractedText);
        }
      } catch (pdfError) {
        console.error('PDF processing error:', pdfError);
        throw new Error(`Failed to process PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
      }
    } else {
      // Handle images - use vision model
      console.log('Processing image prescription...');
      const fileBuffer = fs.readFileSync(filePath);
      prescriptionData = await parsePrescription(fileBuffer, fileType);
    }

    // Check for drug interactions
    const interactionCheck = checkDrugInteractions(prescriptionData.medications);

    // Generate prescription ID and date
    const prescriptionId = `pr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const date = new Date().toISOString();

    console.log('Successfully processed prescription:', prescriptionId);
    console.log(`Extracted ${prescriptionData.medications.length} medications`);

    // Log data access
    if (req.user) {
      logDataAccess(
        'create',
        'prescription',
        prescriptionId,
        req.user.userId,
        req.user.email,
        true,
        undefined,
        req.ip,
        req.get('user-agent')
      );
    }

    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Return response
    res.json({
      prescriptionId,
      date,
      ...prescriptionData,
      interactions: interactionCheck,
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError);
      }
    }

    console.error('Error processing prescription:', error);
    
    let errorMessage = 'Unknown error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('Invalid file type')) {
        statusCode = 400;
      } else if (error.message.includes('API') || error.message.includes('Gemini')) {
        statusCode = 502;
      }
    }
    
    res.status(statusCode).json({
      message: 'Failed to analyze prescription',
      error: errorMessage,
    });
  }
});

// Get prescriptions for a patient (protected)
app.get('/api/patients/:patientId/prescriptions', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // In production, fetch from database
    // For now, return empty array (will be populated when prescriptions are uploaded)
    res.json({
      prescriptions: [],
      message: 'Prescription history will be available after database integration',
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch prescriptions',
    });
  }
});

// Get current medications for a patient (protected)
app.get('/api/patients/:patientId/medications/current', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // In production, fetch from database and filter active medications
    // For now, return empty array
    res.json({
      medications: [],
      message: 'Current medications will be available after database integration',
    });
  } catch (error) {
    console.error('Error fetching current medications:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch current medications',
    });
  }
});

// Generate visit note from doctor's input (protected)
app.post('/api/patients/:patientId/visit-notes/generate', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { doctorInput, patientContext } = req.body;

    if (!doctorInput || typeof doctorInput !== 'string' || doctorInput.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Doctor input is required'
      });
    }

    console.log(`Generating visit note for patient ${patientId}`);

    // Generate structured visit note
    const visitNote = await generateVisitNote(doctorInput, patientContext || undefined);

    // Log data access
    if (req.user) {
      logDataAccess(
        'create',
        'visit_note',
        `visit-note-${patientId}-${Date.now()}`,
        req.user.userId,
        req.user.email,
        true,
        undefined,
        req.ip,
        req.get('user-agent')
      );
    }

    res.json({
      success: true,
      visitNote,
    });
  } catch (error) {
    console.error('Error generating visit note:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to generate visit note'
    });
  }
});

// Analyze symptoms from voice/text input (protected)
app.post('/api/symptoms/analyze', authenticate, async (req, res) => {
  try {
    const { symptomDescription, patientContext } = req.body;

    if (!symptomDescription || typeof symptomDescription !== 'string' || symptomDescription.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Symptom description is required'
      });
    }

    console.log(`Analyzing symptoms: ${symptomDescription.substring(0, 100)}...`);

    // Analyze symptoms
    const analysis = await analyzeSymptoms(symptomDescription, patientContext || undefined);

    // Log data access
    if (req.user) {
      logDataAccess(
        'create',
        'symptom_analysis',
        `symptom-analysis-${Date.now()}`,
        req.user.userId,
        req.user.email,
        true,
        undefined,
        req.ip,
        req.get('user-agent')
      );
    }

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Error analyzing symptoms:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to analyze symptoms'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔑 API Key: ${process.env.GOOGLE_AI_API_KEY ? 'Set ✓' : 'Missing ✗'}`);
});


