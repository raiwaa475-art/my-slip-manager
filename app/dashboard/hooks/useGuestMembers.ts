"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dashboard } from "../../../types";
import { useToast } from "@/app/components/ui/Toast";

export function useGuestMembers(activeDashboard: Dashboard | null, setActiveDashboard: (dash: Dashboard | null) => void) {
  const { toast } = useToast();
  const [guestMembers, setGuestMembers] = useState<string[]>([]);
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
      if (activeDashboard.metadata?.guest_members) {
        setGuestMembers(activeDashboard.metadata.guest_members);
      } else {
        setGuestMembers([]);
      }
      
      if (activeDashboard.metadata?.promptpay_id) {
        setPromptPayId(activeDashboard.metadata.promptpay_id);
      } else {
        setPromptPayId("");
      }

      setPaymentType(activeDashboard.metadata?.payment_type || 'promptpay');
      setBankAccountNumber(activeDashboard.metadata?.bank_account_number || "");
      setBankName(activeDashboard.metadata?.bank_name || "");

      fetchMembers(activeDashboard.id);
    }
  }, [activeDashboard, fetchMembers]);

  const handleAddGuest = async () => {
    if (!newGuestName.trim() || !activeDashboard) return;
    
    const updatedGuests = [...guestMembers, newGuestName.trim()];
    const currentMetadata = activeDashboard.metadata || {};
    
    try {
      await supabase
        .from('dashboards')
        .update({ metadata: { ...currentMetadata, guest_members: updatedGuests } })
        .eq('id', activeDashboard.id);
        
      setGuestMembers(updatedGuests);
      setNewGuestName("");
      setActiveDashboard({
        ...activeDashboard,
        metadata: { ...currentMetadata, guest_members: updatedGuests }
      });
      toast("เพิ่มเพื่อนชั่วคราวสำเร็จ", "success");
    } catch (err) {
      console.error("Error adding guest member:", err);
      toast("เพิ่มไม่สำเร็จ", "error");
    }
  };

  const handleRemoveGuest = async (name: string) => {
    if (!activeDashboard) return;
    
    const previous = [...guestMembers];
    const updatedGuests = guestMembers.filter(g => g !== name);
    const currentMetadata = activeDashboard.metadata || {};
    
    // Optimistic Update
    setGuestMembers(updatedGuests);
    
    try {
      const { error } = await supabase
        .from('dashboards')
        .update({ metadata: { ...currentMetadata, guest_members: updatedGuests } })
        .eq('id', activeDashboard.id);
        
      if (error) throw error;

      setActiveDashboard({
        ...activeDashboard,
        metadata: { ...currentMetadata, guest_members: updatedGuests }
      });
      toast(`ลบ "${name}" สำเร็จ`, "success");
    } catch (err) {
      console.error("Error removing guest member:", err);
      // Rollback
      setGuestMembers(previous);
      toast("ลบไม่สำเร็จ กรุณาลองใหม่", "error");
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
      await supabase
        .from('dashboards')
        .update({ metadata: updatedMetadata })
        .eq('id', activeDashboard.id);
        
      setActiveDashboard({
        ...activeDashboard,
        metadata: updatedMetadata
      });
      setIsSettingsOpen(false);
      toast("บันทึกข้อมูลการรับเงินสำเร็จ", "success");
    } catch (err) {
      console.error("Error saving payment settings:", err);
      toast("บันทึกไม่สำเร็จ", "error");
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
