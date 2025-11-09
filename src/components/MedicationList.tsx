import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Pill, AlertTriangle, AlertCircle } from "lucide-react";
import { Medication, DrugInteraction, InteractionCheck } from "@/api/prescriptionApi";
import { cn } from "@/lib/utils";

interface MedicationListProps {
  medications: Medication[];
  interactions?: InteractionCheck;
  className?: string;
}

export function MedicationList({ medications, interactions, className }: MedicationListProps) {
  if (medications.length === 0) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="text-center py-8 text-muted-foreground">
          <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No medications recorded</p>
        </div>
      </Card>
    );
  }

  const getSeverityColor = (severity: DrugInteraction['severity']) => {
    switch (severity) {
      case 'contraindicated':
      case 'severe':
        return 'destructive';
      case 'moderate':
        return 'warning';
      case 'mild':
        return 'info';
      default:
        return 'default';
    }
  };

  const getSeverityClassName = (severity: DrugInteraction['severity']) => {
    switch (severity) {
      case 'contraindicated':
      case 'severe':
        return 'severity-critical border-severity-critical bg-severity-critical-bg';
      case 'moderate':
        return 'severity-moderate border-severity-moderate bg-severity-moderate-bg';
      case 'mild':
        return 'severity-low border-severity-low bg-severity-low-bg';
      default:
        return '';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drug Interactions Alert */}
      {interactions && interactions.hasInteractions && (
        <Card className={cn(
          "p-4 border-2 shadow-lg bg-gradient-to-br",
          interactions.interactions.some(i => i.interaction.severity === 'severe' || i.interaction.severity === 'contraindicated') 
            ? "from-red-950/50 to-red-900/30 border-red-500"
            : "from-orange-950/50 to-orange-900/30 border-orange-500"
        )}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-destructive to-orange-500 bg-clip-text text-transparent">
              Drug Interactions Detected
            </h3>
          </div>
          <div className="space-y-3">
            {interactions.interactions.map((interaction, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "p-3 rounded-lg border-2 shadow-sm",
                  getSeverityClassName(interaction.interaction.severity)
                )}
              >
                <div className="font-semibold text-sm mb-2">
                  {interaction.medications.join(' + ')}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    variant={getSeverityColor(interaction.interaction.severity) as any} 
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 border",
                      getSeverityClassName(interaction.interaction.severity)
                    )}
                  >
                    {interaction.interaction.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  {interaction.interaction.description}
                </p>
                <p className="text-xs font-medium text-foreground mt-2">
                  Recommendation: {interaction.interaction.recommendation}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Medications List */}
      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-2 shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Pill className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Current Medications
          </h3>
          <Badge variant="outline" className="ml-auto border-primary/50 bg-primary/10">
            {medications.length}
          </Badge>
        </div>

        <div className="space-y-3">
          {medications.map((medication, index) => (
            <div
              key={index}
              className="p-4 border-2 rounded-lg hover:bg-muted/50 transition-all hover:shadow-md bg-gradient-to-r from-card to-card/30"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">
                    {medication.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    {medication.dosage && (
                      <div>
                        <span className="font-medium">Dosage:</span> {medication.dosage}
                      </div>
                    )}
                    {medication.frequency && (
                      <div>
                        <span className="font-medium">Frequency:</span> {medication.frequency}
                      </div>
                    )}
                    {medication.duration && (
                      <div>
                        <span className="font-medium">Duration:</span> {medication.duration}
                      </div>
                    )}
                    {medication.quantity && (
                      <div>
                        <span className="font-medium">Quantity:</span> {medication.quantity}
                      </div>
                    )}
                  </div>
                  {medication.instructions && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium">Instructions:</span> {medication.instructions}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

