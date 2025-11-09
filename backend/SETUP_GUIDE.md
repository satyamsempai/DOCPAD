# Heart Disease Model Integration - Setup Guide

## Overview

This guide explains how to integrate your `heart.csv` dataset to train a model that will analyze uploaded test reports and provide disease severity, medication recommendations, and precautions.

## Architecture

```
Upload Test Report (Image/PDF)
    ↓
Google Gemini OCR → Extract Lab Values
    ↓
Map Lab Values → Heart Disease Features
    ↓
Trained Model → Predict Disease Probability
    ↓
Generate Recommendations (Medications, Precautions)
    ↓
Return Combined Analysis
```

## Step-by-Step Setup

### Step 1: Prepare Your Dataset

1. **Place `heart.csv` in the backend directory:**
   ```
   backend/
   └── data/
       └── heart.csv  ← Place your file here
   ```

2. **CSV Format Requirements:**
   - First row should be headers (column names)
   - Should include features like: age, sex, blood pressure, cholesterol, etc.
   - Must have a **target column** named one of:
     - `target`
     - `heartdisease`
     - `disease`
     - `outcome`
     - `result`
     - `label`
   - Target values: `0` = no disease, `1` = disease (or severity levels)

3. **Example CSV Structure:**
   ```csv
   age,sex,cp,trestbps,chol,fbs,restecg,thalach,exang,oldpeak,slope,ca,thal,target
   63,1,3,145,233,1,0,150,0,2.3,0,0,1,1
   37,1,2,130,250,0,1,187,0,3.5,0,0,2,1
   41,0,1,130,204,0,0,172,0,1.4,2,0,2,1
   ```

### Step 2: Train the Model

Run the training script:

```bash
cd backend
npm run train
```

**Expected Output:**
```
🚀 Starting model training...
📁 Dataset: backend/data/heart.csv
Loaded 303 records with 13 features
Features: age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal
Normalizing features...
Training model...
Iteration 0, Average Error: 0.4523
Iteration 100, Average Error: 0.3215
...
✅ Model training completed successfully!
📊 Model saved to: backend/data/trained-model.json
🎯 Accuracy: 85.23%
```

### Step 3: Verify Model is Loaded

Start your backend server:

```bash
npm run dev
```

Check the console - you should see:
```
✅ Trained heart disease model loaded successfully
📊 Model accuracy: 85.23%
```

Or test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "ok",
  "message": "Backend server is running",
  "modelLoaded": true,
  "modelAccuracy": "85.23%"
}
```

### Step 4: Test Upload

1. Start frontend: `npm run dev` (from project root)
2. Go to a patient page
3. Click "Upload Test Report"
4. Upload an image or PDF of a test report
5. The system will:
   - Extract lab values using Gemini OCR
   - Use trained model to predict disease severity
   - Generate medication recommendations
   - Provide precautions

## How It Works

### 1. Lab Value Extraction (Gemini OCR)
- Uploaded image/PDF is sent to Google Gemini
- Gemini extracts lab values: Blood Pressure, Cholesterol, FBS, etc.
- Returns structured JSON with test names, values, units

### 2. Feature Mapping
- Extracted lab values are mapped to heart disease features:
  - Blood Pressure → `trestbps`
  - Cholesterol → `chol`
  - FBS → `fbs` (1 if >120, else 0)
  - Heart Rate → `thalach`
  - Age & Sex from patient data (or defaults)

### 3. Model Prediction
- Features are normalized using training data min/max
- Trained model calculates disease probability (0-1)
- Severity classification:
  - **Low**: probability < 0.3
  - **Moderate**: 0.3 ≤ probability < 0.7
  - **High**: probability ≥ 0.7

### 4. Recommendations Generation
Based on prediction and lab values:
- **Medications**: Aspirin, Statins, ACE inhibitors (if high risk)
- **Precautions**: Diet, exercise, monitoring, follow-ups
- **Severity Assessment**: Detailed explanation
- **Deviation Analysis**: How values differ from normal

## Model Features Mapping

The system automatically maps extracted lab values to model features:

| Lab Value | Model Feature | Mapping |
|-----------|--------------|---------|
| Age | `age` | From patient data |
| Sex | `sex` | M=1, F=0 |
| Blood Pressure (Systolic) | `trestbps` | Direct value |
| Cholesterol | `chol` | Direct value |
| Fasting Blood Sugar | `fbs` | 1 if >120, else 0 |
| Max Heart Rate | `thalach` | Direct value |
| ST Depression | `oldpeak` | Direct value |

**Note**: If a feature is missing, default values are used:
- Age: 50
- Sex: M
- Blood Pressure: 120
- Cholesterol: 200
- etc.

## Customization

### Adjust Training Parameters

Edit `backend/services/modelTrainer.ts`:

```typescript
const { weights, bias } = trainLogisticRegression(
  normalized, 
  dataset.labels,
  0.01,  // learningRate (default: 0.01)
  2000   // iterations (default: 1000)
);
```

### Modify Recommendations

Edit `backend/services/predictor.ts` → `generateRecommendations()` function to customize:
- Medication suggestions
- Precautions
- Severity thresholds
- Assessment text

### Add More Features

1. Update `mapLabValuesToFeatures()` in `predictor.ts`
2. Add new case statements for your features
3. Retrain the model

## Troubleshooting

### "CSV file not found"
- Make sure `heart.csv` is in `backend/data/` directory
- Check file name is exactly `heart.csv` (case-sensitive)

### "Could not find target column"
- Your CSV must have a target column
- Check first row has correct header name
- Supported names: `target`, `heartdisease`, `disease`, `outcome`, `result`, `label`

### Model accuracy is low
- Check dataset quality
- Ensure target values are meaningful (0/1 for binary)
- Try increasing training iterations
- Check for missing or invalid values in CSV

### Model not being used
- Verify `backend/data/trained-model.json` exists
- Check server logs for model loading message
- Run `npm run train` if model file is missing

### Predictions seem incorrect
- Verify lab values are being extracted correctly
- Check feature mapping in `predictor.ts`
- Ensure patient age/sex are being passed correctly

## File Structure

```
backend/
├── data/
│   ├── heart.csv              # Your training dataset
│   └── trained-model.json     # Trained model (auto-generated)
├── services/
│   ├── datasetLoader.ts       # CSV parsing and preprocessing
│   ├── modelTrainer.ts        # Model training (logistic regression)
│   └── predictor.ts           # Predictions and recommendations
├── server.ts                  # Main server (integrated with model)
├── trainModel.ts              # Training script
└── .env                       # Environment variables
```

## Next Steps

1. ✅ Place `heart.csv` in `backend/data/`
2. ✅ Run `npm run train` to train model
3. ✅ Verify model loads (check server logs)
4. ✅ Test with uploaded test reports
5. ✅ Customize recommendations as needed

## Support

- Model training issues: Check `backend/services/modelTrainer.ts`
- Prediction issues: Check `backend/services/predictor.ts`
- Integration issues: Check `backend/server.ts` upload endpoint

