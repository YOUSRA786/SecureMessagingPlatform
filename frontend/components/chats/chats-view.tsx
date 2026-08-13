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
import { subscribe, sendEvent } from "@/lib/ws-client";
import { NavRail, type NavTab } from "./nav-rail";
import { ChatThread } from "./chat-thread";
import { CallsView } from "./calls-view";
import { isUserOnline } from "@/lib/presence";

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
  const [typingUsers, setTypingUsers] = useState<Record<number, number[]>>({});
  const [isRailOpen, setIsRailOpen] = useState(true);
  

  // Fetch Conversations
  const loadConversations = useCallback(
    async (isInitial = false) => {
      if (!token) return;
      if (isInitial) setIsLoadingConversations(true);
      try {
        const list = await conversationsApi.list(token);
        
        // Merge polling result with existing in-memory presence to avoid overwriting
        // a more recent presence update (which may include a last_seen_at timestamp).
        setConversations((prev) => {
          try {
            const prevByUser = new Map<number, any>();
            for (const c of prev) {
              for (const m of c.members) {
                prevByUser.set(m.user.id, m.user);
              }
            }

            const merged = list.map((c: any) => ({
              ...c,
              members: c.members.map((m: any) => {
                const prevUser = prevByUser.get(m.user.id);
                if (!prevUser) return m;
                try {
                  const prevTs = prevUser.last_seen_at ? new Date(prevUser.last_seen_at).getTime() : null;
                  const apiTs = m.user.last_seen_at ? new Date(m.user.last_seen_at).getTime() : null;
                  // If prev has a newer timestamp, prefer prev's presence fields
                  if (prevTs && apiTs) {
                    if (prevTs > apiTs) {
                      return { ...m, user: { ...m.user, is_online: prevUser.is_online, last_seen_at: prevUser.last_seen_at } };
                    }
                  } else if (prevTs && !apiTs) {
                    // Prev has a timestamp (offline) while API does not; prefer prev
                    return { ...m, user: { ...m.user, is_online: prevUser.is_online, last_seen_at: prevUser.last_seen_at } };
                  }
                } catch (e) {
                  // ignore and fall back to API value
                }
                return m;
              }),
            }));
            return merged;
          } catch (e) {
            return list;
          }
        });
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
        // Mark messages as read for this conversation: send WS read event and clear local unread_count
        if (res.messages.length > 0) {
          const last = res.messages[res.messages.length - 1];
          try {
            sendEvent({ type: "message.read", data: { conversation_id: conversationId, last_read_message_id: last.id } });
          } catch (e) {}
          setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)));
        }
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

  // WebSocket event subscription
  useEffect(() => {
    const unsub = subscribe((event) => {
      const { type, data } = event || {};
      if (!type) return;
      // message created
      if (type === "message.created") {
        const msg: Message = data as Message;
        // update conversation preview and ordering
        setConversations((prev) => {
          const existing = prev.find((c) => c.id === msg.conversation_id);
          const updated = prev.filter((c) => c.id !== msg.conversation_id);
          const isOwn = msg.sender.id === user?.id;
          const inc = !isOwn && selectedId !== msg.conversation_id ? 1 : 0;
          const conv = existing
            ? ({ ...existing, last_message_preview: msg.content, latest_message_at: msg.created_at, unread_count: existing.unread_count + inc } as Conversation)
            : ({
                id: msg.conversation_id,
                conversation_type: "direct" as const,
                title: null,
                created_by_id: msg.sender.id,
                created_at: msg.created_at,
                updated_at: msg.created_at,
                latest_message_at: msg.created_at,
                last_message_preview: msg.content,
                unread_count: inc,
                members: [],
              } as Conversation);
          return [conv, ...updated];
        });

        // if active conversation, append message to messages
        if (selectedId === msg.conversation_id) {
          setMessages((prev) => [...prev, msg]);
          // send delivered ack
          if (msg.sender.id !== user!.id) {
            sendEvent({ type: "message.delivered", data: { message_id: msg.id } });
          }
        }
      }

      // status updates
      if (type === "message.status_update") {
        const d = data || {};
        // single message status update
        if (d.message_id) {
          const mid = d.message_id as number;
          const uid = d.user_id as number;
          const status = d.status as string;
          setMessages((prev) => prev.map((m) => (m.id === mid ? { ...m, statuses: m.statuses.map((s) => (s.user.id === uid ? { ...s, status: status as any, delivered_at: d.delivered_at ?? s.delivered_at } : s)) } : m)));
        }
        // bulk read updates
        if (d.message_ids) {
          const ids: number[] = d.message_ids;
          const uid = d.user_id as number;
          setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, statuses: m.statuses.map((s) => (s.user.id === uid ? { ...s, status: d.status as any, read_at: d.read_at ?? s.read_at } : s)) } : m)));
        }
      }

      // typing
      if (type === "typing.start" || type === "typing.stop") {
        const convId = data?.conversation_id as number;
        const uid = data?.user_id as number;
        if (!convId || !uid) return;
        setTypingUsers((prev) => {
          const copy = { ...prev };
          const arr = new Set(copy[convId] ?? []);
          if (type === "typing.start") arr.add(uid);
          else arr.delete(uid);
          copy[convId] = Array.from(arr);
          return copy;
        });
      }

      // presence
      if (type === "presence.update") {
        const uid = data?.user_id as number;
        const isOnline =
          data?.is_online === true ||
          data?.is_online === 1 ||
          data?.is_online === "true" ||
          data?.is_online === "1";
        const last_seen_at = data?.last_seen_at ?? null;
        setConversations((prev) => prev.map((c) => ({
          ...c,
          members: c.members.map((m) => (m.user.id === uid ? { ...m, user: { ...m.user, is_online: isOnline, last_seen_at: last_seen_at ?? m.user.last_seen_at } } : m)),
        })));
      }

      // group membership events
      if (type === "group.member_added") {
        const convId = data?.conversation_id as number;
        const user = data?.user as any;
        if (!convId || !user) return;
        setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, members: [...c.members, { user, role: "member", joined_at: new Date().toISOString(), last_read_message_id: null } ] } : c)));
      }

      if (type === "group.member_removed") {
        const convId = data?.conversation_id as number;
        const uid = data?.user_id as number;
        if (!convId || !uid) return;
        setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, members: c.members.filter((m) => m.user.id !== uid) } : c)));
        // If current user was removed, deselect
        if (user && user.id === uid) {
          setSelectedId((prev) => (prev === convId ? null : prev));
        }
      }

      if (type === "group.member_role_updated") {
        const convId = data?.conversation_id as number;
        const uid = data?.user_id as number;
        const role = data?.role as "member" | "admin";
        if (!convId || !uid) return;
        setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, members: c.members.map((m) => (m.user.id === uid ? { ...m, role } : m)) } : c)));
      }
    });
    return () => unsub();
  }, [selectedId, user]);

  // Messages Load & Polling on Selected Conversation change
  useEffect(() => {
    if (selectedId === null) return;
    void loadMessages(selectedId, true);
    const interval = setInterval(() => {
      void loadMessages(selectedId, false);
    }, 2500);
    return () => clearInterval(interval);
  }, [selectedId, loadMessages]);

  const handleSendMessage = async (content: string, contentType: string = "text") => {
    if (!token || selectedId === null) return;
    const newMsg = await messagesApi.send(token, selectedId, content, contentType);
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
    <div className={`app-container ${selectedId !== null ? "chat-active" : ""} ${!isRailOpen ? "rail-collapsed" : ""}`}>
      {/* 1. Left Vertical Navigation Rail */}
      {isRailOpen ? (
        <NavRail
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unreadCount={totalUnread}
          onLogout={() => void logout()}
          onToggleRail={() => setIsRailOpen(false)}
        />
      ) : null}

      {/* Global restore button shown when rail is collapsed. Visible on all tabs. */}
      {!isRailOpen && (
        <button
          className="rail-global-show"
          aria-label="Show navigation"
          onClick={() => setIsRailOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* 2. Main Tab Router (Chats, Calls, Settings) */}
      {activeTab === "calls" && <CallsView />}
      {activeTab === "stories" && (
  <div className="stories-app">
    <div className="stories-sidebar">
      <div className="stories-sidebar-header">
        <h2>Stories</h2>

        <button className="stories-add-btn" title="Add story">
          +
        </button>
      </div>

      <div className="stories-search">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input placeholder="Search" />
      </div>

      <div className="my-story">
        <div className="story-avatar-large">
          +
        </div>

        <div>
          <strong>My Story</strong>
          <span>Add a story</span>
        </div>
      </div>

      <div className="no-stories">
        <strong>No stories</strong>
        <span>New updates will appear here.</span>
      </div>
    </div>

    <div className="stories-main">
      <div className="stories-coming-soon">
        <div className="stories-coming-soon-icon">
          ◇
        </div>

        <h2>Stories</h2>

        <p>
          Stories are coming soon.
        </p>

        <span>
          You'll be able to share photos and videos with your contacts here.
        </span>
      </div>
    </div>
  </div>
)}
      {activeTab === "settings" && <SettingsView user={user} />}

      {activeTab === "chats" && (
        <div style={{ display: "flex", width: "100%", height: "100%" }}>
          {/* Conversation Sidebar Pane */}
          <div className="sidebar-pane">
              <div className="sidebar-header">
                {/* global restore button handles rail show; do not render per-page button here */}

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
              typingUserIds={typingUsers[activeConversation.id] ?? []}
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
