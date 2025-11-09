import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Patient, DoctorReport, TestReport, getPatient, getDoctorReports, getTestReports } from "@/api/mockApi";
import { PatientHeader } from "@/components/PatientHeader";
import { ReportsList } from "@/components/ReportsList";
import { AIAnalysisPanel } from "@/components/AIAnalysisPanel";
import { parseLabReport, generateVisitSummary, ParsedLab } from "@/utils/labParser";
import { ReportAnalysis } from "@/api/reportAnalysisApi";
import { ReportUploadDialog } from "@/components/ReportUploadDialog";
import { PrescriptionUploadDialog } from "@/components/PrescriptionUploadDialog";
import { MedicationList } from "@/components/MedicationList";
import { PrescriptionData } from "@/api/prescriptionApi";
import { getUser } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { VisitNotesGenerator } from "@/components/VisitNotesGenerator";
import { VisitNote, PatientContext } from "@/api/visitNotesApi";
import { VoiceSymptomChecker } from "@/components/VoiceSymptomChecker";

export default function PatientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctorReports, setDoctorReports] = useState<DoctorReport[]>([]);
  const [testReports, setTestReports] = useState<TestReport[]>([]);
  const [parsedLab, setParsedLab] = useState<ParsedLab | null>(null);
  const [visitSummary, setVisitSummary] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [selectedReportAnalysis, setSelectedReportAnalysis] = useState<ReportAnalysis | null>(null);
  const [prescriptions, setPrescriptions] = useState<Array<{
    id: string;
    date: string;
    type: string;
    snippet: string;
    content: string;
    prescriptionData?: PrescriptionData;
  }>>([]);
  const [currentMedications, setCurrentMedications] = useState<PrescriptionData['medications']>([]);

  useEffect(() => {
    async function loadPatientData() {
      if (!id) return;

      setIsLoading(true);
      try {
        // Check if user is a patient trying to access their own data
        const currentUser = getUser();
        if (currentUser?.userType === 'patient') {
          // Patient can only access their own data
          if (currentUser.patientId?.toUpperCase() !== id.toUpperCase()) {
            toast({
              title: "Access Denied",
              description: "You can only access your own medical records.",
              variant: "destructive",
            });
            navigate('/');
            return;
          }
        }

        const [patientData, doctorData, testData] = await Promise.all([
          getPatient(id),
          getDoctorReports(id),
          getTestReports(id),
        ]);

        if (!patientData) {
          navigate('/');
          return;
        }

        setPatient(patientData);
        setDoctorReports(doctorData);
        setTestReports(testData);

        // Parse latest test report (prioritize AI-analyzed reports)
        if (testData.length > 0) {
          const latestTest = testData[0];
          // If report has AI analysis, use it; otherwise parse content
          if (latestTest.aiAnalysis) {
            const aiData = latestTest.aiAnalysis;
            setParsedLab({
              tests: aiData.extractedData.tests,
              overallSeverity: aiData.extractedData.overallSeverity,
              parsed_json: aiData.extractedData.tests.reduce((acc, test) => {
                acc[test.name.toLowerCase().replace(/\s+/g, '_')] = {
                  value: test.value,
                  unit: test.unit,
                  severity: test.severity,
                };
                return acc;
              }, {} as Record<string, any>),
            });
            setSelectedReportAnalysis({
              extractedData: aiData.extractedData,
              aiSummary: aiData.aiSummary,
              confidence: aiData.confidence,
              reportId: latestTest.id,
              date: latestTest.date,
            });
          } else {
            const parsed = parseLabReport(latestTest.content);
            setParsedLab(parsed);
            setSelectedReportAnalysis(null);
          }
        }

        // Generate visit summary from latest doctor report
        if (doctorData.length > 0) {
          const latestDoctor = doctorData[0];
          const summary = generateVisitSummary(latestDoctor.content);
          setVisitSummary(summary);
        }
      } catch (error) {
        console.error('Error loading patient data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPatientData();
  }, [id, navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  const handleUploadSuccess = (analysis: ReportAnalysis) => {
    // Create new test report from analysis
    const newReport: TestReport = {
      id: analysis.reportId,
      date: analysis.date,
      type: 'AI-Analyzed Test Report',
      snippet: `AI Analysis: ${analysis.extractedData.overallSeverity} severity - ${analysis.extractedData.tests.length} tests analyzed`,
      content: `AI-Generated Report Analysis\n\n${analysis.aiSummary.severityAssessment}\n\n${analysis.aiSummary.deviationFromNormal}`,
      aiAnalysis: {
        extractedData: analysis.extractedData,
        aiSummary: analysis.aiSummary,
        confidence: analysis.confidence,
      },
    };

    // Add to test reports (prepend to show latest first)
    setTestReports((prev) => [newReport, ...prev]);

    // Update parsed lab and selected analysis
    setParsedLab({
      tests: analysis.extractedData.tests,
      overallSeverity: analysis.extractedData.overallSeverity,
      parsed_json: analysis.extractedData.tests.reduce((acc, test) => {
        acc[test.name.toLowerCase().replace(/\s+/g, '_')] = {
          value: test.value,
          unit: test.unit,
          severity: test.severity,
        };
        return acc;
      }, {} as Record<string, any>),
    });
    setSelectedReportAnalysis(analysis);
  };

  const handlePrescriptionUploadSuccess = (prescription: PrescriptionData) => {
    // Create new prescription record
    const newPrescription = {
      id: prescription.prescriptionId,
      date: prescription.date,
      type: 'Prescription',
      snippet: `${prescription.medications.length} medications - ${prescription.doctorName || 'Doctor'} - ${prescription.diagnosis || 'No diagnosis'}`,
      content: `Prescription Details\n\nDoctor: ${prescription.doctorName || 'Not specified'}\nDate: ${new Date(prescription.date).toLocaleDateString()}\nDiagnosis: ${prescription.diagnosis || 'Not specified'}\n\nMedications:\n${prescription.medications.map(m => `- ${m.name} (${m.dosage}) - ${m.frequency} for ${m.duration}`).join('\n')}\n\n${prescription.additionalNotes || ''}`,
      prescriptionData: prescription,
    };

    // Add to prescriptions (prepend to show latest first)
    setPrescriptions((prev) => [newPrescription, ...prev]);

    // Update current medications (combine with existing)
    setCurrentMedications((prev) => {
      const combined = [...prev, ...prescription.medications];
      // Remove duplicates based on medication name
      const unique = combined.filter((med, index, self) =>
        index === self.findIndex((m) => m.name.toLowerCase() === med.name.toLowerCase())
      );
      return unique;
    });
  };

  if (!patient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PatientHeader 
        patient={patient} 
        onBack={() => {
          // If patient, redirect to login (they can't access search page)
          const currentUser = getUser();
          if (currentUser?.userType === 'patient') {
            navigate('/login');
          } else {
            navigate('/');
          }
        }}
        syncStatus="synced"
      />

      <main className="container mx-auto px-4 py-8">
        <div className={`grid grid-cols-1 gap-6 ${getUser()?.userType === 'provider' ? 'lg:grid-cols-12' : ''}`}>
          {/* Left Column - Reports (8 cols on desktop for providers, full width for patients) */}
          <div className={getUser()?.userType === 'provider' ? 'lg:col-span-8 space-y-6' : 'space-y-6'}>
            <ReportsList 
              doctorReports={doctorReports}
              testReports={testReports}
              prescriptions={prescriptions}
              onUploadClick={getUser()?.userType === 'provider' ? () => setUploadDialogOpen(true) : undefined}
              onPrescriptionUploadClick={getUser()?.userType === 'provider' ? () => setPrescriptionDialogOpen(true) : undefined}
            />
            
            {/* Current Medications */}
            {currentMedications.length > 0 && (
              <MedicationList 
                medications={currentMedications}
                interactions={prescriptions[0]?.prescriptionData?.interactions}
            />
            )}
          </div>

          {/* Right Column - AI Panel (4 cols on desktop for providers, full width for patients) */}
          {getUser()?.userType === 'provider' ? (
          <div className="lg:col-span-4 space-y-6">
            <AIAnalysisPanel
              parsedLab={parsedLab}
              visitSummary={visitSummary}
              reportAnalysis={selectedReportAnalysis}
                patientId={id}
            />
            
            {/* Visit Notes Generator - Only for providers */}
            {patient && id && (
              <VisitNotesGenerator
                patientId={id}
                patientContext={{
                  name: patient.name,
                  age: patient.age,
                  sex: patient.sex,
                  pastMedicalHistory: doctorReports.length > 0 ? [doctorReports[0].content.substring(0, 200)] : undefined,
                  currentMedications: currentMedications.map(med => ({
                    name: med.name,
                    dosage: med.dosage,
                  })),
                  recentTestResults: testReports.length > 0 ? testReports[0].snippet : undefined,
                }}
                onSave={(visitNote) => {
                  // TODO: Save visit note to backend
                  console.log('Visit note to save:', visitNote);
                  toast({
                    title: "Visit note generated",
                    description: "Visit note has been generated. Integration with backend storage coming soon.",
                  });
                }}
              />
            )}
            
            {/* Voice Symptom Checker - Available for providers */}
            {patient && (
              <VoiceSymptomChecker
                patientContext={{
                  age: patient.age,
                  sex: patient.sex,
                  existingConditions: doctorReports.length > 0 ? [doctorReports[0].content.substring(0, 100)] : undefined,
                  currentMedications: currentMedications.map(med => med.name),
                  allergies: patient.allergies || undefined,
                }}
              />
            )}
          </div>
          ) : (
          /* For patients: Show Voice Symptom Checker in full width */
          patient && (
            <div className="space-y-6 mt-6">
              <VoiceSymptomChecker
                patientContext={{
                  age: patient.age,
                  sex: patient.sex,
                  existingConditions: doctorReports.length > 0 ? [doctorReports[0].content.substring(0, 100)] : undefined,
                  currentMedications: currentMedications.map(med => med.name),
                  allergies: patient.allergies || undefined,
                }}
              />
            </div>
          )
          )}
        </div>
      </main>

      {/* Upload Dialogs - Only for providers */}
      {id && getUser()?.userType === 'provider' && (
        <>
        <ReportUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          patientId={id}
          onUploadSuccess={handleUploadSuccess}
        />
          <PrescriptionUploadDialog
            open={prescriptionDialogOpen}
            onOpenChange={setPrescriptionDialogOpen}
            patientId={id}
            onUploadSuccess={handlePrescriptionUploadSuccess}
          />
        </>
      )}
    </div>
  );
}
