"use client";

import { useEffect, useState } from "react";
import { type Conversation, type User, conversationsApi, usersApi } from "@/lib/api";

interface NewChatModalProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversation: Conversation) => void;
}

export function NewChatModal({ token, isOpen, onClose, onConversationCreated }: NewChatModalProps) {
  const [tab, setTab] = useState<"direct" | "group">("direct");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !token) return;
    setIsLoading(true);
    setError(null);
    const fetchUsers = searchQuery.trim()
      ? usersApi.search(token, searchQuery)
      : usersApi.list(token);

    fetchUsers
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users"))
      .finally(() => setIsLoading(false));
  }, [isOpen, token, searchQuery]);

  if (!isOpen) return null;

  async function handleStartDirect(userId: number) {
    setIsSubmitting(true);
    setError(null);
    try {
      const conversation = await conversationsApi.createDirect(token, userId);
      onConversationCreated(conversation);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create direct chat.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateGroup() {
    if (!groupTitle.trim() || selectedUserIds.length === 0) {
      setError("Please enter a group title and select at least 1 member.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const conversation = await conversationsApi.createGroup(token, groupTitle.trim(), selectedUserIds);
      onConversationCreated(conversation);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create group.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleUserSelection(id: number) {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Message</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Tab selection */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)" }}>
          <button
            className={`settings-menu-item ${tab === "direct" ? "active" : ""}`}
            style={{ borderRadius: 0, justifyContent: "center", flex: 1 }}
            onClick={() => setTab("direct")}
          >
            Direct Message
          </button>
          <button
            className={`settings-menu-item ${tab === "group" ? "active" : ""}`}
            style={{ borderRadius: 0, justifyContent: "center", flex: 1 }}
            onClick={() => setTab("group")}
          >
            New Group
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ color: "#d93025", fontSize: "13px", marginBottom: "12px" }}>
              {error}
            </div>
          )}

          {tab === "group" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                Group Title
              </label>
              <input
                className="form-input"
                placeholder="e.g. Project Team"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
              />
            </div>
          )}

          {/* User Search Input */}
          <div className="search-box" style={{ marginBottom: "16px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* User List */}
          {isLoading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>Searching users…</div>
          ) : users.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>No users found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {users.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    className="conversation-item"
                    style={{ background: isSelected ? "var(--bg-active)" : undefined }}
                    onClick={() => {
                      if (tab === "direct") {
                        void handleStartDirect(user.id);
                      } else {
                        toggleUserSelection(user.id);
                      }
                    }}
                  >
                    <div className="avatar">{user.display_name.slice(0, 1).toUpperCase()}</div>
                    <div className="conversation-info">
                      <div className="conversation-name">{user.display_name}</div>
                      <div className="conversation-preview">@{user.username} {user.phone ? `· ${user.phone}` : ""}</div>
                    </div>
                    {tab === "group" && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUserSelection(user.id)}
                        style={{ width: "18px", height: "18px", accentColor: "var(--brand)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {tab === "group" && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border-color)", textAlign: "right" }}>
            <button
              className="send-btn"
              style={{ width: "auto", borderRadius: "10px", padding: "0 20px", fontSize: "14px", height: "40px" }}
              disabled={isSubmitting || !groupTitle.trim() || selectedUserIds.length === 0}
              onClick={() => void handleCreateGroup()}
            >
              {isSubmitting ? "Creating…" : `Create Group (${selectedUserIds.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
