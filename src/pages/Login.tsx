import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogIn, Eye, EyeOff, User, Stethoscope, Sparkles } from "lucide-react";
import { login, patientLogin } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Provider login state
  const [providerEmail, setProviderEmail] = useState("");
  const [providerPassword, setProviderPassword] = useState("");
  const [showProviderPassword, setShowProviderPassword] = useState(false);
  
  // Patient login state
  const [patientId, setPatientId] = useState("");
  const [patientPassword, setPatientPassword] = useState("");
  const [showPatientPassword, setShowPatientPassword] = useState(false);
  
  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("provider");

  const handleProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await login(providerEmail, providerPassword);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${response.user.name}!`,
      });

      // Redirect to home page (provider dashboard)
      navigate("/");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(errorMessage);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await patientLogin(patientId, patientPassword);
      
      toast({
        title: "Login successful",
        description: `Welcome, ${response.user.name}!`,
      });

      // Redirect to patient dashboard
      navigate(`/patient/${response.user.patientId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(errorMessage);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-gradient-to-br from-card to-card/50 border-2 shadow-2xl">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <Stethoscope className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Aarogya-Setu
          </h1>
          <p className="text-muted-foreground">
            AI-Powered Healthcare Platform
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="provider" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Healthcare Provider
            </TabsTrigger>
            <TabsTrigger value="patient" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Patient
            </TabsTrigger>
          </TabsList>

          {/* Provider Login Tab */}
          <TabsContent value="provider" className="mt-6">
            <form onSubmit={handleProviderSubmit} className="space-y-6">
              {error && activeTab === "provider" && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="provider-email">Email</Label>
                <Input
                  id="provider-email"
                  type="email"
                  placeholder="doctor@aarogya-setu.com"
                  value={providerEmail}
                  onChange={(e) => setProviderEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider-password">Password</Label>
                <div className="relative">
                  <Input
                    id="provider-password"
                    type={showProviderPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={providerPassword}
                    onChange={(e) => setProviderPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10"
                    onClick={() => setShowProviderPassword(!showProviderPassword)}
                    disabled={isLoading}
                  >
                    {showProviderPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login as Provider
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Provider Demo Credentials:
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  <strong>Admin:</strong> admin@aarogya-setu.com / admin123
                </div>
                <div>
                  <strong>Doctor:</strong> doctor@aarogya-setu.com / doctor123
                </div>
                <div>
                  <strong>Nurse:</strong> nurse@aarogya-setu.com / nurse123
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Patient Login Tab */}
          <TabsContent value="patient" className="mt-6">
            <form onSubmit={handlePatientSubmit} className="space-y-6">
              {error && activeTab === "patient" && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="patient-id">Patient ID</Label>
                <Input
                  id="patient-id"
                  type="text"
                  placeholder="MHR-01-2024-7"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value.toUpperCase())}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Format: XXX-YY-ZZZZ-C (e.g., MHR-01-2024-7)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient-password">Password</Label>
                <div className="relative">
                  <Input
                    id="patient-password"
                    type={showPatientPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={patientPassword}
                    onChange={(e) => setPatientPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10"
                    onClick={() => setShowPatientPassword(!showPatientPassword)}
                    disabled={isLoading}
                  >
                    {showPatientPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login as Patient
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Patient Demo Credentials:
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  <strong>Patient 1:</strong> MHR-01-2024-7 / patient123
                </div>
                <div>
                  <strong>Patient 2:</strong> MHR-01-2024-8 / patient123
                </div>
                <div>
                  <strong>Patient 3:</strong> MHR-01-2024-9 / patient123
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
