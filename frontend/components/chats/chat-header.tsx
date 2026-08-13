"use client";

import { type Conversation, type User } from "@/lib/api";

interface ChatHeaderProps {
  conversation: Conversation;
  currentUserId: number;
}

function getConversationTitle(conversation: Conversation, currentUserId: number): string {
  if (conversation.conversation_type === "group") {
    return conversation.title ?? "Group Chat";
  }
  const otherMember = conversation.members.find((m) => m.user.id !== currentUserId);
  return otherMember?.user.display_name ?? "Direct Message";
}

function getOtherMember(conversation: Conversation, currentUserId: number): User | undefined {
  return conversation.members.find((m) => m.user.id !== currentUserId)?.user;
}

export function ChatHeader({ conversation, currentUserId }: ChatHeaderProps) {
  const title = getConversationTitle(conversation, currentUserId);
  const otherUser = getOtherMember(conversation, currentUserId);
  const isGroup = conversation.conversation_type === "group";

  return (
    <div className="chat-header">
      <div className="chat-header-info">
        <div className="avatar-wrapper">
          <div className="avatar">{title.slice(0, 1).toUpperCase()}</div>
          {!isGroup && otherUser?.is_online && <div className="online-dot" />}
        </div>
        <div className="chat-header-title">
          <h3>{title}</h3>
          <span className="chat-header-sub">
            {isGroup
              ? `${conversation.members.length} members`
              : otherUser?.is_online
              ? "Online"
              : otherUser?.last_seen_at
              ? "Last seen recently"
              : "Signal User"}
          </span>
        </div>
      </div>

      {/* Header action icons */}
      <div className="chat-header-actions">
        <button className="icon-btn" title="Start voice call" onClick={() => alert("Voice call initiated")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>
        <button className="icon-btn" title="Start video call" onClick={() => alert("Video call initiated")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </button>
        <button className="icon-btn" title="Search in chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <button className="icon-btn" title="More options">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
