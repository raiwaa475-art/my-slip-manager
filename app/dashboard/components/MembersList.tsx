"use client";

import { Users, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { User, Dashboard } from "../../../types";
import { useToast } from "@/app/components/ui/Toast";

interface MembersListProps {
  members: { user_id: string }[];
  guestMembers: string[];
  user: User | null;
  activeDashboard: Dashboard | null;
  handleRemoveGuest: (name: string) => void;
  newGuestName: string;
  setNewGuestName: (val: string) => void;
  handleAddGuest: () => void;
}

export function MembersList({
  members,
  guestMembers,
  user,
  activeDashboard,
  handleRemoveGuest,
  newGuestName,
  setNewGuestName,
  handleAddGuest
}: MembersListProps) {
  const { toast } = useToast();
  return (
    <div className="glass rounded-3xl p-5 md:p-8 border border-border bg-card/50 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg">สมาชิกในกลุ่ม</h3>
        <span className="text-xs font-bold bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-lg">
          {members.length + guestMembers.length} คน
        </span>
      </div>
      
      <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar mb-6">
        {/* Real Members */}
        {members.map((m, i) => (
          <div key={`real-${i}`} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border",
                m.user_id === user?.id ? "bg-accent border-accent text-white" : "bg-card border-border text-muted-foreground"
              )}>
                {m.user_id.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">
                  {m.user_id === user?.id ? "คุณ (You)" : `เพื่อน ${m.user_id.substring(0, 6)}`}
                </span>
                <span className="text-[10px] text-muted-foreground">สมาชิกในแอป</span>
              </div>
            </div>
            {m.user_id !== user?.id && (
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        ))}
        
        {/* Guest Members */}
        {guestMembers.map((name, i) => (
          <div key={`guest-${i}`} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border bg-amber-500/10 border-amber-500/20 text-amber-600">
                {name[0].toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">{name}</span>
                <span className="text-[10px] text-muted-foreground">เพิ่มเองชั่วคราว</span>
              </div>
            </div>
            <button 
              onClick={() => handleRemoveGuest(name)}
              className="p-1.5 text-muted hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-4 border-t border-border">
        <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">เพิ่มเพื่อนเอง (ไม่ต้องเข้ากลุ่ม)</label>
        <div className="flex gap-2">
           <input 
             type="text" 
             value={newGuestName}
             onChange={e => setNewGuestName(e.target.value)}
             onKeyDown={e => e.key === 'Enter' && handleAddGuest()}
             placeholder="ระบุชื่อเพื่อน..." 
             className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 transition-all"
           />
           <button 
             onClick={handleAddGuest}
             className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors"
           >
             <Plus className="w-5 h-5" />
           </button>
        </div>
      </div>

      <button 
        onClick={() => {
          navigator.clipboard.writeText(activeDashboard?.id || "");
          toast("คัดลอกรหัสแดชบอร์ดแล้ว ส่งให้เพื่อนเลย!", "success");
        }}
        className="mt-4 w-full py-2 border border-dashed border-indigo-500/30 rounded-xl text-indigo-500 text-xs font-bold hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2"
      >
        <Users className="w-4 h-4" /> แชร์รหัสกลุ่มให้เพื่อน
      </button>
    </div>
  );
}
