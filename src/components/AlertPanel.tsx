import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AlertCircle, X, Bell, CheckCircle2, AlertTriangle } from "lucide-react";
import { Alert, AlertSeverity, acknowledgeAlert, showBrowserNotification } from "@/services/alertService";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AlertPanelProps {
  alerts: Alert[];
  patientId?: string;
  onAcknowledge?: (alertId: string) => void;
  className?: string;
}

export function AlertPanel({ alerts, patientId, onAcknowledge, className }: AlertPanelProps) {
  const { toast } = useToast();
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // Filter out acknowledged alerts
    const unacknowledged = alerts.filter((alert) => !alert.acknowledged);
    setUnacknowledgedAlerts(unacknowledged);

    // Show notifications for new critical/high alerts
    if (unacknowledged.length > 0) {
      unacknowledged
        .filter((alert) => alert.severity === 'critical' || alert.severity === 'high')
        .forEach((alert) => {
          showBrowserNotification(alert);
        });
    }
  }, [alerts]);

  const handleAcknowledge = (alertId: string) => {
    if (patientId) {
      acknowledgeAlert(patientId, alertId);
    }
    
    setUnacknowledgedAlerts((prev) =>
      prev.filter((alert) => alert.id !== alertId)
    );

    if (onAcknowledge) {
      onAcknowledge(alertId);
    }

    toast({
      title: "Alert acknowledged",
      description: "The alert has been marked as reviewed",
    });
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getSeverityClassName = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'severity-critical border-severity-critical bg-severity-critical-bg';
      case 'high':
        return 'severity-high border-severity-high bg-severity-high-bg';
      case 'medium':
        return 'severity-moderate border-severity-moderate bg-severity-moderate-bg';
      case 'low':
        return 'severity-low border-severity-low bg-severity-low-bg';
      default:
        return '';
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (unacknowledgedAlerts.length === 0) {
    return null;
  }

  // Sort alerts by severity (critical first)
  const sortedAlerts = [...unacknowledgedAlerts].sort((a, b) => {
    const severityOrder: Record<AlertSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const criticalAlerts = sortedAlerts.filter((a) => a.severity === 'critical');
  const highAlerts = sortedAlerts.filter((a) => a.severity === 'high');
  const otherAlerts = sortedAlerts.filter((a) => a.severity !== 'critical' && a.severity !== 'high');

  return (
    <Card className={cn(
      "p-4 border-2 shadow-lg bg-gradient-to-br",
      criticalAlerts.length > 0 && "from-red-950/50 to-red-900/30 border-red-500",
      criticalAlerts.length === 0 && highAlerts.length > 0 && "from-orange-950/50 to-orange-900/30 border-orange-500",
      criticalAlerts.length === 0 && highAlerts.length === 0 && "from-yellow-950/50 to-yellow-900/30 border-yellow-500",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-destructive/20">
            <Bell className="h-5 w-5 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold bg-gradient-to-r from-destructive to-orange-500 bg-clip-text text-transparent">
            Active Alerts
          </h3>
          <Badge variant="destructive" className="ml-2 border-2 font-bold">
            {unacknowledgedAlerts.length}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        {/* Critical Alerts */}
        {criticalAlerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "p-4 rounded-lg border-2 shadow-sm transition-all hover:shadow-md",
              "severity-critical border-severity-critical bg-severity-critical-bg",
              "flex items-start justify-between gap-3"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getSeverityIcon(alert.severity)}
                <span className="font-semibold text-sm">{alert.title}</span>
                <Badge variant="destructive" className="text-xs">
                  Critical
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
              {alert.testName && alert.testValue && (
                <div className="mt-2 text-xs font-mono text-muted-foreground">
                  {alert.testName}: {alert.testValue}
                </div>
              )}
              {alert.conditionName && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Condition: {alert.conditionName}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => handleAcknowledge(alert.id)}
              title="Acknowledge alert"
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {/* High Alerts */}
        {highAlerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "p-4 rounded-lg border-2 shadow-sm transition-all hover:shadow-md",
              "severity-high border-severity-high bg-severity-high-bg",
              "flex items-start justify-between gap-3"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getSeverityIcon(alert.severity)}
                <span className="font-semibold text-sm">{alert.title}</span>
                <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                  High
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
              {alert.testName && alert.testValue && (
                <div className="mt-2 text-xs font-mono text-muted-foreground">
                  {alert.testName}: {alert.testValue}
                </div>
              )}
              {alert.conditionName && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Condition: {alert.conditionName}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => handleAcknowledge(alert.id)}
              title="Acknowledge alert"
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {/* Other Alerts */}
        {otherAlerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "p-4 rounded-lg border-2 shadow-sm transition-all hover:shadow-md",
              getSeverityClassName(alert.severity),
              "flex items-start justify-between gap-3"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getSeverityIcon(alert.severity)}
                <span className="font-semibold text-sm">{alert.title}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => handleAcknowledge(alert.id)}
              title="Acknowledge alert"
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

    </Card>
  );
}

