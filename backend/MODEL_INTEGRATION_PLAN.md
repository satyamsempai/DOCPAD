# Heart Disease Model Integration Plan

## Overview
Integrate a trained model from `heart.csv` dataset to analyze uploaded test reports and provide disease severity, medication recommendations, and precautions.

## Architecture

```
Upload Test Report (Image/PDF)
    ↓
Extract Lab Values (using Gemini OCR)
    ↓
Map to Heart Disease Features (from heart.csv)
    ↓
Predict using Trained Model
    ↓
Generate Recommendations (medications, precautions)
    ↓
Return Analysis
```

## Implementation Steps

1. **Create Model Training Service** (`backend/services/modelTrainer.ts`)
   - Load heart.csv dataset
   - Preprocess data
   - Train model (using ml-matrix or brain.js)
   - Save trained model

2. **Create Prediction Service** (`backend/services/predictor.ts`)
   - Load trained model
   - Map extracted lab values to model features
   - Make predictions
   - Generate recommendations

3. **Update Upload Endpoint**
   - Extract lab values (current Gemini OCR)
   - Use trained model for predictions
   - Combine with Gemini for text extraction only
   - Return model-based analysis

4. **Create Dataset Loader** (`backend/services/datasetLoader.ts`)
   - Parse CSV file
   - Normalize data
   - Map to features

## Questions Needed:

1. Where is the heart.csv file located?
2. What columns does it have? (e.g., age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal, target)
3. What is the target variable? (heart disease yes/no, severity level, etc.)
4. Should we use Gemini only for OCR, then model for predictions? Or hybrid approach?

