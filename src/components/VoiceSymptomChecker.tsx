import { useState, useRef, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Mic, 
  MicOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  Pill,
  Heart,
  Stethoscope,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analyzeSymptoms, SymptomAnalysis } from "@/api/symptomAnalysisApi";
import { cn } from "@/lib/utils";

interface VoiceSymptomCheckerProps {
  patientContext?: {
    age?: number;
    sex?: string;
    existingConditions?: string[];
    currentMedications?: string[];
    allergies?: string[];
  };
  onClose?: () => void;
}

export function VoiceSymptomChecker({ patientContext, onClose }: VoiceSymptomCheckerProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast({
          title: "Speech Recognition Not Available",
          description: "Your browser doesn't support speech recognition. Please use Chrome or Edge.",
          variant: "destructive",
        });
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Can be changed to 'hi-IN' for Hindi

      recognition.onstart = () => {
        setIsListening(true);
        console.log('Speech recognition started');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = finalTranscriptRef.current;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        finalTranscriptRef.current = finalTranscript;
        setTranscribedText(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setIsListening(false);
        
        if (event.error === 'no-speech') {
          toast({
            title: "No Speech Detected",
            description: "Please speak clearly into your microphone.",
            variant: "destructive",
          });
        } else if (event.error === 'not-allowed') {
          toast({
            title: "Microphone Permission Denied",
            description: "Please allow microphone access to use voice input.",
            variant: "destructive",
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (isRecording) {
          // Restart recognition if still recording
          try {
            recognition.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording, toast]);

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Speech Recognition Not Available",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    try {
      finalTranscriptRef.current = "";
      setTranscribedText("");
      setAnalysis(null);
      setIsRecording(true);
      recognitionRef.current.start();
      toast({
        title: "Recording Started",
        description: "Speak clearly about your symptoms. Click Stop when finished.",
      });
    } catch (error) {
      console.error('Error starting recognition:', error);
      toast({
        title: "Error Starting Recording",
        description: "Could not start voice recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
      
      // Use the final transcript
      const finalText = finalTranscriptRef.current.trim();
      setTranscribedText(finalText);
      
      if (finalText) {
        toast({
          title: "Recording Stopped",
          description: "Analyzing your symptoms...",
        });
        handleAnalyzeSymptoms(finalText);
      } else {
        toast({
          title: "No Audio Captured",
          description: "Please try speaking again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleAnalyzeSymptoms = async (text: string) => {
    if (!text.trim()) {
      toast({
        title: "No Text to Analyze",
        description: "Please describe your symptoms.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeSymptoms({
        symptomDescription: text,
        patientContext,
      });
      setAnalysis(result);
      
      // Show alert if doctor visit is recommended
      if (result.doctorVisitRecommended) {
        toast({
          title: "Doctor Visit Recommended",
          description: `Urgency: ${result.doctorVisitUrgency.toUpperCase()}. ${result.doctorVisitReason}`,
          variant: result.doctorVisitUrgency === 'emergency' || result.doctorVisitUrgency === 'urgent' 
            ? "destructive" 
            : "default",
        });
      }
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze symptoms. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };


  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'destructive';
      case 'severe':
        return 'destructive';
      case 'moderate':
        return 'warning';
      case 'mild':
      default:
        return 'success';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'emergency':
        return 'destructive';
      case 'urgent':
        return 'destructive';
      case 'soon':
        return 'warning';
      case 'routine':
      default:
        return 'info';
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-2 shadow-lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Voice Symptom Checker
            </h3>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Describe your symptoms by speaking, and our AI will provide medical advice, medication suggestions, and recommend if you need to see a doctor.
        </p>

        {/* Voice Input Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                className="w-full"
                size="lg"
              >
                <Mic className="mr-2 h-5 w-5" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <MicOff className="mr-2 h-5 w-5" />
                {isListening ? "Stop Recording" : "Processing..."}
              </Button>
            )}
          </div>

          {/* Transcription Display */}
          {transcribedText && (
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium mb-2">Your Description:</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {transcribedText}
              </p>
              {!isAnalyzing && !analysis && (
                <Button
                  onClick={() => handleAnalyzeSymptoms(transcribedText)}
                  className="mt-3"
                  size="sm"
                >
                  Analyze Symptoms
                </Button>
              )}
            </div>
          )}

          {/* Analysis Loading */}
          {isAnalyzing && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-sm text-muted-foreground">
                Analyzing symptoms...
              </span>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-4 pt-4 border-t">
              {/* Severity Badge */}
              <div className="flex items-center gap-2">
                <Badge
                  variant={getSeverityColor(analysis.severity) as any}
                  className={cn(
                    "text-sm px-3 py-1.5 font-bold border-2",
                    analysis.severity === 'critical' || analysis.severity === 'severe'
                      ? "severity-critical border-severity-critical"
                      : analysis.severity === 'moderate'
                      ? "severity-moderate border-severity-moderate"
                      : "severity-normal border-severity-normal"
                  )}
                >
                  <AlertCircle className="h-4 w-4 mr-1.5" />
                  Severity: {analysis.severity.toUpperCase()}
                </Badge>
              </div>

              {/* Doctor Visit Recommendation */}
              {analysis.doctorVisitRecommended && (
                <Card className={cn(
                  "p-4 border-2 shadow-lg",
                  analysis.doctorVisitUrgency === 'emergency' || analysis.doctorVisitUrgency === 'urgent'
                    ? "severity-critical border-severity-critical bg-severity-critical-bg animate-pulse"
                    : "severity-moderate border-severity-moderate bg-severity-moderate-bg"
                )}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-destructive/20">
                      <Stethoscope className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-sm bg-gradient-to-r from-destructive to-orange-500 bg-clip-text text-transparent">
                          🚨 Doctor Visit Recommended
                        </h4>
                        <Badge
                          variant={getUrgencyColor(analysis.doctorVisitUrgency) as any}
                          className={cn(
                            "text-xs font-bold border-2",
                            analysis.doctorVisitUrgency === 'emergency' || analysis.doctorVisitUrgency === 'urgent'
                              ? "severity-critical border-severity-critical"
                              : "severity-moderate border-severity-moderate"
                          )}
                        >
                          {analysis.doctorVisitUrgency.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground mb-3">
                        {analysis.doctorVisitReason}
                      </p>
                      {analysis.warningSigns.length > 0 && (
                        <div className="mt-3 p-3 bg-background/50 rounded-lg border">
                          <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                            Warning Signs to Watch For:
                          </p>
                          <ul className="text-xs text-foreground list-disc list-inside space-y-1">
                            {analysis.warningSigns.map((sign, index) => (
                              <li key={index}>{sign}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Potential Conditions */}
              {analysis.potentialConditions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <AlertCircle className="h-4 w-4 text-primary" />
                    </div>
                    Possible Conditions
                  </h4>
                  <div className="space-y-2">
                    {analysis.potentialConditions.map((condition, index) => (
                      <Card key={index} className="p-3 border-2 shadow-sm bg-gradient-to-r from-card to-card/30">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-semibold text-foreground">{condition.condition}</span>
                          <Badge variant="outline" className="text-xs border-primary/50 bg-primary/10">
                            {condition.likelihood} likelihood
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{condition.explanation}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Medications */}
              {analysis.recommendedMedications.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Pill className="h-4 w-4 text-primary" />
                    </div>
                    Recommended Medications
                  </h4>
                  <div className="space-y-2">
                    {analysis.recommendedMedications.map((med, index) => (
                      <Card key={index} className="p-3 border-2 shadow-sm bg-gradient-to-r from-card to-card/30">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-semibold text-foreground">{med.name}</span>
                          {med.dosage && (
                            <Badge variant="outline" className="text-xs border-primary/50 bg-primary/10">
                              {med.dosage} {med.frequency && `• ${med.frequency}`}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {med.indication}
                        </p>
                        {med.note && (
                          <div className="p-2 bg-warning/10 border border-warning/20 rounded">
                            <p className="text-xs text-warning font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {med.note}
                            </p>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Self-Care Recommendations */}
              {analysis.selfCareRecommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-success/10">
                      <Heart className="h-4 w-4 text-success" />
                    </div>
                    Self-Care Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {analysis.selfCareRecommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-foreground flex gap-2 p-2 bg-muted/30 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* General Advice */}
              {analysis.advice.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Medical Advice</h4>
                  <ul className="space-y-1">
                    {analysis.advice.map((advice, index) => (
                      <li key={index} className="text-sm text-foreground flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{advice}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-Up Instructions */}
              {analysis.followUpInstructions && (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <h4 className="text-sm font-semibold mb-2">Follow-Up Instructions</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {analysis.followUpInstructions}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

