import fs from 'fs';
import path from 'path';

export interface HeartDiseaseRecord {
  age?: number;
  sex?: number; // 0 = female, 1 = male
  cp?: number; // Chest pain type
  trestbps?: number; // Resting blood pressure
  chol?: number; // Serum cholesterol
  fbs?: number; // Fasting blood sugar > 120 (0/1)
  restecg?: number; // Resting ECG
  thalach?: number; // Maximum heart rate
  exang?: number; // Exercise induced angina (0/1)
  oldpeak?: number; // ST depression
  slope?: number; // Slope of peak exercise
  ca?: number; // Number of major vessels
  thal?: number; // Thalassemia
  target?: number; // Heart disease (0 = no, 1 = yes, or severity level)
  [key: string]: any; // Allow additional columns
}

export interface ProcessedDataset {
  features: number[][];
  labels: number[];
  featureNames: string[];
  records: HeartDiseaseRecord[];
}

/**
 * Load and parse CSV file
 */
export function loadCSV(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  return lines.map(line => {
    // Handle quoted values and commas
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
}

/**
 * Parse CSV to structured data
 */
export function parseHeartDataset(filePath: string): ProcessedDataset {
  const rows = loadCSV(filePath);
  
  if (rows.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = rows[0].map(h => h.toLowerCase().trim());
  const dataRows = rows.slice(1);

  // Find target column (common names: target, heartdisease, disease, outcome, etc.)
  const targetIndex = headers.findIndex(h => 
    ['target', 'heartdisease', 'disease', 'outcome', 'result', 'label'].includes(h)
  );

  if (targetIndex === -1) {
    throw new Error('Could not find target column. Expected one of: target, heartdisease, disease, outcome, result, label');
  }

  const featureNames = headers.filter((_, i) => i !== targetIndex);
  const features: number[][] = [];
  const labels: number[] = [];
  const records: HeartDiseaseRecord[] = [];

  for (const row of dataRows) {
    if (row.length !== headers.length) {
      console.warn(`Skipping row with incorrect column count: ${row.length} vs ${headers.length}`);
      continue;
    }

    const record: HeartDiseaseRecord = {};
    const featureRow: number[] = [];

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = row[i].trim();

      if (i === targetIndex) {
        // Target column
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          labels.push(numValue);
          record.target = numValue;
        } else {
          // Skip row if target is not a number
          continue;
        }
      } else {
        // Feature column
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          featureRow.push(numValue);
          record[header] = numValue;
        } else {
          // Use 0 for missing/invalid values
          featureRow.push(0);
          record[header] = 0;
        }
      }
    }

    if (featureRow.length === featureNames.length) {
      features.push(featureRow);
      records.push(record);
    }
  }

  return {
    features,
    labels,
    featureNames,
    records,
  };
}

/**
 * Normalize features (min-max scaling)
 */
export function normalizeFeatures(features: number[][]): { normalized: number[][], min: number[], max: number[] } {
  if (features.length === 0) {
    return { normalized: [], min: [], max: [] };
  }

  const numFeatures = features[0].length;
  const min: number[] = new Array(numFeatures).fill(Infinity);
  const max: number[] = new Array(numFeatures).fill(-Infinity);

  // Find min and max for each feature
  for (const row of features) {
    for (let i = 0; i < numFeatures; i++) {
      min[i] = Math.min(min[i], row[i]);
      max[i] = Math.max(max[i], row[i]);
    }
  }

  // Normalize
  const normalized = features.map(row =>
    row.map((value, i) => {
      const range = max[i] - min[i];
      return range === 0 ? 0 : (value - min[i]) / range;
    })
  );

  return { normalized, min, max };
}

