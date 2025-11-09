import { useState, useEffect, useCallback } from "react";
import { SearchInput } from "@/components/SearchInput";
import { PatientResultList } from "@/components/PatientResultList";
import { Patient, searchPatients } from "@/api/mockApi";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { getUser, logout } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PATIENT_ID_PATTERN = /^[A-Z]{3}-\d{2}-\d{4}-[0-9X]$/i;

export default function SearchPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | undefined>();
  
  // If no user, show error (shouldn't happen due to ProtectedRoute, but just in case)
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Authentication Error</h1>
          <p className="text-muted-foreground mb-4">
            Unable to load user information. Please try logging in again.
          </p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2 && !PATIENT_ID_PATTERN.test(query)) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const patients = await searchPatients(query);
      setResults(patients);
      setSelectedIndex(0);

      // Auto-highlight if exact ID match
      if (PATIENT_ID_PATTERN.test(query) && patients.length > 0) {
        setHighlightedId(patients[0].id);
        setTimeout(() => setHighlightedId(undefined), 1000);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          navigate(`/patient/${results[selectedIndex].id}`);
        }
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const handleSelectPatient = (patient: Patient) => {
    navigate(`/patient/${patient.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 bg-gradient-to-r from-card via-card/95 to-card shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Aarogya-Setu
              </h1>
              <p className="text-xs text-muted-foreground">
                AI-Powered Healthcare Platform
              </p>
            </div>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User size={20} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Logo/Title */}
          <div className="text-center mb-12">
            <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
              Doc-Pad
            </h1>
            <p className="text-sm text-muted-foreground">
              Clinical Records System
            </p>
          </div>

          {/* Search */}
          <div className="mb-8">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              isLoading={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+K</kbd> to focus search
            </p>
          </div>

          {/* Results */}
          <PatientResultList
            results={results}
            selectedIndex={selectedIndex}
            onSelect={handleSelectPatient}
            highlightedId={highlightedId}
          />

          {/* Empty state */}
          {searchQuery.length >= 2 && !isLoading && results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No patients found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try searching by Patient ID or name
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
