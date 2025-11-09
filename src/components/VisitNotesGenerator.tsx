import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Loader2, Sparkles, Copy, CheckCircle2, FileText, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateVisitNote, VisitNote, PatientContext as VisitNotesPatientContext } from "@/api/visitNotesApi";
import { cn } from "@/lib/utils";

interface VisitNotesGeneratorProps {
  patientId: string;
  patientContext?: VisitNotesPatientContext;
  onSave?: (visitNote: VisitNote) => void;
}

export function VisitNotesGenerator({ patientId, patientContext, onSave }: VisitNotesGeneratorProps) {
  const [doctorInput, setDoctorInput] = useState("");
  const [generatedNote, setGeneratedNote] = useState<VisitNote | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!doctorInput.trim()) {
      toast({
        title: "Input required",
        description: "Please enter your clinical notes to generate a visit note.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const visitNote = await generateVisitNote(patientId, {
        doctorInput: doctorInput.trim(),
        patientContext,
      });
      setGeneratedNote(visitNote);
      toast({
        title: "Visit note generated",
        description: "Your structured visit note has been generated successfully.",
      });
    } catch (error) {
      console.error('Error generating visit note:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate visit note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedNote) return;

    const noteText = formatVisitNoteAsText(generatedNote);
    await navigator.clipboard.writeText(noteText);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Visit note has been copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (generatedNote && onSave) {
      onSave(generatedNote);
      toast({
        title: "Visit note saved",
        description: "The visit note has been saved successfully.",
      });
    }
  };

  const formatVisitNoteAsText = (note: VisitNote): string => {
    let text = `VISIT NOTE\n`;
    text += `═══════════════════════════════════════\n\n`;
    text += `CHIEF COMPLAINT\n`;
    text += `${note.chiefComplaint}\n\n`;
    text += `HISTORY OF PRESENT ILLNESS\n`;
    text += `${note.historyOfPresentIllness}\n\n`;
    text += `PHYSICAL EXAMINATION\n`;
    text += `${note.physicalExamination}\n\n`;
    text += `ASSESSMENT\n`;
    text += `${note.assessment}\n\n`;
    text += `PLAN\n`;
    text += `${note.plan}\n\n`;
    
    if (note.medications && note.medications.length > 0) {
      text += `MEDICATIONS\n`;
      note.medications.forEach((med, index) => {
        text += `${index + 1}. ${med.name} - ${med.dosage}, ${med.frequency}`;
        if (med.duration) text += ` for ${med.duration}`;
        if (med.instructions) text += ` (${med.instructions})`;
        text += `\n`;
      });
      text += `\n`;
    }
    
    if (note.followUpInstructions) {
      text += `FOLLOW-UP INSTRUCTIONS\n`;
      text += `${note.followUpInstructions}\n\n`;
    }
    
    if (note.nextVisitDate) {
      text += `NEXT VISIT: ${note.nextVisitDate}\n`;
    }
    
    return text;
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-2 shadow-lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AI-Powered Visit Notes Generator
            </h3>
          </div>
          <Badge variant="secondary" className="animate-pulse">Beta</Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Enter your clinical notes (brief or detailed) and AI will generate a structured, professional visit note.
        </p>

        <div className="space-y-2">
          <Label htmlFor="doctor-input">Your Clinical Notes</Label>
          <Textarea
            id="doctor-input"
            placeholder="Example: Patient presents with fever and cough for 3 days. BP 140/90, temperature 38.5°C. Chest examination reveals rhonchi. Diagnosed with upper respiratory infection. Prescribed paracetamol 500mg BD for 3 days, cough syrup. Advised rest and hydration. Follow-up in 1 week."
            value={doctorInput}
            onChange={(e) => setDoctorInput(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Tip: You can write brief notes or point-form. AI will structure it into a professional format.
          </p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !doctorInput.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating visit note...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Visit Note
            </>
          )}
        </Button>

        {generatedNote && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Generated Visit Note
              </h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
                {onSave && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Chief Complaint</Label>
                <p className="mt-1 text-sm text-foreground bg-muted p-3 rounded-md">
                  {generatedNote.chiefComplaint}
                </p>
              </div>

              <div>
                <Label className="text-sm font-semibold">History of Present Illness</Label>
                <p className="mt-1 text-sm text-foreground bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {generatedNote.historyOfPresentIllness}
                </p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Physical Examination</Label>
                <p className="mt-1 text-sm text-foreground bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {generatedNote.physicalExamination}
                </p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Assessment</Label>
                <p className="mt-1 text-sm text-foreground bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {generatedNote.assessment}
                </p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Plan</Label>
                <p className="mt-1 text-sm text-foreground bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {generatedNote.plan}
                </p>
              </div>

              {generatedNote.medications && generatedNote.medications.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Medications</Label>
                  <div className="mt-2 space-y-2">
                    {generatedNote.medications.map((med, index) => (
                      <div key={index} className="bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium">{med.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {med.dosage} • {med.frequency}
                          {med.duration && ` • ${med.duration}`}
                          {med.instructions && ` • ${med.instructions}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generatedNote.followUpInstructions && (
                <div>
                  <Label className="text-sm font-semibold">Follow-up Instructions</Label>
                  <p className="mt-1 text-sm text-foreground bg-muted p-3 rounded-md whitespace-pre-wrap">
                    {generatedNote.followUpInstructions}
                  </p>
                </div>
              )}

              {generatedNote.nextVisitDate && (
                <div>
                  <Label className="text-sm font-semibold">Next Visit</Label>
                  <p className="mt-1 text-sm text-foreground bg-muted p-3 rounded-md">
                    {new Date(generatedNote.nextVisitDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

