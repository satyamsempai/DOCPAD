import { useState } from "react";
import { DoctorReport, TestReport } from "@/api/mockApi";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { FileText, FlaskConical, Upload, Sparkles, Pill } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { PrescriptionData } from "@/api/prescriptionApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { cn } from "@/lib/utils";

interface Prescription {
  id: string;
  date: string;
  type: string;
  snippet: string;
  content: string;
  prescriptionData?: PrescriptionData;
}

interface ReportsListProps {
  doctorReports: DoctorReport[];
  testReports: TestReport[];
  prescriptions?: Prescription[];
  onUploadClick?: () => void;
  onPrescriptionUploadClick?: () => void;
}

export function ReportsList({ 
  doctorReports, 
  testReports, 
  prescriptions = [],
  onUploadClick,
  onPrescriptionUploadClick 
}: ReportsListProps) {
  const [selectedReport, setSelectedReport] = useState<(DoctorReport | TestReport | Prescription) | null>(null);

  const ReportCard = ({ 
    report, 
    icon: Icon 
  }: { 
    report: DoctorReport | TestReport | Prescription; 
    icon: typeof FileText 
  }) => {
    const isAIAnalyzed = ('aiAnalysis' in report && report.aiAnalysis) || ('prescriptionData' in report && report.prescriptionData);
    
    return (
      <Card 
        className={cn(
          "p-4 hover:border-primary cursor-pointer transition-all shadow-sm hover:shadow-md",
          isAIAnalyzed && "border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent"
        )}
        onClick={() => setSelectedReport(report)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setSelectedReport(report);
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
            <Icon className="text-primary" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-1 gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {report.type}
                </h4>
                {isAIAnalyzed && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI
                  </Badge>
                )}
              </div>
              <time className="text-xs text-muted-foreground flex-shrink-0">
                {new Date(report.date).toLocaleDateString('en-IN', { 
                  day: '2-digit', 
                  month: 'short' 
                })}
              </time>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {report.snippet}
            </p>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <>
      <Tabs defaultValue="doctor" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="doctor"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <FileText size={16} className="mr-2" />
            Doctor Reports
          </TabsTrigger>
          <TabsTrigger 
            value="tests"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <FlaskConical size={16} className="mr-2" />
            Test Reports
          </TabsTrigger>
          <TabsTrigger 
            value="prescriptions"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Pill size={16} className="mr-2" />
            Prescriptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="doctor" className="mt-4 space-y-3">
          {doctorReports.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No doctor reports available</p>
            </Card>
          ) : (
            doctorReports.map(report => (
              <ReportCard key={report.id} report={report} icon={FileText} />
            ))
          )}
        </TabsContent>

        <TabsContent value="tests" className="mt-4 space-y-3">
          {onUploadClick && (
            <Button
              onClick={onUploadClick}
              className="w-full mb-4"
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Test Report
            </Button>
          )}
          {testReports.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No test reports available</p>
              {onUploadClick && (
                <Button
                  onClick={onUploadClick}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload First Report
                </Button>
              )}
            </Card>
          ) : (
            testReports.map(report => (
              <ReportCard key={report.id} report={report} icon={FlaskConical} />
            ))
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-4 space-y-3">
          {onPrescriptionUploadClick && (
            <Button
              onClick={onPrescriptionUploadClick}
              className="w-full mb-4"
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Prescription
            </Button>
          )}
          {prescriptions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No prescriptions available</p>
              {onPrescriptionUploadClick && (
                <Button
                  onClick={onPrescriptionUploadClick}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload First Prescription
                </Button>
              )}
            </Card>
          ) : (
            prescriptions.map(report => (
              <ReportCard key={report.id} report={report} icon={Pill} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedReport?.type}
            </DialogTitle>
            <time className="text-sm text-muted-foreground">
              {selectedReport && new Date(selectedReport.date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </time>
          </DialogHeader>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
            {selectedReport?.content}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
