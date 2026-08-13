"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { type Conversation, type Message, type User } from "@/lib/api";

interface ChatThreadProps {
  conversation: Conversation;
  messages: Message[];
  currentUser: User;
  onSendMessage: (content: string) => Promise<void>;
  isLoadingMessages: boolean;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateHeader(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
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

export function ChatThread({
  conversation,
  messages,
  currentUser,
  onSendMessage,
  isLoadingMessages,
}: ChatThreadProps) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const title = getConversationTitle(conversation, currentUser.id);
  const otherUser = getOtherMember(conversation, currentUser.id);
  const isGroup = conversation.conversation_type === "group";

  // Auto-scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e?: FormEvent) {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setText("");
    try {
      await onSendMessage(trimmed);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="main-pane">
      {/* Header */}
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

        {/* Action icons (Calls, Video, Search) */}
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
        </div>
      </div>

      {/* Message Body */}
      <div className="messages-container">
        {/* Encryption banner */}
        <div className="encryption-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them.</span>
        </div>

        {isLoadingMessages && messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>Loading message history…</div>
        ) : (
          messages.map((msg, index) => {
            const isOutgoing = msg.sender.id === currentUser.id;
            const prevMsg = messages[index - 1];
            const showDateHeader =
              !prevMsg || new Date(prevMsg.created_at).toDateString() !== new Date(msg.created_at).toDateString();

            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column" }}>
                {showDateHeader && (
                  <div className="date-divider">
                    <span>{formatDateHeader(msg.created_at)}</span>
                  </div>
                )}

                <div className={`message-row ${isOutgoing ? "outgoing" : "incoming"}`}>
                  {isGroup && !isOutgoing && <span className="sender-name">{msg.sender.display_name}</span>}
                  <div className="message-bubble">
                    <span>{msg.content}</span>
                    <span className="message-footer">
                      <span>{formatTime(msg.created_at)}</span>
                      {isOutgoing && (
                        <span className="status-icon" title="Sent / Delivered">
                          ✓✓
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="composer-container">
        <form className="composer-box" onSubmit={handleSend}>
          <button type="button" className="icon-btn" title="Add attachment">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <textarea
            className="composer-input"
            placeholder="Signal message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />

          <button type="button" className="icon-btn" title="Emoji">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>

          <button type="submit" className="send-btn" disabled={!text.trim() || isSending} title="Send Message">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
