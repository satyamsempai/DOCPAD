import { Patient } from "@/api/mockApi";
import { Card } from "./ui/card";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientResultListProps {
  results: Patient[];
  selectedIndex: number;
  onSelect: (patient: Patient) => void;
  highlightedId?: string;
}

export function PatientResultList({ 
  results, 
  selectedIndex, 
  onSelect,
  highlightedId 
}: PatientResultListProps) {
  if (results.length === 0) return null;

  const maskPhone = (phone: string) => {
    return phone.slice(0, 4) + '****' + phone.slice(-2);
  };

  return (
    <div className="space-y-2 mt-4">
      {results.map((patient, idx) => (
        <Card
          key={patient.id}
          className={cn(
            "p-4 cursor-pointer transition-all duration-150",
            "hover:border-primary hover:shadow-sm",
            selectedIndex === idx && "border-primary shadow-sm",
            highlightedId === patient.id && "border-accent border-2 animate-pulse"
          )}
          onClick={() => onSelect(patient)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSelect(patient);
          }}
          aria-label={`Select patient ${patient.name}`}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded bg-muted flex items-center justify-center">
              <User className="text-muted-foreground" size={24} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 mb-1">
                <h3 className="text-base font-semibold text-foreground">
                  {patient.name}
                </h3>
                <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {patient.id}
                </code>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{patient.age}y • {patient.sex}</span>
                <span>•</span>
                <span>{patient.village}</span>
                <span>•</span>
                <span>Last visit: {new Date(patient.lastVisit).toLocaleDateString('en-IN')}</span>
              </div>
              
              <div className="mt-2 text-xs text-muted-foreground">
                {maskPhone(patient.phone)}
              </div>
            </div>
            
            {patient.confidence && (
              <div className="flex-shrink-0">
                <div 
                  className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"
                  title={`Confidence: ${Math.round(patient.confidence * 100)}%`}
                >
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${patient.confidence * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  {Math.round(patient.confidence * 100)}%
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
