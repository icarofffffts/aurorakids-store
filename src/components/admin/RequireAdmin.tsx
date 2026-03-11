import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!isAuthenticated) {
          if (!cancelled) {
            setIsAdmin(false);
            setChecking(false);
          }
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          if (!cancelled) {
            setIsAdmin(false);
            setChecking(false);
          }
          return;
        }

        // Prefer backend check (supports ADMIN_EMAILS env or profiles.role)
        const response = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const raw = await response.text();
        let data: { isAdmin?: boolean };
        try {
          data = JSON.parse(raw) as { isAdmin?: boolean };
        } catch {
          data = {};
        }

        const ok = response.ok && data.isAdmin === true;
        if (!cancelled) {
          setIsAdmin(ok);
          setChecking(false);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setChecking(false);
        }
      }
    };

    if (!loading) run();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-slate-50 font-nunito flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-medium">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
