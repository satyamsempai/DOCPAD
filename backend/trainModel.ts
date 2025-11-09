import { trainModelFromCSV, saveModel, loadModel } from './services/modelTrainer';
import path from 'path';
import fs from 'fs';

const CSV_PATH = path.join(__dirname, 'data', 'heart.csv');
const MODEL_PATH = path.join(__dirname, 'data', 'trained-model.json');

async function main() {
  try {
    // Check if CSV exists
    if (!fs.existsSync(CSV_PATH)) {
      console.error(`❌ CSV file not found at: ${CSV_PATH}`);
      console.error('Please place your heart.csv file in the backend/data/ directory');
      process.exit(1);
    }

    console.log('🚀 Starting model training...');
    console.log(`📁 Dataset: ${CSV_PATH}`);
    
    // Train model
    const model = trainModelFromCSV(CSV_PATH);

    // Create data directory if it doesn't exist
    const dataDir = path.dirname(MODEL_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save model
    saveModel(model, MODEL_PATH);

    console.log('✅ Model training completed successfully!');
    console.log(`📊 Model saved to: ${MODEL_PATH}`);
    console.log(`🎯 Accuracy: ${((model.accuracy || 0) * 100).toFixed(2)}%`);
  } catch (error) {
    console.error('❌ Error training model:', error);
    process.exit(1);
  }
}

main();

