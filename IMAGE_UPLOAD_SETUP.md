# Image Upload & Gemini AI Analysis - Setup Guide

## ✅ Implementation Status

The image upload functionality is **fully implemented** and ready to use! Here's what's already in place:

### Frontend Components
- ✅ `ReportUploadDialog` - Upload dialog with drag & drop
- ✅ `ReportsList` - Upload button in Test Reports tab
- ✅ `AIAnalysisPanel` - Displays Gemini analysis results
- ✅ `reportAnalysisApi.ts` - API client for backend communication

### Backend Implementation
- ✅ Express server with file upload handling
- ✅ Google Gemini API integration
- ✅ Image/PDF processing (vision model)
- ✅ JSON response parsing and validation
- ✅ Error handling and fallback mechanisms

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in and create an API key
3. Copy the key (starts with `AIza...`)

### Step 2: Configure Backend

Create `backend/.env` file:

```bash
GOOGLE_AI_API_KEY=your_api_key_here
PORT=3000
FRONTEND_URL=http://localhost:8080
```

**Important:** Never commit `.env` files to Git!

### Step 3: Configure Frontend (Optional)

Create `.env.local` in the root directory (only if backend is on different URL):

```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

**Note:** Default is already `http://localhost:3000/api`, so this is optional for local development.

---

## 🏃 Running the Application

### Terminal 1: Start Backend Server

```bash
cd backend
npm install  # If not already done
npm run dev
```

You should see:
```
🚀 Backend server running on http://localhost:3000
📡 Health check: http://localhost:3000/api/health
🔑 API Key: Set ✓
```

### Terminal 2: Start Frontend

```bash
npm install  # If not already done
npm run dev
```

Frontend will run on `http://localhost:8080`

---

## 📸 How to Use Image Upload

1. **Navigate to Patient Page**
   - Search for a patient (e.g., `MHR-01-2024-7`)
   - Click on the patient to open their page

2. **Open Upload Dialog**
   - Go to "Test Reports" tab
   - Click "Upload Test Report" button

3. **Upload Image**
   - Click the upload area or drag & drop
   - Select an image (JPG, PNG, WebP) or PDF file
   - Max file size: 10MB

4. **Wait for Analysis**
   - Progress bar shows upload and analysis progress
   - Gemini AI will analyze the image
   - Results appear automatically in the AI Analysis Panel

5. **View Results**
   - **Right Panel (AI Analysis):**
     - Overall severity badge (Low/Moderate/High)
     - Severity assessment
     - Deviation from normal ranges
     - Recommended medicines
     - Precautions
   - **Left Panel (Test Reports):**
     - New report card with "AI" badge
     - Click to view full report

---

## 🔍 What Gemini Analyzes

The AI extracts and analyzes:

- **Lab Values:**
  - HbA1c (Hemoglobin A1c)
  - FBS (Fasting Blood Sugar)
  - Blood Pressure (Systolic/Diastolic)
  - LDL Cholesterol
  - Creatinine
  - And other test values found in the image

- **Severity Assessment:**
  - Normal / Moderate / High for each test
  - Overall severity classification

- **Clinical Insights:**
  - Detailed severity explanation
  - Deviation from normal ranges
  - Medication recommendations
  - Patient precautions

---

## 🎯 Supported File Formats

- **Images:** JPG, JPEG, PNG, WebP
- **Documents:** PDF (text-based, not scanned images)
- **Max Size:** 10MB

**Note:** For scanned PDFs (image-based), convert pages to images (JPG/PNG) first.

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error:** `GOOGLE_AI_API_KEY is not set`

**Solution:**
1. Create `backend/.env` file
2. Add: `GOOGLE_AI_API_KEY=your_key_here`
3. Restart backend server

### Upload Fails with CORS Error

**Solution:** Backend CORS is already configured. Make sure:
- Backend is running on port 3000
- Frontend is running on port 8080
- Check `FRONTEND_URL` in backend `.env` matches frontend URL

### Gemini API Error

**Error:** `API quota exceeded` or `Invalid API request`

**Solutions:**
- Check API key is correct (no extra spaces)
- Verify API key is active in Google AI Studio
- Check API usage limits
- Ensure you have quota remaining

### File Upload Fails

**Error:** `Invalid file type` or `File size exceeds limit`

**Solutions:**
- Use supported formats: JPG, PNG, WebP, PDF
- Keep file size under 10MB
- For PDFs, ensure they're text-based (not scanned images)

### Analysis Not Displaying

**Check:**
1. Browser console for errors (F12)
2. Backend logs for API responses
3. Network tab to see API calls
4. Ensure backend is running and accessible

---

## 📊 API Flow Diagram

```
User Uploads Image
    ↓
Frontend: ReportUploadDialog
    ↓
POST /api/patients/{id}/test-reports/upload
    ↓
Backend: server.ts
    ↓
Multer: File Upload Handler
    ↓
Google Gemini API (Vision Model)
    ↓
Gemini Analyzes Image
    ↓
Returns JSON with:
  - Extracted lab values
  - Severity assessments
  - Recommendations
    ↓
Backend Processes Response
    ↓
Returns to Frontend
    ↓
Frontend Updates UI:
  - Adds new test report
  - Displays AI analysis panel
  - Shows severity badges
```

---

## 🔒 Security Notes

- ✅ API key is stored in backend only (never in frontend)
- ✅ File uploads are validated (type, size)
- ✅ Files are deleted after processing
- ✅ CORS is configured for security
- ✅ Error messages don't expose sensitive data

---

## 📝 Code Locations

### Frontend
- Upload Dialog: `src/components/ReportUploadDialog.tsx`
- API Client: `src/api/reportAnalysisApi.ts`
- Patient Page: `src/pages/PatientPage.tsx`
- AI Panel: `src/components/AIAnalysisPanel.tsx`
- Reports List: `src/components/ReportsList.tsx`

### Backend
- Server: `backend/server.ts`
- Upload Endpoint: `POST /api/patients/:patientId/test-reports/upload`
- Gemini Integration: Lines 132-289 in `server.ts`

---

## ✅ Testing Checklist

- [ ] Backend server starts without errors
- [ ] API key is loaded (check console logs)
- [ ] Frontend connects to backend (check network tab)
- [ ] Upload dialog opens when clicking "Upload Test Report"
- [ ] File selection works (click and drag & drop)
- [ ] File validation works (try invalid file types)
- [ ] Upload progress shows correctly
- [ ] Gemini analysis completes successfully
- [ ] Results display in AI Analysis Panel
- [ ] New report appears in Test Reports list
- [ ] "Copy to Note" button works
- [ ] Error messages display correctly on failure

---

## 🎉 You're All Set!

The image upload feature is ready to use. Just:
1. Set up your Gemini API key
2. Start the backend server
3. Start the frontend
4. Upload a test report image!

For more details, see:
- `API_KEY_SETUP.md` - Detailed API key setup
- `BACKEND_INTEGRATION.md` - Backend integration guide
- `backend/README.md` - Backend server documentation



