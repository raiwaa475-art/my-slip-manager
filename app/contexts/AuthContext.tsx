"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Dashboard } from "@/types";
import { useToast } from "@/app/components/ui/Toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dashboardsLoading: boolean; // แยก flag สำหรับ dashboards โดยเฉพาะ (แก้ race condition Bug #2)
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
export function AuthProvider({ 
  children, 
  initialUser = null 
}: { 
  children: React.ReactNode, 
  initialUser?: User | null 
}) {
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [dashboardsLoading, setDashboardsLoading] = useState(true); // แยก loading สำหรับ dashboards (Bug #2)
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>("");

  const fetchDashboards = useCallback(async (userId: string, forceSelectId?: string) => {
    setDashboardsLoading(true); // เริ่ม loading dashboards (Bug #2)
    try {
      // ดึงข้อมูล Dashboards ทั้งหมดที่ User นี้เป็นสมาชิกอยู่ภายใน Query เดียว (Join)
      const { data: dashs, error: dError } = await supabase
        .from('dashboards')
        .select('*, dashboard_users!inner(user_id)')
        .eq('dashboard_users.user_id', userId);
        
      if (dError) throw dError;
      
      setDashboards(dashs || []);
      
      if (dashs && dashs.length > 0) {
        // ถ้ามี forceSelectId (จาก joinDashboard) ให้ใช้ตัวนั้นก่อนเสมอ (Bug #4)
        if (forceSelectId && dashs.find(d => d.id === forceSelectId)) {
          setSelectedDashboardId(forceSelectId);
          localStorage.setItem("activeDashboardId", forceSelectId);
        } else {
          const savedId = localStorage.getItem("activeDashboardId");
          const stillExists = savedId ? dashs.find(d => d.id === savedId) : null;
          const initialId = stillExists?.id || dashs[0].id;
          setSelectedDashboardId(initialId);
          localStorage.setItem("activeDashboardId", initialId);
        }
      } else {
        setSelectedDashboardId("");
      }
    } catch (err) {
      console.error("Error fetching dashboards:", err);
    } finally {
      setDashboardsLoading(false); // dashboards โหลดเสร็จแล้ว (Bug #2)
    }
  }, [supabase]);

  const userRef = useRef<User | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const hasFetchedInitial = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 🛡️ [Hard Timeout] ไม้ตายสุดท้าย: ไม่ว่าอะไรจะค้างตรงไหน ต้องหยุดหมุนภายใน 8 วินาที
    const loadingHardTimeout = setTimeout(() => {
      if (loading) {
        console.warn("🚨 [AuthContext] Hard Timeout Reached! Forcing loading to false.");
        setLoading(false);
      }
    }, 8000);

    const init = async () => {
      if (hasFetchedInitial.current) return;
      hasFetchedInitial.current = true;

      try {
        if (initialUser) {
          setUser(initialUser);
          await fetchDashboards(initialUser.id);
        } else {
          // 🚀 เพิ่ม Timeout ให้การดึง Session
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Auth Timeout")), 5000)
          );

          try {
            const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
            if (session?.user) {
              setUser(session.user);
              await fetchDashboards(session.user.id);
            }
          } catch (timeoutErr) {
            console.warn("⚠️ Auth Session Timeout: ระบบข้ามการรอ Session...");
          }
        }
      } catch (err) {
        console.error("Auth Init Error:", err);
      } finally {
        setLoading(false);
        clearTimeout(loadingHardTimeout); // ยกเลิก Hard Timeout ถ้าโหลดเสร็จก่อน
      }
    };

    init();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔐 [Auth] Event: ${event}`);
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
          if (userRef.current) fetchDashboards(userRef.current.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dashboard_users' },
        () => {
          if (userRef.current) fetchDashboards(userRef.current.id);
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

      // Bug #4 Fix: ส่ง forceSelectId เข้า fetchDashboards เพื่อ set selectedId
      // หลัง dashboards state update เสร็จสมบูรณ์ แทนการ set แยก (ซึ่งเกิด race)
      await fetchDashboards(user.id, trimmedCode);
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
      console.log(`⏳ [AuthContext] Updating metadata for ${dashboardId} via Raw Fetch...`, metadata);
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const tokenStr = localStorage.getItem('sb-vjbzujwtwshhrisazoyx-auth-token');
      let accessToken = anonKey;
      if (tokenStr) {
         try { accessToken = JSON.parse(tokenStr).access_token || anonKey; } catch (e) {}
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/dashboards?id=eq.${dashboardId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey!,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ metadata })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      console.log("✅ [AuthContext] Metadata updated successfully.");
      
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
    // Bug #1 Fix: clear state ก่อน แล้วค่อย signOut และ redirect
    // ป้องกัน onAuthStateChange emit SIGNED_IN ซ้ำแล้วทำให้ re-mount
    setUser(null);
    setDashboards([]);
    setSelectedDashboardId("");
    localStorage.removeItem("activeDashboardId");
    await supabase.auth.signOut();
    // ใช้ replace แทน href เพื่อไม่ให้ back button กลับมาได้
    window.location.replace("/");
  };

  const value = {
    user,
    loading,
    dashboardsLoading, // export ออกมาให้ useDashboard ใช้แทน authLoading (Bug #2)
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
