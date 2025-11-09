import { parseHeartDataset, normalizeFeatures, ProcessedDataset, HeartDiseaseRecord } from './datasetLoader';
import fs from 'fs';
import path from 'path';

export interface TrainedModel {
  weights: number[];
  bias: number;
  featureNames: string[];
  min: number[];
  max: number[];
  accuracy?: number;
  trainedAt: string;
}

/**
 * Simple logistic regression training (for binary classification)
 * Using gradient descent
 */
export function trainLogisticRegression(
  features: number[][],
  labels: number[],
  learningRate: number = 0.01,
  iterations: number = 1000
): { weights: number[], bias: number } {
  const numFeatures = features[0].length;
  const numSamples = features.length;

  // Initialize weights and bias
  let weights = new Array(numFeatures).fill(0);
  let bias = 0;

  // Training loop
  for (let iter = 0; iter < iterations; iter++) {
    let totalError = 0;

    for (let i = 0; i < numSamples; i++) {
      const x = features[i];
      const y = labels[i];

      // Calculate prediction (sigmoid)
      let z = bias;
      for (let j = 0; j < numFeatures; j++) {
        z += weights[j] * x[j];
      }
      const prediction = 1 / (1 + Math.exp(-z)); // Sigmoid

      // Calculate error
      const error = prediction - y;
      totalError += Math.abs(error);

      // Update weights and bias
      for (let j = 0; j < numFeatures; j++) {
        weights[j] -= learningRate * error * x[j];
      }
      bias -= learningRate * error;
    }

    // Log progress every 100 iterations
    if (iter % 100 === 0) {
      const avgError = totalError / numSamples;
      console.log(`Iteration ${iter}, Average Error: ${avgError.toFixed(4)}`);
    }
  }

  return { weights, bias };
}

/**
 * Train model from dataset
 */
export function trainModelFromCSV(csvPath: string): TrainedModel {
  console.log(`Loading dataset from ${csvPath}...`);
  const dataset = parseHeartDataset(csvPath);

  console.log(`Loaded ${dataset.features.length} records with ${dataset.featureNames.length} features`);
  console.log(`Features: ${dataset.featureNames.join(', ')}`);

  // Normalize features
  console.log('Normalizing features...');
  const { normalized, min, max } = normalizeFeatures(dataset.features);

  // Train model
  console.log('Training model...');
  const { weights, bias } = trainLogisticRegression(normalized, dataset.labels);

  // Calculate accuracy
  let correct = 0;
  for (let i = 0; i < normalized.length; i++) {
    let z = bias;
    for (let j = 0; j < weights.length; j++) {
      z += weights[j] * normalized[i][j];
    }
    const prediction = 1 / (1 + Math.exp(-z)) >= 0.5 ? 1 : 0;
    if (prediction === dataset.labels[i]) {
      correct++;
    }
  }
  const accuracy = correct / normalized.length;

  console.log(`Training complete! Accuracy: ${(accuracy * 100).toFixed(2)}%`);

  return {
    weights,
    bias,
    featureNames: dataset.featureNames,
    min,
    max,
    accuracy,
    trainedAt: new Date().toISOString(),
  };
}

/**
 * Save trained model to file
 */
export function saveModel(model: TrainedModel, filePath: string): void {
  fs.writeFileSync(filePath, JSON.stringify(model, null, 2));
  console.log(`Model saved to ${filePath}`);
}

/**
 * Load trained model from file
 */
export function loadModel(filePath: string): TrainedModel {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Model file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

