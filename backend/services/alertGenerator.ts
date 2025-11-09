/**
 * Backend Alert Generator Service
 * Generates alerts from report analysis data
 */

export interface Alert {
  id: string;
  type: 'critical_value' | 'medication_interaction' | 'abnormal_trend' | 'follow_up' | 'condition_warning';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  testName?: string;
  testValue?: string;
  conditionName?: string;
  timestamp: string;
}

export interface LabTest {
  name: string;
  value: number;
  unit: string;
  severity: 'normal' | 'moderate' | 'high' | 'critical';
}

export interface IdentifiedCondition {
  conditionName: string;
  likelihood: 'Low' | 'Moderate' | 'High' | 'Very High';
  explanation: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
}

// Critical value thresholds
const CRITICAL_THRESHOLDS = {
  hba1c: { critical: 10, high: 8 },
  fbs: { critical: 250, high: 180 },
  bpSystolic: { critical: 180, high: 160 },
  bpDiastolic: { critical: 120, high: 100 },
  ldl: { critical: 190, high: 160 },
  creatinine: { critical: 2.5, high: 1.8 },
};

/**
 * Detect critical values from lab tests
 */
export function detectCriticalValues(tests: LabTest[]): Alert[] {
  const alerts: Alert[] = [];

  tests.forEach((test) => {
    const testName = test.name.toLowerCase();
    const value = test.value;
    let threshold: { critical: number; high: number } | null = null;
    let alertSeverity: 'critical' | 'high' | null = null;

    // Check HbA1c
    if (testName.includes('hba1c') || testName.includes('hemoglobin a1c')) {
      threshold = CRITICAL_THRESHOLDS.hba1c;
      if (value >= threshold.critical) {
        alertSeverity = 'critical';
      } else if (value >= threshold.high) {
        alertSeverity = 'high';
      }
    }
    // Check FBS
    else if (testName.includes('fbs') || testName.includes('fasting blood sugar') || testName.includes('fasting glucose')) {
      threshold = CRITICAL_THRESHOLDS.fbs;
      if (value >= threshold.critical) {
        alertSeverity = 'critical';
      } else if (value >= threshold.high) {
        alertSeverity = 'high';
      }
    }
    // Check Blood Pressure
    else if (testName.includes('blood pressure') || testName.includes('bp')) {
      // Parse BP value (format: "140/90 mmHg" or similar)
      const bpMatch = test.unit.match(/(\d+)\/(\d+)/);
      if (bpMatch) {
        const systolic = parseInt(bpMatch[1]);
        const diastolic = parseInt(bpMatch[2]);
        
        if (systolic >= CRITICAL_THRESHOLDS.bpSystolic.critical || diastolic >= CRITICAL_THRESHOLDS.bpDiastolic.critical) {
          alertSeverity = 'critical';
        } else if (systolic >= CRITICAL_THRESHOLDS.bpSystolic.high || diastolic >= CRITICAL_THRESHOLDS.bpDiastolic.high) {
          alertSeverity = 'high';
        }
      }
    }
    // Check LDL
    else if (testName.includes('ldl') || testName.includes('low-density lipoprotein')) {
      threshold = CRITICAL_THRESHOLDS.ldl;
      if (value >= threshold.critical) {
        alertSeverity = 'critical';
      } else if (value >= threshold.high) {
        alertSeverity = 'high';
      }
    }
    // Check Creatinine
    else if (testName.includes('creatinine')) {
      threshold = CRITICAL_THRESHOLDS.creatinine;
      if (value >= threshold.critical) {
        alertSeverity = 'critical';
      } else if (value >= threshold.high) {
        alertSeverity = 'high';
      }
    }

    // Create alert if threshold exceeded
    if (alertSeverity) {
      alerts.push({
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'critical_value',
        severity: alertSeverity,
        title: `${alertSeverity === 'critical' ? '🚨 Critical' : '⚠️ High'} ${test.name} Value`,
        message: `${test.name} is ${value} ${test.unit}, which is ${alertSeverity === 'critical' ? 'critically' : 'significantly'} elevated. Immediate attention may be required.`,
        testName: test.name,
        testValue: `${value} ${test.unit}`,
        timestamp: new Date().toISOString(),
      });
    }
  });

  return alerts;
}

/**
 * Detect alerts from identified conditions
 */
export function detectConditionAlerts(conditions: IdentifiedCondition[]): Alert[] {
  const alerts: Alert[] = [];

  conditions.forEach((condition) => {
    if (condition.severity === 'Critical' || condition.severity === 'High') {
      alerts.push({
        id: `alert-condition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'condition_warning',
        severity: condition.severity === 'Critical' ? 'critical' : 'high',
        title: `${condition.severity === 'Critical' ? '🚨 Critical' : '⚠️ High'} Condition Detected`,
        message: `${condition.conditionName} has been identified with ${condition.severity.toLowerCase()} severity. ${condition.likelihood} likelihood.`,
        conditionName: condition.conditionName,
        timestamp: new Date().toISOString(),
      });
    }
  });

  return alerts;
}

/**
 * Generate alerts from report analysis
 */
export function generateAlertsFromAnalysis(analysis: {
  extractedData: {
    tests: LabTest[];
    overallSeverity: 'Low' | 'Moderate' | 'High' | 'Critical';
    identifiedConditions?: IdentifiedCondition[];
  };
  reportId?: string;
}): Alert[] {
  const alerts: Alert[] = [];

  // Detect critical lab values
  if (analysis.extractedData.tests && analysis.extractedData.tests.length > 0) {
    const criticalValueAlerts = detectCriticalValues(analysis.extractedData.tests);
    alerts.push(...criticalValueAlerts);
  }

  // Detect condition warnings
  if (analysis.extractedData.identifiedConditions && analysis.extractedData.identifiedConditions.length > 0) {
    const conditionAlerts = detectConditionAlerts(analysis.extractedData.identifiedConditions);
    alerts.push(...conditionAlerts);
  }

  // Check overall severity
  if (analysis.extractedData.overallSeverity === 'Critical') {
    alerts.push({
      id: `alert-overall-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'condition_warning',
      severity: 'critical',
      title: '🚨 Critical Overall Health Status',
      message: 'The overall health assessment indicates a critical condition requiring immediate attention.',
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

