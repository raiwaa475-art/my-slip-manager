"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Dashboard } from "@/types";
import { useToast } from "@/app/components/ui/Toast";
import { useConfirm } from "@/app/components/ui/ConfirmDialog";

export function useDashboard(user: User | null) {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<Dashboard | null>(null);
  const [setupMode, setSetupMode] = useState<"choose" | "create" | "join" | null>(null);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [newDashboardType, setNewDashboardType] = useState<"personal" | "split_bill">("personal");
  const [joinCode, setJoinCode] = useState("");
  const [isProcessingSetup, setIsProcessingSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const supabase = useMemo(() => createClient(), []);
  const activeDashIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchDashboards = useCallback(async (userId: string) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data: userDashboards, error: udError } = await supabase
        .from('dashboard_users')
        .select('dashboard_id')
        .eq('user_id', userId);

      if (udError) {
        console.error("Dashboard tables missing or error:", udError);
        setSetupMode("choose");
        setLoading(false);
        return;
      }

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
           const currentActiveId = activeDashIdRef.current || savedId;
           
           const stillExists = currentActiveId ? dashs.find(d => d.id === currentActiveId) : null;
           const active = stillExists || dashs[0]; 
           
           setActiveDashboard(active);
           activeDashIdRef.current = active.id;
           
           if (active.id !== savedId) {
             localStorage.setItem("activeDashboardId", active.id);
           }
        } else {
           setSetupMode("choose");
        }
      } else {
        setDashboards([]);
        setSetupMode("choose");
      }
    } catch (err) {
      console.error("Error fetching dashboards:", err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [supabase]);

  useEffect(() => {
    if (user) {
      fetchDashboards(user.id);
    } else {
      setLoading(false);
    }
  }, [user, fetchDashboards]);

  const generateDashboardId = () => {
    const array = new Uint8Array(3);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim() || !user) return;
    setIsProcessingSetup(true);
    const newId = generateDashboardId();
    
    try {
      const { error: insertDashErr } = await supabase.from('dashboards').insert({
        id: newId,
        name: newDashboardName,
        type: newDashboardType,
        created_by: user.id
      });
      if (insertDashErr) throw insertDashErr;

      const { error: insertUserErr } = await supabase.from('dashboard_users').insert({
        dashboard_id: newId,
        user_id: user.id
      });
      if (insertUserErr) throw insertUserErr;

      const newDash = { id: newId, name: newDashboardName, type: newDashboardType, created_by: user.id };
      setDashboards(prev => [newDash, ...prev]);
      setActiveDashboard(newDash);
      activeDashIdRef.current = newId;
      localStorage.setItem("activeDashboardId", newId);
      
      setSetupMode(null);
      setNewDashboardName("");
    } catch (err) {
      console.error("Error creating dashboard:", err);
      toast("เกิดข้อผิดพลาดในการสร้างแดชบอร์ด โปรดตรวจสอบว่าสร้างตารางในฐานข้อมูลหรือยัง", "error");
    } finally {
      setIsProcessingSetup(false);
    }
  };

  const handleJoinDashboard = async () => {
    const trimmedCode = joinCode.trim().toUpperCase();
    if (!trimmedCode || !user) return;
    setIsProcessingSetup(true);
    
    try {
      const { data: dash, error: dashErr } = await supabase
        .from('dashboards')
        .select('*')
        .eq('id', trimmedCode)
        .single();

      if (dashErr || !dash) {
        toast(`ไม่พบแดชบอร์ดรหัส "${trimmedCode}" โปรดตรวจสอบรหัสอีกครั้ง`, "error");
        setIsProcessingSetup(false);
        return;
      }

      const { error: insertUserErr } = await supabase.from('dashboard_users').insert({
        dashboard_id: trimmedCode,
        user_id: user.id
      });
      
      if (insertUserErr && (insertUserErr as { code: string }).code !== '23505') {
        throw insertUserErr;
      }

      setDashboards(prev => [dash, ...prev]);
      setActiveDashboard(dash);
      activeDashIdRef.current = dash.id;
      localStorage.setItem("activeDashboardId", dash.id);
      
      setSetupMode(null);
      setJoinCode("");
      toast(`เข้าร่วมแดชบอร์ด "${dash.name}" สำเร็จ!`, "success");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error joining dashboard:", error);
      toast("เกิดข้อผิดพลาดในการเข้าร่วม: " + (error.message || "Unknown error"), "error");
    } finally {
      setIsProcessingSetup(false);
    }
  };

  const handleLeaveDashboard = async (dashboardId: string) => {
    if (!user) return;
    
    const isConfirmed = await confirm({
      title: "ยืนยันการออกจากกลุ่ม",
      message: "คุณต้องการออกจากแดชบอร์ดนี้ใช่หรือไม่?",
      variant: "warning",
      confirmText: "ออกจากกลุ่ม",
      cancelText: "ยกเลิก"
    });

    if (!isConfirmed) return;
    try {
      const { error } = await supabase
        .from('dashboard_users')
        .delete()
        .eq('dashboard_id', dashboardId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const updatedDashboards = dashboards.filter(d => d.id !== dashboardId);
      setDashboards(updatedDashboards);
      
      if (activeDashboard?.id === dashboardId) {
        if (updatedDashboards.length > 0) {
          setActiveDashboard(updatedDashboards[0]);
          activeDashIdRef.current = updatedDashboards[0].id;
        } else {
          setActiveDashboard(null);
          setSetupMode("choose");
        }
      }
    } catch (err) {
      console.error("Error leaving dashboard:", err);
      toast("ออกจากแดชบอร์ดไม่สำเร็จ", "error");
    }
  };

  const handleDeleteDashboard = async (dashboardId: string) => {
    if (!user) return;
    
    const isConfirmed = await confirm({
      title: "⚠️ คำเตือน: ลบแดชบอร์ด",
      message: "ยืนยันการลบแดชบอร์ด? ข้อมูลทั้งหมดรวมถึงรายการธุรกรรมจะถูกลบถาวรและไม่สามารถกู้คืนได้ !!!",
      variant: "danger",
      confirmText: "ลบถาวร",
      cancelText: "ยกเลิก"
    });

    if (!isConfirmed) return;
    
    setIsProcessingSetup(true);
    try {
      await supabase.from('transactions').delete().eq('dashboard_id', dashboardId);
      await supabase.from('dashboard_users').delete().eq('dashboard_id', dashboardId);
      const { error: dError } = await supabase.from('dashboards').delete().eq('id', dashboardId).eq('created_by', user.id);
      
      if (dError) throw dError;
      
      const updatedDashboards = dashboards.filter(d => d.id !== dashboardId);
      setDashboards(updatedDashboards);
      
      if (activeDashboard?.id === dashboardId) {
        if (updatedDashboards.length > 0) {
          setActiveDashboard(updatedDashboards[0]);
          activeDashIdRef.current = updatedDashboards[0].id;
        } else {
          setActiveDashboard(null);
          setSetupMode("choose");
        }
      }
      toast("ลบแดชบอร์ดสำเร็จ", "success");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error deleting dashboard:", error);
      toast("ลบแดชบอร์ดไม่สำเร็จ: " + (error.message || "คุณอาจไม่มีสิทธิ์ลบ หรือเกิดข้อผิดพลาดที่ฐานข้อมูล"), "error");
    } finally {
      setIsProcessingSetup(false);
    }
  };

  return {
    dashboards,
    activeDashboard,
    setActiveDashboard,
    setupMode,
    setSetupMode,
    newDashboardName,
    setNewDashboardName,
    newDashboardType,
    setNewDashboardType,
    joinCode,
    setJoinCode,
    isProcessingSetup,
    loading,
    handleCreateDashboard,
    handleJoinDashboard,
    handleLeaveDashboard,
    handleDeleteDashboard,
    activeDashIdRef
  };
}

export type UseDashboardReturn = ReturnType<typeof useDashboard>;
