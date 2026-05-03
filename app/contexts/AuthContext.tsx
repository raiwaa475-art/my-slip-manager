"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Dashboard } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dashboards: Dashboard[];
  selectedDashboardId: string;
  setSelectedDashboardId: (id: string) => void;
  refreshDashboards: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>("");
  const supabase = useMemo(() => createClient(), []);

  const fetchDashboards = useCallback(async (userId: string) => {
    try {
      const { data: userDashboards, error: udError } = await supabase
        .from('dashboard_users')
        .select('dashboard_id')
        .eq('user_id', userId);

      if (udError) throw udError;

      if (userDashboards && userDashboards.length > 0) {
        const dashboardIds = userDashboards.map(d => d.dashboard_id);
        const { data: dashs, error: dError } = await supabase
          .from('dashboards')
          .select('*')
          .in('id', dashboardIds);
        
        if (dError) throw dError;
        setDashboards(dashs || []);
        
        if (dashs && dashs.length > 0) {
          const savedId = localStorage.getItem("activeDashboardId");
          const stillExists = savedId ? dashs.find(d => d.id === savedId) : null;
          const initialId = stillExists?.id || dashs[0].id;
          setSelectedDashboardId(initialId);
          localStorage.setItem("activeDashboardId", initialId);
        }
      } else {
        setDashboards([]);
        setSelectedDashboardId("");
      }
    } catch (err) {
      console.error("Error fetching dashboards:", err);
    }
  }, [supabase]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchDashboards(session.user.id);
      }
      setLoading(false);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchDashboards(session.user.id);
      } else {
        setDashboards([]);
        setSelectedDashboardId("");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchDashboards]);

  const handleSetSelectedDashboardId = (id: string) => {
    setSelectedDashboardId(id);
    localStorage.setItem("activeDashboardId", id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    loading,
    dashboards,
    selectedDashboardId,
    setSelectedDashboardId: handleSetSelectedDashboardId,
    refreshDashboards: () => user ? fetchDashboards(user.id) : Promise.resolve(),
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
