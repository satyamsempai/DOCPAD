export interface LabTest {
  name: string;
  value: number;
  unit: string;
  severity: 'normal' | 'moderate' | 'high';
  threshold?: string;
}

export interface ParsedLab {
  tests: LabTest[];
  overallSeverity: 'Low' | 'Moderate' | 'High';
  parsed_json: Record<string, any>;
}

const LAB_PATTERNS = {
  hba1c: /HbA1c[:\s]*(\d+\.?\d*)\s*%/i,
  fbs: /FBS|Fasting Blood Sugar[:\s]*(\d+)\s*mg\/dL/i,
  bpSystolic: /BP|Blood Pressure[:\s]*(\d+)\/\d+/i,
  bpDiastolic: /BP|Blood Pressure[:\s]*\d+\/(\d+)/i,
  ldl: /LDL[:\s]*(\d+)\s*mg\/dL/i,
  creatinine: /Creatinine[:\s]*(\d+\.?\d*)\s*mg\/dL/i,
};

function assessSeverity(test: string, value: number): 'normal' | 'moderate' | 'high' {
  const thresholds: Record<string, { moderate: number; high: number }> = {
    hba1c: { moderate: 7, high: 8 },
    fbs: { moderate: 100, high: 126 },
    bpSystolic: { moderate: 130, high: 140 },
    bpDiastolic: { moderate: 85, high: 90 },
    ldl: { moderate: 100, high: 130 },
    creatinine: { moderate: 1.2, high: 1.5 },
  };

  const threshold = thresholds[test];
  if (!threshold) return 'normal';

  if (value >= threshold.high) return 'high';
  if (value >= threshold.moderate) return 'moderate';
  return 'normal';
}

export function parseLabReport(text: string): ParsedLab {
  const tests: LabTest[] = [];
  const parsed_json: Record<string, any> = {};

  // HbA1c
  const hba1cMatch = text.match(LAB_PATTERNS.hba1c);
  if (hba1cMatch) {
    const value = parseFloat(hba1cMatch[1]);
    const severity = assessSeverity('hba1c', value);
    tests.push({
      name: 'HbA1c',
      value,
      unit: '%',
      severity,
      threshold: '<7 normal, 7-7.9 moderate, ≥8 high',
    });
    parsed_json.hba1c = { value, unit: '%', severity };
  }

  // FBS
  const fbsMatch = text.match(LAB_PATTERNS.fbs);
  if (fbsMatch) {
    const value = parseInt(fbsMatch[1]);
    const severity = assessSeverity('fbs', value);
    tests.push({
      name: 'Fasting Blood Sugar',
      value,
      unit: 'mg/dL',
      severity,
      threshold: '<100 normal, 100-125 moderate, ≥126 high',
    });
    parsed_json.fbs = { value, unit: 'mg/dL', severity };
  }

  // Blood Pressure
  const bpSysMatch = text.match(LAB_PATTERNS.bpSystolic);
  const bpDiaMatch = text.match(LAB_PATTERNS.bpDiastolic);
  if (bpSysMatch && bpDiaMatch) {
    const systolic = parseInt(bpSysMatch[1]);
    const diastolic = parseInt(bpDiaMatch[1]);
    const sysSeverity = assessSeverity('bpSystolic', systolic);
    const diaSeverity = assessSeverity('bpDiastolic', diastolic);
    const severity = sysSeverity === 'high' || diaSeverity === 'high' ? 'high' : 
                     sysSeverity === 'moderate' || diaSeverity === 'moderate' ? 'moderate' : 'normal';
    
    tests.push({
      name: 'Blood Pressure',
      value: systolic,
      unit: `${systolic}/${diastolic} mmHg`,
      severity,
      threshold: '<130/85 normal, 130-139/85-89 moderate, ≥140/90 high',
    });
    parsed_json.blood_pressure = { systolic, diastolic, severity };
  }

  // LDL
  const ldlMatch = text.match(LAB_PATTERNS.ldl);
  if (ldlMatch) {
    const value = parseInt(ldlMatch[1]);
    const severity = assessSeverity('ldl', value);
    tests.push({
      name: 'LDL Cholesterol',
      value,
      unit: 'mg/dL',
      severity,
      threshold: '<100 normal, 100-129 moderate, ≥130 high',
    });
    parsed_json.ldl = { value, unit: 'mg/dL', severity };
  }

  // Creatinine
  const creatMatch = text.match(LAB_PATTERNS.creatinine);
  if (creatMatch) {
    const value = parseFloat(creatMatch[1]);
    const severity = assessSeverity('creatinine', value);
    tests.push({
      name: 'Creatinine',
      value,
      unit: 'mg/dL',
      severity,
      threshold: '<1.2 normal, 1.2-1.4 moderate, ≥1.5 high',
    });
    parsed_json.creatinine = { value, unit: 'mg/dL', severity };
  }

  // Calculate overall severity
  const severityCounts = tests.reduce((acc, test) => {
    acc[test.severity] = (acc[test.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let overallSeverity: 'Low' | 'Moderate' | 'High' = 'Low';
  if (severityCounts.high > 0) overallSeverity = 'High';
  else if (severityCounts.moderate > 0) overallSeverity = 'Moderate';

  return { tests, overallSeverity, parsed_json };
}

export function generateVisitSummary(doctorNote: string): string[] {
  // Simple rule-based summary generation
  const bullets: string[] = [];
  
  if (doctorNote.toLowerCase().includes('complaint') || doctorNote.toLowerCase().includes('chief')) {
    const complaintMatch = doctorNote.match(/chief complaint[:\s]*([^.]+)/i);
    if (complaintMatch) {
      bullets.push(`Chief complaint: ${complaintMatch[1].trim()}`);
    }
  }
  
  if (doctorNote.toLowerCase().includes('history')) {
    bullets.push('Relevant medical history noted in record');
  }
  
  if (doctorNote.toLowerCase().includes('examination') || doctorNote.toLowerCase().includes('findings')) {
    bullets.push('Physical examination findings documented');
  }
  
  if (doctorNote.toLowerCase().includes('diagnosis') || doctorNote.toLowerCase().includes('assessment')) {
    const diagMatch = doctorNote.match(/diagnosis[:\s]*([^.]+)/i) || 
                      doctorNote.match(/assessment[:\s]*([^.]+)/i);
    if (diagMatch) {
      bullets.push(`Assessment: ${diagMatch[1].trim()}`);
    }
  }
  
  if (doctorNote.toLowerCase().includes('plan') || doctorNote.toLowerCase().includes('treatment')) {
    bullets.push('Treatment plan outlined in notes');
  }
  
  if (bullets.length === 0) {
    return [
      'Medical record reviewed',
      'Patient evaluation completed',
      'Clinical findings documented',
      'Management plan established',
      'Follow-up scheduled'
    ];
  }
  
  return bullets.slice(0, 5);
}
