import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Copy, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Pill, Shield, TrendingUp } from "lucide-react";
import { ParsedLab } from "@/utils/labParser";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ReportAnalysis } from "@/api/reportAnalysisApi";
import { AlertPanel } from "./AlertPanel";
import { generateAlertsFromAnalysis, storeAlerts, requestNotificationPermission } from "@/services/alertService";

interface AIAnalysisPanelProps {
  parsedLab: ParsedLab | null;
  visitSummary: string[];
  confidence?: number;
  reportAnalysis?: ReportAnalysis | null;
  patientId?: string;
}

export function AIAnalysisPanel({ 
  parsedLab, 
  visitSummary,
  confidence = 0.85,
  reportAnalysis,
  patientId
}: AIAnalysisPanelProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const { toast } = useToast();

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission().catch(console.error);
  }, []);

  // Generate alerts from analysis
  const alerts = reportAnalysis ? generateAlertsFromAnalysis(reportAnalysis) : [];

  // Store alerts for persistence
  useEffect(() => {
    if (patientId && alerts.length > 0) {
      storeAlerts(patientId, alerts);
    }
  }, [patientId, alerts]);

  // Use reportAnalysis confidence if available, otherwise use default
  const displayConfidence = reportAnalysis?.confidence ?? confidence;

  const handleCopy = async () => {
    const summaryText = [
      `Visit Summary:`,
      ...visitSummary.map(item => `• ${item}`),
      '',
      parsedLab && `Lab Analysis (${parsedLab.overallSeverity} severity):`,
      ...(parsedLab?.tests.map(test => 
        `• ${test.name}: ${test.value} ${test.unit} (${test.severity})`
      ) || []),
      '',
      reportAnalysis && `AI Assessment:`,
      reportAnalysis && reportAnalysis.aiSummary.severityAssessment,
      '',
      reportAnalysis && `Deviation from Normal:`,
      reportAnalysis && reportAnalysis.aiSummary.deviationFromNormal,
      '',
      reportAnalysis && reportAnalysis.aiSummary.recommendedMedicines.length > 0 && `Recommended Medicines:`,
      ...(reportAnalysis?.aiSummary.recommendedMedicines.map(med => `• ${med}`) || []),
      '',
      reportAnalysis && reportAnalysis.aiSummary.precautions.length > 0 && `Precautions:`,
      ...(reportAnalysis?.aiSummary.precautions.map(prec => `• ${prec}`) || []),
    ].filter(Boolean).join('\n');

    await navigator.clipboard.writeText(summaryText);
    toast({
      title: "Copied to clipboard",
      description: "AI analysis copied successfully",
    });
  };

  const getSeverityColor = (severity: string) => {
    const severityLower = severity.toLowerCase();
    switch (severityLower) {
      case 'critical':
        return 'destructive';
      case 'high':
      case 'very high':
        return 'destructive';
      case 'moderate':
        return 'warning';
      case 'low':
        return 'info';
      case 'normal':
      default:
        return 'success';
    }
  };

  const getSeverityClassName = (severity: string) => {
    const severityLower = severity.toLowerCase();
    switch (severityLower) {
      case 'critical':
        return 'severity-critical border-severity-critical';
      case 'high':
      case 'very high':
        return 'severity-high border-severity-high';
      case 'moderate':
        return 'severity-moderate border-severity-moderate';
      case 'low':
        return 'severity-low border-severity-low';
      case 'normal':
      default:
        return 'severity-normal border-severity-normal';
    }
  };

  return (
    <div className="space-y-4">
      {/* Alert Panel - Show at top if there are alerts */}
      {alerts.length > 0 && patientId && (
        <AlertPanel alerts={alerts} patientId={patientId} />
      )}

      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-2 shadow-lg">
        <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
            AI Assistance
          </h2>
          <p className="text-sm text-muted-foreground">
            For clinician review
          </p>
        </div>
        <Badge variant="outline" className="text-xs border-primary/50 bg-primary/10">
          Confidence: {Math.round(displayConfidence * 100)}%
        </Badge>
      </div>

      {/* Severity Badge */}
      {parsedLab && (
        <div className="mb-6">
          <Badge 
            variant={getSeverityColor(parsedLab.overallSeverity) as any}
            className={cn(
              "text-sm px-4 py-2 font-bold border-2 shadow-sm",
              getSeverityClassName(parsedLab.overallSeverity)
            )}
          >
            <AlertCircle size={16} className="mr-2" />
            Severity: {parsedLab.overallSeverity.toUpperCase()}
          </Badge>
        </div>
      )}

      {/* Visit Summary */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Visit Summary
        </h3>
        <ul className="space-y-2">
          {visitSummary.map((item, idx) => (
            <li key={idx} className="text-sm text-foreground flex gap-2">
              <span className="text-primary">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* AI Assessment */}
      {reportAnalysis && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle size={16} />
            AI Assessment
          </h3>
          <div className="p-3 bg-muted/50 rounded text-sm text-foreground">
            {reportAnalysis.aiSummary.severityAssessment}
          </div>
        </div>
      )}

      {/* Identified Conditions */}
      {reportAnalysis?.extractedData.identifiedConditions && reportAnalysis.extractedData.identifiedConditions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle size={16} />
            Identified Conditions
          </h3>
          <div className="space-y-3">
            {reportAnalysis.extractedData.identifiedConditions.map((condition, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "p-4 rounded-lg border-2 shadow-sm transition-all hover:shadow-md",
                  getSeverityClassName(condition.severity)
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">{condition.conditionName}</span>
                  <div className="flex gap-2">
                    <Badge 
                      variant={getSeverityColor(condition.severity) as any} 
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 border",
                        getSeverityClassName(condition.severity)
                      )}
                    >
                      {condition.severity}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {condition.likelihood} likelihood
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{condition.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disease Analysis */}
      {reportAnalysis?.aiSummary.diseaseAnalysis && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle size={16} />
            Disease Analysis
          </h3>
          <div className="p-3 bg-muted/50 rounded text-sm text-foreground whitespace-pre-wrap">
            {reportAnalysis.aiSummary.diseaseAnalysis}
          </div>
        </div>
      )}

      {/* Deviation from Normal */}
      {reportAnalysis && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp size={16} />
            Deviation from Normal
          </h3>
          <div className="p-3 bg-muted/50 rounded text-sm text-foreground whitespace-pre-wrap">
            {reportAnalysis.aiSummary.deviationFromNormal}
          </div>
        </div>
      )}

      {/* Lab Analysis */}
      {parsedLab && parsedLab.tests.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Lab Analysis
          </h3>
          <div className="space-y-3">
            {parsedLab.tests.map((test, idx) => (
              <div 
                key={idx}
                className={cn(
                  "p-4 rounded-lg border-l-4 shadow-sm transition-all hover:shadow-md hover:scale-[1.01]",
                  getSeverityClassName(test.severity)
                )}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">
                    {test.name}
                  </span>
                  <Badge 
                    variant={getSeverityColor(test.severity) as any}
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 border",
                      getSeverityClassName(test.severity)
                    )}
                  >
                    {test.severity}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-foreground">
                    {test.value}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {test.unit}
                  </span>
                </div>
                {test.clinicalSignificance && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    {test.clinicalSignificance}
                  </p>
                )}
                {test.threshold && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {test.threshold}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Medicines */}
      {reportAnalysis && reportAnalysis.aiSummary.recommendedMedicines.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Pill size={16} />
            Recommended Medicines
          </h3>
          <div className="space-y-2">
            {reportAnalysis.aiSummary.recommendedMedicines.map((medicine, idx) => (
              <div key={idx} className="p-2 bg-muted/50 rounded text-sm text-foreground">
                • {medicine}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 italic">
            Note: Medicine recommendations are AI-generated suggestions. Always consult with a qualified healthcare professional before prescribing.
          </p>
        </div>
      )}

      {/* Precautions */}
      {reportAnalysis && reportAnalysis.aiSummary.precautions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield size={16} />
            Precautions
          </h3>
          <div className="space-y-2">
            {reportAnalysis.aiSummary.precautions.map((precaution, idx) => (
              <div key={idx} className="p-2 bg-muted/50 rounded text-sm text-foreground">
                • {precaution}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lifestyle Recommendations */}
      {reportAnalysis?.aiSummary.lifestyleRecommendations && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield size={16} />
            Lifestyle Recommendations
          </h3>
          
          {reportAnalysis.aiSummary.lifestyleRecommendations.diet && reportAnalysis.aiSummary.lifestyleRecommendations.diet.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-foreground mb-2">Diet:</h4>
              <div className="space-y-1">
                {reportAnalysis.aiSummary.lifestyleRecommendations.diet.map((item, idx) => (
                  <div key={idx} className="p-2 bg-muted/50 rounded text-sm text-foreground">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportAnalysis.aiSummary.lifestyleRecommendations.exercise && reportAnalysis.aiSummary.lifestyleRecommendations.exercise.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-foreground mb-2">Exercise:</h4>
              <div className="space-y-1">
                {reportAnalysis.aiSummary.lifestyleRecommendations.exercise.map((item, idx) => (
                  <div key={idx} className="p-2 bg-muted/50 rounded text-sm text-foreground">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportAnalysis.aiSummary.lifestyleRecommendations.monitoring && reportAnalysis.aiSummary.lifestyleRecommendations.monitoring.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-foreground mb-2">Monitoring:</h4>
              <div className="space-y-1">
                {reportAnalysis.aiSummary.lifestyleRecommendations.monitoring.map((item, idx) => (
                  <div key={idx} className="p-2 bg-muted/50 rounded text-sm text-foreground">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportAnalysis.aiSummary.lifestyleRecommendations.warningSigns && reportAnalysis.aiSummary.lifestyleRecommendations.warningSigns.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-destructive mb-2">⚠️ Warning Signs to Watch For:</h4>
              <div className="space-y-1">
                {reportAnalysis.aiSummary.lifestyleRecommendations.warningSigns.map((item, idx) => (
                  <div key={idx} className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-foreground">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Recommendations */}
      {reportAnalysis?.aiSummary.additionalRecommendations && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle size={16} />
            Additional Recommendations
          </h3>
          
          {reportAnalysis.aiSummary.additionalRecommendations.specialistReferrals && reportAnalysis.aiSummary.additionalRecommendations.specialistReferrals.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-foreground mb-2">Specialist Referrals:</h4>
              <div className="space-y-1">
                {reportAnalysis.aiSummary.additionalRecommendations.specialistReferrals.map((item, idx) => (
                  <div key={idx} className="p-2 bg-muted/50 rounded text-sm text-foreground">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportAnalysis.aiSummary.additionalRecommendations.furtherTests && reportAnalysis.aiSummary.additionalRecommendations.furtherTests.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-foreground mb-2">Further Tests Recommended:</h4>
              <div className="space-y-1">
                {reportAnalysis.aiSummary.additionalRecommendations.furtherTests.map((item, idx) => (
                  <div key={idx} className="p-2 bg-muted/50 rounded text-sm text-foreground">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportAnalysis.aiSummary.additionalRecommendations.followUp && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-foreground mb-2">Follow-up:</h4>
              <div className="p-2 bg-muted/50 rounded text-sm text-foreground">
                {reportAnalysis.aiSummary.additionalRecommendations.followUp}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Raw JSON Toggle */}
      {parsedLab && (
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRawJson(!showRawJson)}
            className="w-full justify-between"
          >
            <span className="text-xs font-medium">Parsed JSON</span>
            {showRawJson ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
          {showRawJson && (
            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
              {JSON.stringify(parsedLab.parsed_json, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Clinical Note */}
      <div className="p-3 bg-accent/10 border border-accent rounded mb-4">
        <p className="text-xs text-foreground">
          <strong>Clinician to confirm:</strong> AI analysis provides supportive information only. 
          Clinical judgment required for all decisions.
        </p>
      </div>

      {/* Action Button */}
      <Button 
        onClick={handleCopy}
        variant="outline"
        className="w-full"
      >
        <Copy size={16} className="mr-2" />
        Copy to Note
      </Button>
      </Card>
    </div>
  );
}
