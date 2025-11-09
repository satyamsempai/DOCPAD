import { ReportAnalysis } from "@/api/reportAnalysisApi";
import { LabTest } from "@/utils/labParser";

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertType = 'critical_value' | 'medication_interaction' | 'abnormal_trend' | 'follow_up' | 'condition_warning';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  testName?: string;
  testValue?: string;
  conditionName?: string;
  timestamp: Date;
  acknowledged?: boolean;
  patientId?: string;
  reportId?: string;
}

// Critical value thresholds
const CRITICAL_THRESHOLDS = {
  hba1c: { critical: 10, high: 8 },
  fbs: { critical: 250, high: 180 },
  bpSystolic: { critical: 180, high: 160 },
  bpDiastolic: { critical: 120, high: 100 },
  ldl: { critical: 190, high: 160 },
  creatinine: { critical: 2.5, high: 1.8 },
  // Add more thresholds as needed
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
    let alertSeverity: AlertSeverity | null = null;

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
    if (alertSeverity && (alertSeverity === 'critical' || alertSeverity === 'high')) {
      alerts.push({
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'critical_value',
        severity: alertSeverity,
        title: `${alertSeverity === 'critical' ? '🚨 Critical' : '⚠️ High'} ${test.name} Value`,
        message: `${test.name} is ${value} ${test.unit}, which is ${alertSeverity === 'critical' ? 'critically' : 'significantly'} elevated. Immediate attention may be required.`,
        testName: test.name,
        testValue: `${value} ${test.unit}`,
        timestamp: new Date(),
        acknowledged: false,
      });
    }
  });

  return alerts;
}

/**
 * Detect alerts from identified conditions
 */
export function detectConditionAlerts(conditions: Array<{
  conditionName: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  likelihood: string;
}>): Alert[] {
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
        timestamp: new Date(),
        acknowledged: false,
      });
    }
  });

  return alerts;
}

/**
 * Generate alerts from report analysis
 */
export function generateAlertsFromAnalysis(analysis: ReportAnalysis): Alert[] {
  const alerts: Alert[] = [];

  // Use alerts from API if available (backend-generated)
  if (analysis.alerts && analysis.alerts.length > 0) {
    return analysis.alerts.map((apiAlert) => ({
      ...apiAlert,
      timestamp: new Date(apiAlert.timestamp),
      acknowledged: false,
      patientId: undefined,
      reportId: analysis.reportId,
    }));
  }

  // Fallback: Generate alerts from analysis data (client-side)
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
      timestamp: new Date(),
      acknowledged: false,
      reportId: analysis.reportId,
    });
  }

  return alerts;
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show browser notification for critical alerts
 */
export function showBrowserNotification(alert: Alert): void {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(alert.title, {
      body: alert.message,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: alert.id,
      requireInteraction: alert.severity === 'critical',
    });
  }
}

/**
 * Show notifications for all critical/high alerts
 */
export function showNotificationsForAlerts(alerts: Alert[]): void {
  const criticalAlerts = alerts.filter(
    (alert) => alert.severity === 'critical' || alert.severity === 'high'
  );

  criticalAlerts.forEach((alert) => {
    showBrowserNotification(alert);
  });
}

/**
 * Store alerts in localStorage (for persistence)
 */
export function storeAlerts(patientId: string, alerts: Alert[]): void {
  try {
    const key = `alerts-${patientId}`;
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    const newAlerts = alerts.filter(
      (alert) => !stored.some((storedAlert: Alert) => storedAlert.id === alert.id)
    );
    const allAlerts = [...stored, ...newAlerts];
    localStorage.setItem(key, JSON.stringify(allAlerts));
  } catch (error) {
    console.error('Failed to store alerts:', error);
  }
}

/**
 * Get stored alerts for a patient
 */
export function getStoredAlerts(patientId: string): Alert[] {
  try {
    const key = `alerts-${patientId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored).map((alert: any) => ({
      ...alert,
      timestamp: new Date(alert.timestamp),
    }));
  } catch (error) {
    console.error('Failed to get stored alerts:', error);
    return [];
  }
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(patientId: string, alertId: string): void {
  try {
    const key = `alerts-${patientId}`;
    const stored = getStoredAlerts(patientId);
    const updated = stored.map((alert) =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    );
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
  }
}

