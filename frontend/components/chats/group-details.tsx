"use client";

import { useEffect, useState } from "react";
import { conversationsApi, type ConversationMember, type User } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import AddMemberModal from "./add-member-modal";

interface GroupDetailsProps {
  conversationId: number;
  onClose: () => void;
  onMemberChange?: () => void;
}

export function GroupDetails({ conversationId, onClose, onMemberChange }: GroupDetailsProps) {
  const { token, user } = useAuth();
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!token) return;
      setIsLoading(true);
      try {
        const res = await conversationsApi.listMembers(token, conversationId);
        if (mounted) setMembers(res);
      } catch (e) {
        // ignore for now
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [token, conversationId]);

  const isAdmin = members.some((m) => m.user.id === user?.id && m.role === "admin");

  return (
    <div className="modal-overlay">
      <div className="modal-card" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>Group Details</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div>Loading…</div>
          ) : (
            <div>
              <div style={{ marginBottom: 8, fontWeight: 700, color: "var(--text-secondary)" }}>{members.length} members</div>
              <div>
                {members.map((m) => (
                  <div key={m.user.id} className="settings-profile-card" style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="avatar md">{m.user.display_name.slice(0, 1).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{m.user.display_name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>@{m.user.username}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {m.role === "admin" && <span style={{ fontSize: 12, padding: "6px 8px", borderRadius: 12, background: "var(--bg-hover)", color: "var(--text-secondary)", fontWeight: 700 }}>Admin</span>}
                        {isAdmin && m.user.id !== user?.id && (
                          <button className="icon-btn" title="Remove member">🗑</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isAdmin && (
                <div style={{ marginTop: 12, textAlign: "right" }}>
                  <button className="primary-btn" onClick={() => setShowAdd(true)}>+ Add member</button>
                </div>
              )}

              {showAdd && (
                <AddMemberModal
                  conversationId={conversationId}
                  existingMemberIds={members.map((m) => m.user.id)}
                  onClose={() => setShowAdd(false)}
                  onAdded={(user: User) => {
                    setMembers((prev) => [...prev, { user, role: "member", joined_at: new Date().toISOString(), last_read_message_id: null }]);
                    if (onMemberChange) onMemberChange();
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupDetails;
