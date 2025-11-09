import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated, getCurrentUser, getUser, User } from "@/services/authService";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'doctor' | 'nurse' | 'admin' | 'support' | 'patient';
  allowPatient?: boolean; // Allow patients to access this route
}

export function ProtectedRoute({ children, requiredRole, allowPatient }: ProtectedRouteProps) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const authenticated = isAuthenticated();
      setIsAuth(authenticated);

      if (authenticated) {
        // First try to get user from localStorage (faster, no API call)
        const localUser = getUser();
        if (localUser) {
          setUser(localUser);
          setIsChecking(false);
          return;
        }

        // If not in localStorage, try to fetch from API
        try {
          const currentUser = await getCurrentUser();
          setUser(currentUser || localUser);
        } catch (error) {
          console.error('Error fetching current user:', error);
          // If API call fails but we have a token, use local user or allow access
          setUser(localUser);
        }
      }

      setIsChecking(false);
    }

    checkAuth();
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuth) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role if required
  if (requiredRole) {
    if (!user) {
      // If role is required but user is null, deny access
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground">
              Unable to verify user permissions.
            </p>
          </div>
        </div>
      );
    }

    // Admin can access everything
    if (user.role === 'admin') {
      return <>{children}</>;
    }
    
    // Check if role matches
    if (user.role !== requiredRole) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }
  }

  // If allowPatient is false and user is a patient, deny access
  if (allowPatient === false && user && user.userType === 'patient') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            This page is only accessible to healthcare providers.
          </p>
        </div>
      </div>
    );
  }

  // Render children if authenticated (user can be null if token exists but user fetch failed)
  return <>{children}</>;
}

