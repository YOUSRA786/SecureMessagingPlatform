"use client";

import { useEffect, useState } from "react";
import { usersApi, conversationsApi, type User } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

interface AddMemberModalProps {
  conversationId: number;
  existingMemberIds: number[];
  onClose: () => void;
  onAdded: (user: User) => void;
}

export function AddMemberModal({ conversationId, existingMemberIds, onClose, onAdded }: AddMemberModalProps) {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function doSearch() {
      if (!token || !query) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await usersApi.search(token, query);
        if (!mounted) return;
        setResults(res.filter((u) => !existingMemberIds.includes(u.id)));
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setIsSearching(false);
      }
    }
    const t = setTimeout(() => void doSearch(), 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [token, query, existingMemberIds]);

  async function handleAdd(user: User) {
    if (!token) return;
    try {
      await conversationsApi.addMember(token, conversationId, user.id);
      onAdded(user);
      onClose();
      alert(`Added ${user.display_name}`);
    } catch (err: any) {
      alert(err?.message ?? "Failed to add member");
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>Add Member</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label style={{ fontSize: 13, fontWeight: 700 }}>Search users</label>
            <input className="form-input" placeholder="Search users" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {isSearching && <div style={{ color: "var(--text-muted)", marginBottom: 8 }}>Searching…</div>}
          <div>
            {results.map((u) => (
              <div key={u.id} className="settings-profile-card" style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="avatar">{u.display_name.slice(0, 1).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{u.display_name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>@{u.username}</div>
                  </div>
                  <div>
                    <button className="primary-btn" onClick={() => void handleAdd(u)}>Add</button>
                  </div>
                </div>
              </div>
            ))}
            {results.length === 0 && !isSearching && <div style={{ color: "var(--text-muted)" }}>No users found</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddMemberModal;
