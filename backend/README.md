# Backend Server Setup

This is the backend server for the Aarogya-Setu Clinical Records System.

## Quick Start

### 1. Set Up Environment Variables

Create a `.env` file in this directory with:

```bash
GOOGLE_AI_API_KEY=your_api_key_here
PORT=3000
FRONTEND_URL=http://localhost:8080
```

**Get your API key from:** [Google AI Studio](https://makersuite.google.com/app/apikey)

### 2. Install Dependencies (if not already done)

```bash
npm install
```

### 3. Train the Heart Disease Model

**Place your `heart.csv` file in `backend/data/` directory**, then run:

```bash
npm run train
```

This will:
- Load the heart.csv dataset
- Train a logistic regression model
- Save the trained model to `backend/data/trained-model.json`

**Expected CSV format:**
- Should have columns like: age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal, target
- Target column should be named: `target`, `heartdisease`, `disease`, `outcome`, `result`, or `label`
- Target values: 0 = no heart disease, 1 = heart disease (or severity levels)

### 4. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will run on `http://localhost:3000`

## How It Works

### Analysis Flow

1. **Upload Test Report** (Image/PDF)
   - Frontend uploads file to `/api/patients/:id/test-reports/upload`

2. **Extract Lab Values** (using Google Gemini)
   - Gemini OCR extracts lab values from image/PDF
   - Returns structured data with test names, values, units

3. **Model Prediction** (if model is trained)
   - Maps extracted lab values to heart disease features
   - Uses trained model to predict disease probability
   - Determines severity (Low/Moderate/High)

4. **Generate Recommendations**
   - Based on model prediction and lab values
   - Provides medications, precautions, severity assessment

5. **Return Analysis**
   - Combined results from Gemini extraction + model predictions
   - Structured JSON response with all insights

## API Endpoints

### Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "message": "Backend server is running",
  "modelLoaded": true,
  "modelAccuracy": "85.23%"
}
```

### Upload and Analyze Test Report
```
POST /api/patients/:patientId/test-reports/upload
Content-Type: multipart/form-data
Body: { file: File }
```

## File Structure

```
backend/
├── data/
│   ├── heart.csv              # Your training dataset (place here)
│   └── trained-model.json      # Trained model (generated after training)
├── services/
│   ├── datasetLoader.ts       # CSV loading and preprocessing
│   ├── modelTrainer.ts        # Model training logic
│   └── predictor.ts           # Prediction and recommendations
├── server.ts                  # Main server file
├── trainModel.ts              # Training script
└── .env                       # Environment variables
```

## Training the Model

### Step 1: Prepare Your Dataset

Place `heart.csv` in `backend/data/` directory.

**Required columns:**
- Features: age, sex, cp, trestbps (blood pressure), chol (cholesterol), fbs (fasting blood sugar), etc.
- Target: One column indicating heart disease (0/1 or severity level)

**Column names are flexible** - the loader will recognize common variations:
- `target`, `heartdisease`, `disease`, `outcome`, `result`, `label`
- `trestbps`, `restingbp`, `bloodpressure`
- `chol`, `cholesterol`
- `fbs`, `fastingbloodsugar`
- etc.

### Step 2: Train

```bash
npm run train
```

You should see:
```
🚀 Starting model training...
📁 Dataset: backend/data/heart.csv
Loaded 303 records with 13 features
Training model...
Iteration 0, Average Error: 0.4523
...
✅ Model training completed successfully!
📊 Model saved to: backend/data/trained-model.json
🎯 Accuracy: 85.23%
```

### Step 3: Verify

Check that `backend/data/trained-model.json` was created.

## Testing

### Test Health Endpoint
```bash
curl http://localhost:3000/api/health
```

### Test Upload Endpoint
```bash
curl -X POST http://localhost:3000/api/patients/MHR-01-2024-7/test-reports/upload \
  -F "file=@/path/to/test-report.jpg"
```

## Troubleshooting

### Error: "CSV file not found"
- Make sure `heart.csv` is in `backend/data/` directory
- Check file name is exactly `heart.csv` (case-sensitive on some systems)

### Error: "Could not find target column"
- Your CSV must have a target column named: `target`, `heartdisease`, `disease`, `outcome`, `result`, or `label`
- Check the first row of your CSV has the correct header

### Model not being used
- Check `backend/data/trained-model.json` exists
- Check server logs for "✅ Trained heart disease model loaded successfully"
- If not loaded, run `npm run train` first

### Low model accuracy
- Check your dataset quality
- Ensure target column has meaningful values (0/1 for binary classification)
- Try increasing training iterations in `modelTrainer.ts`

## Model Details

- **Algorithm**: Logistic Regression with Gradient Descent
- **Normalization**: Min-Max scaling
- **Training**: 1000 iterations by default
- **Output**: Probability of heart disease (0-1), severity classification

## Integration with Frontend

The frontend automatically uses the model when:
1. Model is trained and loaded
2. Lab values are extracted from uploaded reports
3. Model predictions are combined with Gemini's analysis

No frontend changes needed - the backend handles everything!
