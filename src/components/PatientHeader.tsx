import { Patient } from "@/api/mockApi";
import { Badge } from "./ui/badge";
import { ArrowLeft, CheckCircle2, LogOut, User } from "lucide-react";
import { Button } from "./ui/button";
import { getUser, logout } from "@/services/authService";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface PatientHeaderProps {
  patient: Patient;
  onBack: () => void;
  syncStatus?: 'synced' | 'syncing' | 'offline';
}

export function PatientHeader({ patient, onBack, syncStatus = 'synced' }: PatientHeaderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getUser();

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

  return (
    <header className="border-b-2 bg-gradient-to-r from-card via-card/95 to-card shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mt-1"
            aria-label="Back to search"
          >
            <ArrowLeft size={20} />
          </Button>
          
          <div className="flex-1">
            <div className="flex items-baseline gap-3 mb-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {patient.name}
              </h1>
              <code className="text-sm font-mono text-muted-foreground bg-muted px-3 py-1 rounded">
                {patient.id}
              </code>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-medium">{patient.age} years • {patient.sex === 'M' ? 'Male' : patient.sex === 'F' ? 'Female' : 'Other'}</span>
              <span>•</span>
              <span>{patient.village}</span>
              <span>•</span>
              <span>Last visit: {new Date(patient.lastVisit).toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={syncStatus === 'synced' ? 'default' : syncStatus === 'syncing' ? 'secondary' : 'destructive'}
              className="mt-1"
            >
              {syncStatus === 'synced' && (
                <>
                  <CheckCircle2 size={14} className="mr-1" />
                  Synced
                </>
              )}
              {syncStatus === 'syncing' && 'Syncing...'}
              {syncStatus === 'offline' && 'Offline'}
            </Badge>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="mt-1">
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
      </div>
    </header>
  );
}
