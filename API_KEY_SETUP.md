# Google Gemini API Key Setup Guide

## Important: API Key Location

**The Google Gemini API key should be stored on your BACKEND server, NOT in the frontend.**

### Why?

- **Security**: API keys in frontend code can be exposed to anyone
- **Best Practice**: Backend acts as a secure proxy between frontend and AI services
- **Control**: Backend can implement rate limiting, caching, and access control

---

## Architecture Flow

```
Frontend (React App)
    ↓
    Calls: POST /api/patients/{id}/test-reports/upload
    ↓
Backend Server (Node.js/Express/etc.)
    ↓
    Uses: GOOGLE_AI_API_KEY (environment variable)
    ↓
Google Gemini API
    ↓
    Returns: Analysis results
    ↓
Backend Server
    ↓
    Returns: Structured JSON response
    ↓
Frontend (React App)
    ↓
    Displays: AI analysis in UI
```

---

## Step-by-Step Setup

### Step 1: Get Your Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key (starts with `AIza...`)

### Step 2: Set Up Backend Server

You need to create a backend server. Here are options:

#### Option A: Node.js/Express Backend (Recommended)

1. Create a new directory for your backend:
```bash
mkdir backend
cd backend
npm init -y
```

2. Install dependencies:
```bash
npm install express @google/generative-ai multer cors dotenv
npm install -D @types/express @types/multer @types/cors typescript ts-node nodemon
```

3. Create `.env` file in the backend directory:
```bash
# Backend .env file
GOOGLE_AI_API_KEY=your_api_key_here
PORT=3000
```

4. Create `server.js` or `server.ts` (see BACKEND_INTEGRATION.md for full example)

#### Option B: Use Existing Backend

If you already have a backend server, add the API key to your existing environment variables.

### Step 3: Add API Key to Backend Environment

#### For Local Development:

**Create `.env` file in your backend directory:**
```bash
GOOGLE_AI_API_KEY=AIzaSyC...your_actual_key_here
PORT=3000
NODE_ENV=development
```

**Important:** 
- Never commit `.env` files to Git
- Add `.env` to `.gitignore`
- Use `.env.example` as a template (without actual keys)

#### For Production (Deployment Platforms):

**Vercel:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add: `GOOGLE_AI_API_KEY` = `your_key_here`

**Heroku:**
```bash
heroku config:set GOOGLE_AI_API_KEY=your_key_here
```

**Railway:**
1. Go to your project settings
2. Navigate to "Variables"
3. Add: `GOOGLE_AI_API_KEY` = `your_key_here`

**AWS/Docker:**
- Use environment variables in your deployment configuration
- Or use AWS Secrets Manager / Parameter Store

### Step 4: Use API Key in Backend Code

**Example (Node.js/Express):**

```typescript
// server.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

if (!process.env.GOOGLE_AI_API_KEY) {
  console.error('ERROR: GOOGLE_AI_API_KEY is not set in environment variables');
  process.exit(1);
}

const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

// Your upload endpoint
app.post('/api/patients/:patientId/test-reports/upload', async (req, res) => {
  // ... file upload handling ...
  
  // Use the model (API key is already configured)
  const result = await model.generateContent([prompt, imagePart]);
  // ... rest of the code ...
});
```

---

## Frontend Configuration

### Step 5: Configure Frontend to Point to Backend

**Create `.env.local` file in the frontend root directory:**

```bash
# Frontend .env.local file
VITE_API_BASE_URL=http://localhost:3000/api
```

**For production:**
```bash
VITE_API_BASE_URL=https://your-backend-api.com/api
```

**Important:**
- Frontend only needs the backend URL
- Frontend should NEVER have the Google Gemini API key
- The `VITE_` prefix is required for Vite to expose the variable to the frontend

---

## Security Checklist

- [ ] API key is stored in backend `.env` file
- [ ] `.env` file is in `.gitignore`
- [ ] API key is NOT in frontend code
- [ ] API key is NOT in repository
- [ ] Backend validates file uploads
- [ ] Backend implements rate limiting
- [ ] Backend handles errors gracefully
- [ ] CORS is configured on backend
- [ ] Production environment variables are set

---

## Testing

### Test Backend API Key:

```bash
# In your backend directory
node -e "require('dotenv').config(); console.log('API Key:', process.env.GOOGLE_AI_API_KEY ? 'Set ✓' : 'Missing ✗');"
```

### Test Frontend Connection:

1. Start your backend server
2. Start your frontend dev server
3. Try uploading a test report
4. Check browser console for errors
5. Check backend logs for API calls

---

## Troubleshooting

### Error: "GOOGLE_AI_API_KEY is not defined"

**Solution:** Make sure:
1. `.env` file exists in backend directory
2. `.env` file contains `GOOGLE_AI_API_KEY=your_key`
3. You're loading environment variables (using `dotenv` or similar)
4. You restart your backend server after adding the key

### Error: "API key is invalid"

**Solution:**
1. Verify the API key is correct (no extra spaces)
2. Check if API key has expired
3. Ensure you're using the correct Google AI Studio API key
4. Check Google Cloud Console for API restrictions

### Error: "CORS error" when uploading

**Solution:** Add CORS to your backend:
```typescript
import cors from 'cors';
app.use(cors({
  origin: 'http://localhost:8080', // Your frontend URL
  credentials: true
}));
```

---

## Example File Structure

```
your-project/
├── frontend/                 # React app (this project)
│   ├── .env.local           # Frontend env (only VITE_API_BASE_URL)
│   ├── src/
│   └── package.json
│
└── backend/                  # Backend server (you create this)
    ├── .env                 # Backend env (GOOGLE_AI_API_KEY here)
    ├── .gitignore          # Should include .env
    ├── server.ts
    ├── package.json
    └── uploads/            # Temporary file storage
```

---

## Quick Start Summary

1. **Get API Key**: [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Create Backend**: Set up Node.js/Express server
3. **Add to Backend `.env`**: `GOOGLE_AI_API_KEY=your_key`
4. **Add to Frontend `.env.local`**: `VITE_API_BASE_URL=http://localhost:3000/api`
5. **Implement Upload Endpoint**: See BACKEND_INTEGRATION.md
6. **Test**: Upload a test report from frontend

---

## Need Help?

- Backend implementation: See `BACKEND_INTEGRATION.md`
- Google Gemini docs: https://ai.google.dev/docs
- Frontend API client: See `src/api/reportAnalysisApi.ts`

