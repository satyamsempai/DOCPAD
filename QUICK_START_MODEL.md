# Quick Start: Heart Disease Model Integration

## 🚀 Quick Setup (3 Steps)

### 1. Place Your Dataset
```bash
# Create data directory
mkdir backend/data

# Place your heart.csv file here
# backend/data/heart.csv
```

### 2. Train the Model
```bash
cd backend
npm run train
```

**Expected output:**
```
✅ Model training completed successfully!
📊 Model saved to: backend/data/trained-model.json
🎯 Accuracy: 85.23%
```

### 3. Start Server
```bash
npm run dev
```

Check console for:
```
✅ Trained heart disease model loaded successfully
📊 Model accuracy: 85.23%
```

## ✅ Done!

Now when you upload test reports:
1. Gemini extracts lab values (OCR)
2. Model predicts disease severity
3. System generates medications & precautions
4. All based on your trained model!

## 📋 CSV Requirements

Your `heart.csv` should have:
- **Header row** with column names
- **Target column** named: `target`, `heartdisease`, `disease`, `outcome`, `result`, or `label`
- **Feature columns** like: age, sex, trestbps (BP), chol (cholesterol), fbs, etc.
- **Target values**: 0 = no disease, 1 = disease

## 🔍 Verify It's Working

**Check health endpoint:**
```bash
curl http://localhost:3000/api/health
```

Should show:
```json
{
  "modelLoaded": true,
  "modelAccuracy": "85.23%"
}
```

**Test upload:**
- Go to patient page
- Upload test report
- Check AI Analysis panel for model-based recommendations

## 📚 Full Documentation

- **Setup Guide**: `backend/SETUP_GUIDE.md`
- **Backend README**: `backend/README.md`

## ⚠️ Troubleshooting

**Model not loading?**
- Check `backend/data/trained-model.json` exists
- Run `npm run train` again

**Low accuracy?**
- Check your CSV has good quality data
- Verify target column has 0/1 values
- Try increasing training iterations

**Predictions seem wrong?**
- Check lab values are being extracted correctly
- Verify feature mapping in `backend/services/predictor.ts`

