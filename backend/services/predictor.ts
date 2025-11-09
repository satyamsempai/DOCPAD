import { TrainedModel, loadModel } from './modelTrainer';
import { normalizeFeatures } from './datasetLoader';

export interface PredictionResult {
  probability: number; // 0-1, probability of heart disease
  prediction: number; // 0 or 1
  severity: 'Low' | 'Moderate' | 'High';
  confidence: number;
}

export interface LabValues {
  age?: number;
  sex?: 'M' | 'F';
  bloodPressure?: { systolic: number; diastolic: number };
  cholesterol?: number;
  fbs?: number; // Fasting blood sugar
  maxHeartRate?: number;
  stDepression?: number;
  [key: string]: any;
}

/**
 * Map extracted lab values to model features
 */
export function mapLabValuesToFeatures(
  labValues: LabValues,
  featureNames: string[]
): number[] {
  const features: number[] = [];

  for (const featureName of featureNames) {
    let value = 0;

    switch (featureName.toLowerCase()) {
      case 'age':
        value = labValues.age || 50; // Default age if not provided
        break;
      case 'sex':
        value = labValues.sex === 'M' ? 1 : 0;
        break;
      case 'trestbps':
      case 'restingbp':
      case 'bloodpressure':
        // Use systolic blood pressure
        value = labValues.bloodPressure?.systolic || 120;
        break;
      case 'chol':
      case 'cholesterol':
        value = labValues.cholesterol || 200;
        break;
      case 'fbs':
      case 'fastingbloodsugar':
        // 1 if > 120, else 0
        value = (labValues.fbs || 0) > 120 ? 1 : 0;
        break;
      case 'thalach':
      case 'maxheartrate':
        value = labValues.maxHeartRate || 150;
        break;
      case 'oldpeak':
      case 'stdepression':
        value = labValues.stDepression || 0;
        break;
      default:
        // For unknown features, try to find in labValues
        value = labValues[featureName] || 0;
    }

    features.push(value);
  }

  return features;
}

/**
 * Normalize features using model's min/max
 */
function normalizeFeaturesWithModel(features: number[], model: TrainedModel): number[] {
  return features.map((value, i) => {
    const min = model.min[i] || 0;
    const max = model.max[i] || 1;
    const range = max - min;
    return range === 0 ? 0 : (value - min) / range;
  });
}

/**
 * Make prediction using trained model
 */
export function predict(
  labValues: LabValues,
  model: TrainedModel
): PredictionResult {
  // Map lab values to features
  const features = mapLabValuesToFeatures(labValues, model.featureNames);

  // Normalize features
  const normalized = normalizeFeaturesWithModel(features, model);

  // Calculate prediction
  let z = model.bias;
  for (let i = 0; i < model.weights.length; i++) {
    z += model.weights[i] * normalized[i];
  }

  // Apply sigmoid
  const probability = 1 / (1 + Math.exp(-z));
  const prediction = probability >= 0.5 ? 1 : 0;

  // Determine severity
  let severity: 'Low' | 'Moderate' | 'High';
  if (probability < 0.3) {
    severity = 'Low';
  } else if (probability < 0.7) {
    severity = 'Moderate';
  } else {
    severity = 'High';
  }

  // Confidence is based on how far from 0.5
  const confidence = Math.abs(probability - 0.5) * 2;

  return {
    probability,
    prediction,
    severity,
    confidence,
  };
}

/**
 * Generate recommendations based on prediction
 */
export function generateRecommendations(
  prediction: PredictionResult,
  labValues: LabValues
): {
  medications: string[];
  precautions: string[];
  severityAssessment: string;
  deviationFromNormal: string;
} {
  const medications: string[] = [];
  const precautions: string[] = [];
  let severityAssessment = '';
  let deviationFromNormal = '';

  const prob = prediction.probability;
  const bp = labValues.bloodPressure;
  const chol = labValues.cholesterol;
  const fbs = labValues.fbs;

  // Severity assessment
  if (prob < 0.3) {
    severityAssessment = 'Low risk of heart disease. Results are within normal ranges.';
  } else if (prob < 0.7) {
    severityAssessment = 'Moderate risk of heart disease. Some values are concerning and require monitoring.';
  } else {
    severityAssessment = 'High risk of heart disease. Immediate medical attention and lifestyle changes recommended.';
  }

  // Deviation from normal
  const deviations: string[] = [];
  if (bp && bp.systolic >= 140) {
    deviations.push(`Blood pressure (${bp.systolic}/${bp.diastolic}) is elevated`);
  }
  if (chol && chol >= 200) {
    deviations.push(`Cholesterol (${chol} mg/dL) is above normal`);
  }
  if (fbs && fbs >= 126) {
    deviations.push(`Fasting blood sugar (${fbs} mg/dL) is elevated`);
  }
  deviationFromNormal = deviations.length > 0
    ? deviations.join('. ') + '.'
    : 'Most values are within normal ranges.';

  // Medications based on risk level
  if (prob >= 0.7) {
    medications.push('Aspirin 75-100mg daily (if not contraindicated)');
    if (chol && chol >= 200) {
      medications.push('Statins (e.g., Atorvastatin 10-20mg daily) for cholesterol management');
    }
    if (bp && bp.systolic >= 140) {
      medications.push('ACE inhibitors (e.g., Lisinopril 5-10mg daily) for blood pressure control');
    }
  } else if (prob >= 0.3) {
    if (chol && chol >= 200) {
      medications.push('Consider statin therapy if lifestyle changes insufficient');
    }
    if (bp && bp.systolic >= 130) {
      medications.push('Monitor blood pressure, consider medication if consistently elevated');
    }
  }

  // Precautions
  if (prob >= 0.5) {
    precautions.push('Follow a heart-healthy diet (low sodium, low saturated fat)');
    precautions.push('Engage in regular moderate exercise (30 minutes, 5 days/week)');
    precautions.push('Avoid smoking and limit alcohol consumption');
    precautions.push('Monitor blood pressure and cholesterol regularly');
    precautions.push('Maintain healthy weight');
    if (prob >= 0.7) {
      precautions.push('Schedule follow-up with cardiologist within 1-2 weeks');
      precautions.push('Consider cardiac stress test or ECG');
    }
  } else {
    precautions.push('Maintain current healthy lifestyle');
    precautions.push('Regular check-ups and monitoring');
  }

  return {
    medications,
    precautions,
    severityAssessment,
    deviationFromNormal,
  };
}

