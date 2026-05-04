"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Dashboard } from "@/types";
import { useToast } from "@/app/components/ui/Toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dashboards: Dashboard[];
  selectedDashboardId: string;
  setSelectedDashboardId: (id: string) => void;
  refreshDashboards: () => Promise<void>;
  signOut: () => Promise<void>;
  createDashboard: (name: string, type: "personal" | "split_bill") => Promise<void>;
  joinDashboard: (code: string) => Promise<void>;
  leaveDashboard: (dashboardId: string) => Promise<void>;
  deleteDashboard: (dashboardId: string) => Promise<void>;
  updateDashboardMetadata: (dashboardId: string, metadata: Dashboard['metadata']) => Promise<void>;
  supabase: any; // Type strictly if needed, but for now matching existing patterns
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const supabase = createClient();

export function AuthProvider({ 
  children, 
  initialUser = null 
}: { 
  children: React.ReactNode, 
  initialUser?: User | null 
}) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>("");

  const fetchDashboards = useCallback(async (userId: string) => {
    try {
      // ดึงข้อมูล Dashboards ทั้งหมดที่ User นี้เป็นสมาชิกอยู่ภายใน Query เดียว (Join)
      const { data: dashs, error: dError } = await supabase
        .from('dashboards')
        .select('*, dashboard_users!inner(user_id)')
        .eq('dashboard_users.user_id', userId);
        
      if (dError) throw dError;
      
      setDashboards(dashs || []);
      
      if (dashs && dashs.length > 0) {
        const savedId = localStorage.getItem("activeDashboardId");
        const stillExists = savedId ? dashs.find(d => d.id === savedId) : null;
        const initialId = stillExists?.id || dashs[0].id;
        setSelectedDashboardId(initialId);
        localStorage.setItem("activeDashboardId", initialId);
      } else {
        setSelectedDashboardId("");
      }
    } catch (err) {
      console.error("Error fetching dashboards:", err);
    }
  }, [supabase]);

  const hasFetchedInitial = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (hasFetchedInitial.current) return;
      hasFetchedInitial.current = true;

      if (initialUser) {
        await fetchDashboards(initialUser.id);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchDashboards(session.user.id);
        }
        setLoading(false);
      }
    };

    init();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setDashboards([]);
        setSelectedDashboardId("");
        setLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        await fetchDashboards(session.user.id);
        setLoading(false);
      }
    });

    const dashChannel = supabase
      .channel('dashboards-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dashboards' },
        () => {
          if (user) fetchDashboards(user.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dashboard_users' },
        () => {
          if (user) fetchDashboards(user.id);
        }
      )
      .subscribe();

    return () => {
      authSub.unsubscribe();
      supabase.removeChannel(dashChannel);
    };
  }, [supabase, fetchDashboards, initialUser]);

  const handleSetSelectedDashboardId = (id: string) => {
    setSelectedDashboardId(id);
    localStorage.setItem("activeDashboardId", id);
  };

  const createDashboard = async (name: string, type: "personal" | "split_bill") => {
    if (!name.trim() || !user) return;
    const newId = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    try {
      const { error: insertDashErr } = await supabase.from('dashboards').insert({
        id: newId,
        name,
        type,
        created_by: user.id
      });
      if (insertDashErr) throw insertDashErr;

      const { error: insertUserErr } = await supabase.from('dashboard_users').insert({
        dashboard_id: newId,
        user_id: user.id
      });
      if (insertUserErr) throw insertUserErr;

      await fetchDashboards(user.id);
      setSelectedDashboardId(newId);
      localStorage.setItem("activeDashboardId", newId);
    } catch (err) {
      console.error("Error creating dashboard:", err);
      throw err;
    }
  };

  const joinDashboard = async (code: string) => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode || !user) return;
    
    try {
      const { data: dash, error: dashErr } = await supabase
        .from('dashboards')
        .select('*')
        .eq('id', trimmedCode)
        .single();

      if (dashErr || !dash) throw new Error("ไม่พบแดชบอร์ด");

      const { error: insertUserErr } = await supabase.from('dashboard_users').insert({
        dashboard_id: trimmedCode,
        user_id: user.id
      });
      
      if (insertUserErr && (insertUserErr as unknown as { code: string }).code !== '23505') throw insertUserErr;

      await fetchDashboards(user.id);
      setSelectedDashboardId(trimmedCode);
      localStorage.setItem("activeDashboardId", trimmedCode);
    } catch (err) {
      console.error("Error joining dashboard:", err);
      throw err;
    }
  };

  const leaveDashboard = async (dashboardId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('dashboard_users')
        .delete()
        .eq('dashboard_id', dashboardId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Optimistic Update
      setDashboards(prev => prev.filter(d => d.id !== dashboardId));
      
      if (selectedDashboardId === dashboardId) {
        localStorage.removeItem("activeDashboardId");
        setSelectedDashboardId("");
      }
      
      // Give the DB a moment to catch up then sync
      setTimeout(() => fetchDashboards(user.id), 500);
    } catch (err) {
      console.error("Error leaving dashboard:", err);
      throw err;
    }
  };

  const deleteDashboard = async (dashboardId: string) => {
    if (!user) {
      console.warn("⚠️ [AuthContext] deleteDashboard called but no user is logged in");
      return;
    }
    console.log("🛠️ [AuthContext] Starting deletion process for Dashboard:", dashboardId);
    const errors: string[] = [];
    
    try {
      // 1. Delete transactions for this dashboard
      console.log("⏳ [AuthContext] Step 1: Deleting transactions...");
      const { error: txError, count: txCount } = await supabase
        .from('transactions')
        .delete({ count: 'exact' })
        .eq('dashboard_id', dashboardId);
      
      if (txError) {
        console.error("❌ [AuthContext] Step 1 Failed:", txError);
        errors.push(`transactions: ${txError.message}`);
      } else {
        console.log(`✅ [AuthContext] Step 1 Success: Deleted ${txCount ?? 0} transactions`);
      }

      // 2. Delete all user associations for this dashboard
      console.log("⏳ [AuthContext] Step 2: Deleting dashboard_users...");
      const { error: duError, count: duCount } = await supabase
        .from('dashboard_users')
        .delete({ count: 'exact' })
        .eq('dashboard_id', dashboardId);
      
      if (duError) {
        console.error("❌ [AuthContext] Step 2 Failed:", duError);
        errors.push(`dashboard_users: ${duError.message}`);
      } else {
        console.log(`✅ [AuthContext] Step 2 Success: Deleted ${duCount ?? 0} associations`);
      }

      // 3. Delete the dashboard itself (only if we're the owner)
      console.log("⏳ [AuthContext] Step 3: Deleting dashboard (ownership check)...");
      const { error: dError, count: dCount } = await supabase
        .from('dashboards')
        .delete({ count: 'exact' })
        .eq('id', dashboardId)
        .eq('created_by', user.id);
      
      if (dError) {
        console.error("❌ [AuthContext] Step 3 Failed:", dError);
        errors.push(`dashboard: ${dError.message}`);
      } else if (dCount === 0) {
        console.warn("⚠️ [AuthContext] Step 3: No rows affected. User might not be the owner or dashboard ID is wrong.");
        errors.push("dashboard: ไม่สามารถลบได้ (คุณอาจไม่ใช่เจ้าของ)");
      } else {
        console.log(`✅ [AuthContext] Step 3 Success: Dashboard deleted`);
      }

      if (errors.length > 0) {
        throw new Error(`Delete errors: ${errors.join('; ')}`);
      }

      console.log("🔄 [AuthContext] Updating local state...");
      setDashboards(prev => prev.filter(d => d.id !== dashboardId));

      if (selectedDashboardId === dashboardId) {
        console.log("📍 [AuthContext] Active dashboard was deleted, resetting...");
        localStorage.removeItem("activeDashboardId");
        setSelectedDashboardId("");
      }

      setTimeout(() => {
        console.log("📥 [AuthContext] Syncing with database...");
        fetchDashboards(user.id);
      }, 500);
    } catch (err) {
      console.error("🚨 [AuthContext] deleteDashboard critical error:", err);
      throw err;
    }
  };

  const updateDashboardMetadata = async (dashboardId: string, metadata: Dashboard['metadata']) => {
    if (!user) return;
    try {
      console.log(`⏳ [AuthContext] Updating metadata for ${dashboardId}...`, metadata);
      const { error } = await supabase
        .from('dashboards')
        .update({ metadata })
        .eq('id', dashboardId);

      if (error) throw error;

      console.log("✅ [AuthContext] Metadata updated in DB. Refreshing local state...");
      
      // อัปเดตข้อมูลใน State ทันทีเพื่อให้ UI เปลี่ยนแปลง
      setDashboards(prev => prev.map(d => 
        d.id === dashboardId ? { ...d, metadata } : d
      ));
      
      toast("บันทึกการเปลี่ยนแปลงสำเร็จ", "success");
    } catch (err) {
      console.error("🚨 [AuthContext] Error updating dashboard metadata:", err);
      toast("บันทึกไม่สำเร็จ", "error");
      throw err;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("activeDashboardId");
    window.location.href = "/";
  };

  const value = {
    user,
    loading,
    dashboards,
    selectedDashboardId,
    setSelectedDashboardId: handleSetSelectedDashboardId,
    refreshDashboards: () => user ? fetchDashboards(user.id) : Promise.resolve(),
    signOut,
    createDashboard,
    joinDashboard,
    leaveDashboard,
    deleteDashboard,
    updateDashboardMetadata,
    supabase
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
