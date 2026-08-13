"use client";

import { type Conversation, type User } from "@/lib/api";
import { isUserOnline } from "@/lib/presence";

interface ConversationSidebarProps {
  conversations: Conversation[];
  selectedId: number | null;
  currentUserId: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectConversation: (id: number) => void;
  onOpenNewChatModal: () => void;
  isLoading: boolean;
}

function getConversationDisplayName(conversation: Conversation, currentUserId: number): string {
  if (conversation.conversation_type === "group") {
    return conversation.title ?? "Untitled Group";
  }
  const other = conversation.members.find((m) => m.user.id !== currentUserId);
  return other?.user.display_name ?? "Direct Message";
}

function formatConversationTime(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationSidebar({
  conversations,
  selectedId,
  currentUserId,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onOpenNewChatModal,
  isLoading,
}: ConversationSidebarProps) {
  const filteredConversations = conversations.filter((c) => {
    const name = getConversationDisplayName(c, currentUserId).toLowerCase();
    const preview = (c.last_message_preview ?? "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || preview.includes(q);
  });

  return (
    <div className="sidebar-pane">
      {/* Header */}
      <div className="sidebar-header">
        <h2>Chats</h2>
        <div className="sidebar-actions">
          <button
            className="icon-btn"
            title="New Conversation"
            onClick={onOpenNewChatModal}
            aria-label="New Conversation"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="search-container">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Conversation List */}
      {isLoading ? (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
          Loading conversations…
        </div>
      ) : (
        <div className="conversation-list">
          {filteredConversations.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedId;
              const name = getConversationDisplayName(conv, currentUserId);
              const time = formatConversationTime(conv.latest_message_at);
              const otherMember = conv.members.find((m) => m.user.id !== currentUserId)?.user;
              const isOnline = conv.conversation_type === "direct" && (otherMember ? isUserOnline(otherMember.is_online) : false);

              return (
                <button
                  key={conv.id}
                  className={`conversation-item ${isSelected ? "active" : ""}`}
                  onClick={() => onSelectConversation(conv.id)}
                >
                    <div className="avatar-wrapper">
                      <div className="avatar">{name.slice(0, 1).toUpperCase()}</div>
                    </div>

                  <div className="conversation-info">
                    <div className="conversation-top">
                      <span className="conversation-name">{name}</span>
                      {time && <span className="conversation-time">{time}</span>}
                    </div>
                    <div className="conversation-bottom">
                      <span className="conversation-preview">
                        {conv.last_message_preview ?? "No messages yet"}
                      </span>
                      {/* show online dot for direct chats only */}
                      {conv.unread_count > 0 && (
                        <span className="unread-badge">{conv.unread_count}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
