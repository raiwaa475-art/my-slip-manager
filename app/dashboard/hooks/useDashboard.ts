"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Dashboard } from "../../../types";
import { useToast } from "@/app/components/ui/Toast";
import { useConfirm } from "@/app/components/ui/ConfirmDialog";

import { useAuth } from "@/app/contexts/AuthContext";

export function useDashboard(user: User | null) {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { 
    dashboards, 
    selectedDashboardId, 
    setSelectedDashboardId, 
    loading: authLoading,
    dashboardsLoading, // Bug #2 Fix: ใช้ dashboardsLoading แทน authLoading ในการตัดสินใจ setupMode
    createDashboard: ctxCreateDashboard,
    joinDashboard: ctxJoinDashboard,
    leaveDashboard: ctxLeaveDashboard,
    deleteDashboard: ctxDeleteDashboard
  } = useAuth();

  const [setupMode, setSetupMode] = useState<"choose" | "create" | "join" | null>(null);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [newDashboardType, setNewDashboardType] = useState<"personal" | "split_bill">("personal");
  const [joinCode, setJoinCode] = useState("");
  const [isProcessingSetup, setIsProcessingSetup] = useState(false);
  
  const activeDashboard = useMemo(() => 
    dashboards.find(d => d.id === selectedDashboardId) || dashboards[0] || null
  , [dashboards, selectedDashboardId]);

  const activeDashIdRef = useRef<string | null>(selectedDashboardId);

  useEffect(() => {
    // Bug #2 Fix: ใช้ dashboardsLoading แทน authLoading
    // dashboardsLoading = false หมายความว่า fetchDashboards เสร็จแล้วจริงๆ (ไม่ใช่แค่ auth loading)
    if (dashboardsLoading) return;
    if (dashboards.length === 0) {
      setSetupMode("choose");
    } else {
      setSetupMode(null);
    }
  }, [dashboards.length, dashboardsLoading]);

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) return;
    setIsProcessingSetup(true);
    try {
      await ctxCreateDashboard(newDashboardName, newDashboardType);
      setSetupMode(null);
      setNewDashboardName("");
    } catch (err) {
      toast("เกิดข้อผิดพลาดในการสร้างแดชบอร์ด", "error");
    } finally {
      setIsProcessingSetup(false);
    }
  };

  const handleJoinDashboard = async () => {
    if (!joinCode.trim()) return;
    setIsProcessingSetup(true);
    try {
      await ctxJoinDashboard(joinCode);
      setSetupMode(null);
      setJoinCode("");
      toast("เข้าร่วมแดชบอร์ดสำเร็จ!", "success");
    } catch (err) {
      toast("ไม่พบแดชบอร์ดหรือเข้าร่วมไม่สำเร็จ", "error");
    } finally {
      setIsProcessingSetup(false);
    }
  };

  const handleLeaveDashboard = async (dashboardId: string) => {
    const isConfirmed = await confirm({
      title: "ยืนยันการออกจากกลุ่ม",
      message: "คุณต้องการออกจากแดชบอร์ดนี้ใช่หรือไม่?",
      variant: "warning",
      confirmText: "ออกจากกลุ่ม",
      cancelText: "ยกเลิก"
    });

    if (!isConfirmed) return;
    try {
      await ctxLeaveDashboard(dashboardId);
      toast("ออกจากกลุ่มเรียบร้อย", "success");
    } catch (err) {
      toast("ออกจากแดชบอร์ดไม่สำเร็จ", "error");
    }
  };

  const handleDeleteDashboard = async (dashboardId: string) => {
    console.log("🗑️ [useDashboard] handleDeleteDashboard triggered for ID:", dashboardId);
    
    const isConfirmed = await confirm({
      title: "⚠️ คำเตือน: ลบแดชบอร์ด",
      message: "ยืนยันการลบแดชบอร์ด? ข้อมูลทั้งหมดจะถูกลบถาวร !!!",
      variant: "danger",
      confirmText: "ลบถาวร",
      cancelText: "ยกเลิก"
    });

    console.log("❓ [useDashboard] Confirmation result:", isConfirmed);
    if (!isConfirmed) {
      console.log("❌ [useDashboard] Deletion cancelled by user");
      return;
    }
    
    setIsProcessingSetup(true);
    try {
      console.log("🚀 [useDashboard] Calling ctxDeleteDashboard...");
      await ctxDeleteDashboard(dashboardId);
      console.log("✅ [useDashboard] Deletion successful");
      toast("ลบแดชบอร์ดสำเร็จ", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ลบแดชบอร์ดไม่สำเร็จ";
      console.error("🔥 [useDashboard] handleDeleteDashboard error:", err);
      toast(msg, "error");
    } finally {
      setIsProcessingSetup(false);
    }
  };

  return {
    dashboards,
    activeDashboard,
    setActiveDashboard: useCallback((d: Dashboard | null) => {
      if (d) setSelectedDashboardId(d.id);
    }, [setSelectedDashboardId]),
    setupMode,
    setSetupMode,
    newDashboardName,
    setNewDashboardName,
    newDashboardType,
    setNewDashboardType,
    joinCode,
    setJoinCode,
    isProcessingSetup,
    loading: authLoading || dashboardsLoading, // รวมทั้ง authLoading และ dashboardsLoading
    handleCreateDashboard,
    handleJoinDashboard,
    handleLeaveDashboard,
    handleDeleteDashboard,
    activeDashIdRef
  };
}

export type UseDashboardReturn = ReturnType<typeof useDashboard>;
