"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dashboard } from "../../../types";
import { useToast } from "@/app/components/ui/Toast";
import { useAuth } from "../../contexts/AuthContext";

export function useGuestMembers(activeDashboard: Dashboard | null, setActiveDashboard: (dash: Dashboard | null) => void) {
  const { toast } = useToast();
  const { updateDashboardMetadata } = useAuth();
  
  // Memoize guestMembers เพื่อไม่ให้เกิด Array ใหม่ทุกครั้งที่ Render (ป้องกัน Infinite Loop ใน useDebts)
  const guestMembers = useMemo(() => activeDashboard?.metadata?.guest_members || [], [activeDashboard?.metadata?.guest_members]);
  
  const [newGuestName, setNewGuestName] = useState("");
  const [promptPayId, setPromptPayId] = useState("");
  const [paymentType, setPaymentType] = useState<'promptpay' | 'bank'>('promptpay');
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [members, setMembers] = useState<{ user_id: string }[]>([]);
  
  const supabase = useMemo(() => createClient(), []);

  const fetchMembers = useCallback(async (dashboardId: string) => {
    try {
      const { data, error } = await supabase
        .from('dashboard_users')
        .select('user_id')
        .eq('dashboard_id', dashboardId);

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  }, [supabase]);

  useEffect(() => {
    if (activeDashboard) {
      setPromptPayId(activeDashboard.metadata?.promptpay_id || "");
      setPaymentType(activeDashboard.metadata?.payment_type || 'promptpay');
      setBankAccountNumber(activeDashboard.metadata?.bank_account_number || "");
      setBankName(activeDashboard.metadata?.bank_name || "");
      fetchMembers(activeDashboard.id);

      // Real-time for members list
      const memberChannel = supabase
        .channel(`members-${activeDashboard.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'dashboard_users',
            filter: `dashboard_id=eq.${activeDashboard.id}`
          },
          () => {
            console.log('👥 [useGuestMembers] Members changed, refetching...');
            fetchMembers(activeDashboard.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(memberChannel);
      };
    }
  }, [activeDashboard, fetchMembers, supabase]);

  const handleAddGuest = async () => {
    if (!newGuestName.trim() || !activeDashboard) return;
    
    const updatedGuests = [...guestMembers, newGuestName.trim()];
    const currentMetadata = activeDashboard.metadata || {};
    
    try {
      await updateDashboardMetadata(activeDashboard.id, { 
        ...currentMetadata, 
        guest_members: updatedGuests 
      });
      setNewGuestName("");
    } catch (err) {
      console.error("🚨 [useGuestMembers] Error adding guest member:", err);
    }
  };

  const handleRemoveGuest = async (name: string) => {
    if (!activeDashboard) return;
    
    // กรองชื่อที่ต้องการลบออก
    const updatedGuests = guestMembers.filter((g: string) => g !== name);
    const currentMetadata = activeDashboard.metadata || {};
    
    try {
      console.log(`🗑️ [useGuestMembers] Removing ${name}, new list:`, updatedGuests);
      await updateDashboardMetadata(activeDashboard.id, { 
        ...currentMetadata, 
        guest_members: updatedGuests 
      });
    } catch (err) {
      console.error("🚨 [useGuestMembers] Error removing guest member:", err);
    }
  };

  const savePaymentSettings = async () => {
    if (!activeDashboard) return;
    const currentMetadata = activeDashboard.metadata || {};
    const updatedMetadata = { 
      ...currentMetadata, 
      promptpay_id: promptPayId,
      payment_type: paymentType,
      bank_account_number: bankAccountNumber,
      bank_name: bankName
    };

    try {
      await updateDashboardMetadata(activeDashboard.id, updatedMetadata);
      setIsSettingsOpen(false);
    } catch (err) {
      console.error("🚨 [useGuestMembers] Error saving payment settings:", err);
    }
  };

  return {
    guestMembers,
    newGuestName,
    setNewGuestName,
    promptPayId,
    setPromptPayId,
    paymentType,
    setPaymentType,
    bankAccountNumber,
    setBankAccountNumber,
    bankName,
    setBankName,
    isSettingsOpen,
    setIsSettingsOpen,
    members,
    handleAddGuest,
    handleRemoveGuest,
    savePaymentSettings
  };
}
