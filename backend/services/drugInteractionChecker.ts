/**
 * Drug Interaction Checker Service
 * Checks for potential drug-drug interactions
 */

export interface DrugInteraction {
  severity: 'mild' | 'moderate' | 'severe' | 'contraindicated';
  description: string;
  recommendation: string;
}

export interface InteractionCheckResult {
  hasInteractions: boolean;
  interactions: Array<{
    medications: string[];
    interaction: DrugInteraction;
  }>;
}

// Common drug interactions database
// In production, this should be a comprehensive database or API integration
const DRUG_INTERACTIONS: Record<string, {
  interactsWith: string[];
  severity: DrugInteraction['severity'];
  description: string;
  recommendation: string;
}> = {
  'warfarin': {
    interactsWith: ['aspirin', 'ibuprofen', 'naproxen', 'heparin', 'clopidogrel'],
    severity: 'severe',
    description: 'Increased risk of bleeding',
    recommendation: 'Monitor INR closely and avoid concurrent use if possible',
  },
  'aspirin': {
    interactsWith: ['warfarin', 'clopidogrel', 'ibuprofen', 'naproxen'],
    severity: 'moderate',
    description: 'Increased risk of bleeding',
    recommendation: 'Monitor for signs of bleeding',
  },
  'metformin': {
    interactsWith: ['alcohol', 'furosemide'],
    severity: 'moderate',
    description: 'Increased risk of lactic acidosis',
    recommendation: 'Monitor for symptoms of lactic acidosis',
  },
  'digoxin': {
    interactsWith: ['furosemide', 'hydrochlorothiazide', 'amiodarone'],
    severity: 'moderate',
    description: 'Altered digoxin levels',
    recommendation: 'Monitor digoxin levels and adjust dose if needed',
  },
  'acebutolol': {
    interactsWith: ['verapamil', 'diltiazem'],
    severity: 'moderate',
    description: 'Increased risk of bradycardia and heart block',
    recommendation: 'Monitor heart rate and ECG',
  },
  'amiodarone': {
    interactsWith: ['digoxin', 'warfarin', 'simvastatin'],
    severity: 'moderate',
    description: 'Altered drug levels and increased side effects',
    recommendation: 'Monitor drug levels and adjust doses',
  },
};

/**
 * Normalize medication name for comparison
 */
function normalizeMedicationName(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check for drug interactions between medications
 */
export function checkDrugInteractions(medications: Array<{ name: string }>): InteractionCheckResult {
  const interactions: InteractionCheckResult['interactions'] = [];
  const medicationNames = medications.map(m => normalizeMedicationName(m.name));

  // Check each medication against the database
  for (let i = 0; i < medicationNames.length; i++) {
    const med1 = medicationNames[i];
    const interactionData = DRUG_INTERACTIONS[med1];

    if (interactionData) {
      // Check if any other medication in the list interacts with this one
      for (let j = i + 1; j < medicationNames.length; j++) {
        const med2 = medicationNames[j];

        if (interactionData.interactsWith.some(drug => normalizeMedicationName(drug) === med2)) {
          interactions.push({
            medications: [medications[i].name, medications[j].name],
            interaction: {
              severity: interactionData.severity,
              description: interactionData.description,
              recommendation: interactionData.recommendation,
            },
          });
        }
      }
    }
  }

  // Also check reverse interactions
  for (let i = 0; i < medicationNames.length; i++) {
    const med1 = medicationNames[i];

    for (let j = i + 1; j < medicationNames.length; j++) {
      const med2 = medicationNames[j];
      const interactionData = DRUG_INTERACTIONS[med2];

      if (interactionData && interactionData.interactsWith.some(drug => normalizeMedicationName(drug) === med1)) {
        // Check if we already added this interaction
        const alreadyAdded = interactions.some(
          int => int.medications.includes(medications[i].name) && int.medications.includes(medications[j].name)
        );

        if (!alreadyAdded) {
          interactions.push({
            medications: [medications[i].name, medications[j].name],
            interaction: {
              severity: interactionData.severity,
              description: interactionData.description,
              recommendation: interactionData.recommendation,
            },
          });
        }
      }
    }
  }

  return {
    hasInteractions: interactions.length > 0,
    interactions,
  };
}

/**
 * Get severity color for UI display
 */
export function getSeverityColor(severity: DrugInteraction['severity']): string {
  switch (severity) {
    case 'contraindicated':
    case 'severe':
      return 'destructive';
    case 'moderate':
      return 'warning';
    case 'mild':
      return 'default';
    default:
      return 'default';
  }
}

