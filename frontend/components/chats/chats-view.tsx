"use client";

import { useEffect, useState, useCallback } from "react";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useAuth } from "@/context/auth-context";
import {
  ApiError,
  conversationsApi,
  messagesApi,
  type Conversation,
  type Message,
} from "@/lib/api";
import { NavRail, type NavTab } from "./nav-rail";
import { ChatThread } from "./chat-thread";
import { CallsView } from "./calls-view";
import { SettingsView } from "@/components/settings/settings-view";
import { NewChatModal } from "./new-chat-modal";

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

export function ChatsView() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>("chats");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch Conversations
  const loadConversations = useCallback(
    async (isInitial = false) => {
      if (!token) return;
      if (isInitial) setIsLoadingConversations(true);
      try {
        const list = await conversationsApi.list(token);
        setConversations(list);
        if (isInitial && list.length > 0 && selectedId === null) {
          setSelectedId(list[0].id);
        }
      } catch (err) {
        if (isInitial) {
          setError(err instanceof ApiError ? err.message : "Failed to load conversations.");
        }
      } finally {
        if (isInitial) setIsLoadingConversations(false);
      }
    },
    [token, selectedId]
  );

  // Fetch Messages for Active Conversation
  const loadMessages = useCallback(
    async (conversationId: number, isInitial = false) => {
      if (!token) return;
      if (isInitial) setIsLoadingMessages(true);
      try {
        const res = await messagesApi.list(token, conversationId);
        setMessages(res.messages);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        if (isInitial) setIsLoadingMessages(false);
      }
    },
    [token]
  );

  // Initial Load & Polling for Conversation List
  useEffect(() => {
    void loadConversations(true);
    const interval = setInterval(() => {
      void loadConversations(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Messages Load & Polling on Selected Conversation change
  useEffect(() => {
    if (selectedId === null) return;
    void loadMessages(selectedId, true);
    const interval = setInterval(() => {
      void loadMessages(selectedId, false);
    }, 2500);
    return () => clearInterval(interval);
  }, [selectedId, loadMessages]);

  const handleSendMessage = async (content: string) => {
    if (!token || selectedId === null) return;
    const newMsg = await messagesApi.send(token, selectedId, content);
    setMessages((prev) => [...prev, newMsg]);
    // Refresh conversation preview
    void loadConversations(false);
  };

  const handleConversationCreated = (newConv: Conversation) => {
    setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
    setSelectedId(newConv.id);
    setActiveTab("chats");
  };

  if (!user || !token) return null;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const filteredConversations = conversations.filter((c) => {
    const name = getConversationDisplayName(c, user.id).toLowerCase();
    const preview = (c.last_message_preview ?? "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || preview.includes(q);
  });

  const activeConversation = conversations.find((c) => c.id === selectedId);

  return (
    <div className={`app-container ${selectedId !== null ? "chat-active" : ""}`}>
      {/* 1. Left Vertical Navigation Rail */}
      <NavRail
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadCount={totalUnread}
        onLogout={() => void logout()}
      />

      {/* 2. Main Tab Router (Chats, Calls, Settings) */}
      {activeTab === "calls" && <CallsView />}

      {activeTab === "settings" && <SettingsView user={user} />}

      {activeTab === "chats" && (
        <div style={{ display: "flex", width: "100%", height: "100%" }}>
          {/* Conversation Sidebar Pane */}
          <div className="sidebar-pane">
            <div className="sidebar-header">
              <h2>Chats</h2>
              <div className="sidebar-actions">
                <button
                  className="icon-btn"
                  title="New Conversation"
                  onClick={() => setIsModalOpen(true)}
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Conversation List */}
            {isLoadingConversations ? (
              <PageSpinner label="Loading conversations…" />
            ) : error ? (
              <Alert>{error}</Alert>
            ) : (
              <div className="conversation-list">
                {filteredConversations.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                    No conversations found.
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isSelected = conv.id === selectedId;
                    const name = getConversationDisplayName(conv, user.id);
                    const time = formatConversationTime(conv.latest_message_at);

                    return (
                      <button
                        key={conv.id}
                        className={`conversation-item ${isSelected ? "active" : ""}`}
                        onClick={() => setSelectedId(conv.id)}
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

          {/* Active Chat Thread Pane */}
          {activeConversation ? (
            <ChatThread
              conversation={activeConversation}
              messages={messages}
              currentUser={user}
              onSendMessage={handleSendMessage}
              isLoadingMessages={isLoadingMessages}
            />
          ) : (
            <div className="main-pane">
              <div className="empty-chat-state">
                <div className="empty-chat-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.34 5L2 22l5.13-1.31A9.95 9.95 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.57 0-3.04-.43-4.3-1.18l-.31-.19-3.2.82.84-3.11-.2-.33A7.95 7.95 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
                  </svg>
                </div>
                <h2>Signal for Desktop</h2>
                <p>Send and receive messages without keeping your phone online.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Chat / Group Modal */}
      <NewChatModal
        token={token}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
