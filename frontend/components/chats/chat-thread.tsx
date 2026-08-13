"use client";

import {
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { sendEvent } from "@/lib/ws-client";
import {
  type Conversation,
  type Message,
  type User,
} from "@/lib/api";

import GroupDetails from "./group-details";
import { useAuth } from "@/context/auth-context";

/* =========================================================
   EMOJI PICKER
========================================================= */

function EmojiPickerInline({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  const emojis = [
    "😀",
    "😁",
    "😂",
    "🤣",
    "😃",
    "😄",
    "😅",
    "😊",
    "😉",
    "😍",
    "😘",
    "😎",
    "😏",
    "😇",
    "🙂",
    "🙃",
    "🤗",
    "🤔",
    "😴",
    "😬",
    "😮",
    "😌",
    "😢",
    "😭",
    "😡",
    "👍",
    "👎",
    "👏",
    "🙏",
    "🎉",
    "🔥",
    "❤️",
    "💙",
    "🤝",
    "🤷",
    "🎁",
    "🤖",
    "🌟",
    "😺",
  ];

  return (
    <div
      style={{
        width: 320,
        maxHeight: 260,
        overflow: "auto",
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: 12,
        padding: 10,
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: 6,
        }}
      >
        {emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="icon-btn"
            style={{
              padding: 7,
              fontSize: 20,
              borderRadius: 8,
            }}
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   PROPS
========================================================= */

interface ChatThreadProps {
  conversation: Conversation;
  messages: Message[];
  currentUser: User;
  onSendMessage: (
    content: string,
    contentType?: string
  ) => Promise<void>;
  isLoadingMessages: boolean;
  typingUserIds?: number[];
}

/* =========================================================
   HELPERS
========================================================= */

function formatTime(isoString: string): string {
  const date = new Date(isoString);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateHeader(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return "Today";
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getConversationTitle(
  conversation: Conversation,
  currentUserId: number
): string {
  if (conversation.conversation_type === "group") {
    return conversation.title ?? "Group Chat";
  }

  const otherMember = conversation.members.find(
    (m) => m.user.id !== currentUserId
  );

  return (
    otherMember?.user.display_name ??
    "Direct Message"
  );
}

function getOtherMember(
  conversation: Conversation,
  currentUserId: number
): User | undefined {
  return conversation.members.find(
    (m) => m.user.id !== currentUserId
  )?.user;
}

function getAttachmentUrl(url: string): string {
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";

  return `${apiUrl}${
    url.startsWith("/") ? url : `/${url}`
  }`;
}

/* =========================================================
   ICONS
========================================================= */

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 18a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.1 3.37 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect
        x="1"
        y="5"
        width="15"
        height="14"
        rx="2"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line
        x1="21"
        y1="21"
        x2="16.65"
        y2="16.65"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.44 11.05l-9.19 9.19a4 4 0 0 1-5.66 0 4 4 0 0 1 0-5.66l8.48-8.48a2 2 0 0 1 2.83 2.83l-7.78 7.78a1 1 0 0 1-1.41-1.41l7.07-7.07" />
    </svg>
  );
}

function SmileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect
        x="3"
        y="11"
        width="18"
        height="11"
        rx="2"
      />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <path d="M15 14c3 0 5 1.5 5 4" />
    </svg>
  );
}

/* =========================================================
   CHAT THREAD
========================================================= */

export function ChatThread({
  conversation,
  messages,
  currentUser,
  onSendMessage,
  isLoadingMessages,
  typingUserIds = [],
}: ChatThreadProps) {
  const { token } = useAuth();

  const [text, setText] = useState("");
  const [isSending, setIsSending] =
    useState(false);
  const [isTyping, setIsTyping] =
    useState(false);
  const [showEmoji, setShowEmoji] =
    useState(false);
  const [attachments, setAttachments] =
    useState<File[]>([]);
  const [uploadProgress, setUploadProgress] =
    useState<Record<number, number>>({});
  const [toast, setToast] =
    useState<string | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const typingTimer =
    useRef<number | null>(null);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const [showDetails, setShowDetails] =
    useState(false);

  const title = getConversationTitle(
    conversation,
    currentUser.id
  );

  const otherUser = getOtherMember(
    conversation,
    currentUser.id
  );

  const isGroup =
    conversation.conversation_type ===
    "group";

  /* =====================================================
     AUTO SCROLL
  ===================================================== */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  /* =====================================================
     SEND MESSAGE
     Attachment logic preserved
  ===================================================== */

  async function handleSend() {
    if (
      (!text.trim() &&
        attachments.length === 0) ||
      isSending
    ) {
      return;
    }

    setIsSending(true);

    try {
      try {
        sendEvent({
          type: "typing.stop",
          data: {
            conversation_id: conversation.id,
          },
        });
      } catch {}

      setIsTyping(false);

      let content = text.trim();
      let contentType = "text";

      if (attachments.length > 0) {
        try {
          const uploaded: any[] = [];

          /* Multipart upload */
          for (
            let idx = 0;
            idx < attachments.length;
            idx++
          ) {
            const file = attachments[idx];

            const result =
              await new Promise<any>(
                (resolve, reject) => {
                  const xhr =
                    new XMLHttpRequest();

                  const apiUrl =
                    process.env
                      .NEXT_PUBLIC_API_URL ??
                    "http://localhost:8000";

                  xhr.open(
                    "POST",
                    `${apiUrl}/attachments`
                  );

                  if (token) {
                    xhr.setRequestHeader(
                      "Authorization",
                      `Bearer ${token}`
                    );
                  }

                  xhr.onload = () => {
                    try {
                      const json =
                        JSON.parse(
                          xhr.responseText ||
                            "null"
                        );

                      if (
                        xhr.status >= 200 &&
                        xhr.status < 300
                      ) {
                        resolve(
                          Array.isArray(json)
                            ? json[0]
                            : json
                        );
                      } else {
                        reject(json);
                      }
                    } catch {
                      reject({
                        message:
                          "Invalid server response",
                      });
                    }
                  };

                  xhr.onerror = () => {
                    reject({
                      message:
                        "Upload failed",
                    });
                  };

                  xhr.upload.onprogress = (
                    ev
                  ) => {
                    const pct =
                      ev.lengthComputable
                        ? Math.round(
                            (ev.loaded /
                              ev.total) *
                              100
                          )
                        : 0;

                    setUploadProgress(
                      (prev) => ({
                        ...prev,
                        [idx]: pct,
                      })
                    );
                  };

                  const form =
                    new FormData();

                  form.append(
                    "files",
                    file
                  );

                  xhr.send(form);
                }
              );

            uploaded.push(result);
          }

          content = JSON.stringify({
            text: text.trim(),
            attachments: uploaded,
          });

          contentType = "attachment";

          setUploadProgress({});
        } catch (err: any) {
          const errMsg =
            err?.detail ??
            err?.message ??
            String(
              err ??
                "Failed to upload attachments"
            );

          const lowerError =
            String(
              errMsg
            ).toLowerCase();

          /* JSON/base64 fallback */
          if (
            lowerError.includes(
              "invalid form data"
            ) ||
            lowerError.includes("multipart")
          ) {
            try {
              const uploaded: any[] = [];

              for (
                let idx = 0;
                idx < attachments.length;
                idx++
              ) {
                const file =
                  attachments[idx];

                const b64 =
                  await new Promise<string>(
                    (
                      resolve,
                      reject
                    ) => {
                      const reader =
                        new FileReader();

                      reader.onerror =
                        () =>
                          reject(
                            new Error(
                              "Failed to read file"
                            )
                          );

                      reader.onload = () => {
                        const result =
                          reader.result as string;

                        const comma =
                          result.indexOf(
                            ","
                          );

                        if (
                          comma === -1
                        ) {
                          reject(
                            new Error(
                              "Invalid file data"
                            )
                          );
                          return;
                        }

                        resolve(
                          result.slice(
                            comma + 1
                          )
                        );
                      };

                      reader.readAsDataURL(
                        file
                      );
                    }
                  );

                const apiUrl =
                  process.env
                    .NEXT_PUBLIC_API_URL ??
                  "http://localhost:8000";

                const response =
                  await fetch(
                    `${apiUrl}/attachments`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type":
                          "application/json",
                        ...(token
                          ? {
                              Authorization: `Bearer ${token}`,
                            }
                          : {}),
                      },
                      body: JSON.stringify(
                        [
                          {
                            filename:
                              file.name,
                            content: b64,
                            content_type:
                              file.type ||
                              "application/octet-stream",
                          },
                        ]
                      ),
                    }
                  );

                const json =
                  await response
                    .json()
                    .catch(
                      () => null
                    );

                if (!response.ok) {
                  throw (
                    json ?? {
                      message:
                        "Fallback upload failed",
                    }
                  );
                }

                const uploadedFile =
                  Array.isArray(json)
                    ? json[0]
                    : json;

                if (!uploadedFile) {
                  throw new Error(
                    "Server returned an empty upload response"
                  );
                }

                uploaded.push(
                  uploadedFile
                );

                setUploadProgress(
                  (prev) => ({
                    ...prev,
                    [idx]: 100,
                  })
                );
              }

              content =
                JSON.stringify({
                  text: text.trim(),
                  attachments:
                    uploaded,
                });

              contentType =
                "attachment";

              setUploadProgress({});
            } catch (
              fallbackError: any
            ) {
              setToast(
                String(
                  fallbackError?.detail ??
                    fallbackError?.message ??
                    "Failed to upload attachment"
                )
              );

              setUploadProgress({});

              return;
            }
          } else {
            setToast(
              String(errMsg)
            );

            setUploadProgress({});

            return;
          }
        }
      }

      await onSendMessage(
        content,
        contentType
      );

      setText("");
      setAttachments([]);
      setUploadProgress({});
    } catch (error: any) {
      setToast(
        String(
          error?.detail ??
            error?.message ??
            "Failed to send message"
        )
      );
    } finally {
      setIsSending(false);
    }
  }

  /* =====================================================
     KEYBOARD
  ===================================================== */

  function handleKeyDown(
    e: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();
      void handleSend();
    }
  }

  /* =====================================================
     TYPING
  ===================================================== */

  function handleChangeText(
    value: string
  ) {
    setText(value);

    if (
      !isTyping &&
      value.trim().length > 0
    ) {
      setIsTyping(true);

      try {
        sendEvent({
          type: "typing.start",
          data: {
            conversation_id:
              conversation.id,
          },
        });
      } catch {}
    }

    if (typingTimer.current) {
      window.clearTimeout(
        typingTimer.current
      );
    }

    typingTimer.current =
      window.setTimeout(() => {
        setIsTyping(false);

        try {
          sendEvent({
            type: "typing.stop",
            data: {
              conversation_id:
                conversation.id,
            },
          });
        } catch {}
      }, 2000);
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="main-pane">
      {/* =================================================
          SIGNAL STYLE HEADER
      ================================================= */}

      <div className="chat-header">
        <div
          className="chat-header-info"
          style={{
            cursor: isGroup
              ? "pointer"
              : "default",
          }}
          onClick={() => {
            if (isGroup) {
              setShowDetails(true);
            }
          }}
        >
          <div className="avatar-wrapper">
            <div
              className="avatar"
              style={
                isGroup
                  ? {
                      width: 54,
                      height: 54,
                      borderRadius:
                        "50%",
                      background:
                        "#d0e3cf",
                      color:
                        "#12751a",
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                    }
                  : undefined
              }
            >
              {isGroup ? (
                <GroupIcon />
              ) : (
                title
                  .slice(0, 1)
                  .toUpperCase()
              )}
            </div>

            {!isGroup &&
              otherUser?.is_online && (
                <div className="online-dot" />
              )}
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

        <div className="chat-header-actions">
          <button
            className="icon-btn"
            title="Start voice call"
            onClick={() =>
              alert(
                "Voice call initiated"
              )
            }
          >
            <PhoneIcon />
          </button>

          <button
            className="icon-btn"
            title="Start video call"
            onClick={() =>
              alert(
                "Video call initiated"
              )
            }
          >
            <VideoIcon />
          </button>

          <button
            className="icon-btn"
            title="Search in chat"
          >
            <SearchIcon />
          </button>

          <button
            className="icon-btn"
            title="More"
            onClick={() => {
              if (isGroup) {
                setShowDetails(true);
              }
            }}
          >
            <MoreIcon />
          </button>
        </div>
      </div>

      {showDetails && (
        <GroupDetails
          conversationId={
            conversation.id
          }
          onClose={() =>
            setShowDetails(false)
          }
        />
      )}

      {/* =================================================
          MESSAGE AREA
      ================================================= */}

      <div className="messages-container">
        {typingUserIds.length > 0 && (
          <div
            style={{
              padding:
                "6px 24px",
              color:
                "var(--text-muted)",
              fontSize: 13,
            }}
          >
            {conversation.members
              .filter((m) =>
                typingUserIds.includes(
                  m.user.id
                )
              )
              .map(
                (m) =>
                  m.user.display_name
              )
              .join(", ")}{" "}
            is typing...
          </div>
        )}

        {/* =================================================
            ENCRYPTION BANNER
        ================================================= */}

        {!isGroup && (
          <div className="encryption-banner">
            <LockIcon />

            <span>
              Messages and calls are end-to-end encrypted. No
              one outside of this chat can read or listen to
              them.
            </span>
          </div>
        )}

        {/* =================================================
            GROUP INTRO CARD
        ================================================= */}

                  {isGroup && (
  <div className="group-intro">
    <div className="group-intro-card">

      <div className="group-intro-avatar">
        <GroupIcon />
      </div>

      <strong className="group-intro-title">
        {title}
      </strong>

      <div className="group-intro-members">
        <GroupIcon />

        <span>
          {conversation.members.length <= 1
            ? "No other group members yet"
            : `${conversation.members.length} members`}
        </span>
      </div>

    </div>

    <div className="group-created-info">

      <div className="group-created-date">
        Today
      </div>

      <div className="group-created-event">
        <GroupIcon />
        <span>You created the group.</span>
      </div>

    </div>
  </div>
)}
        {/* =================================================
            MESSAGES
        ================================================= */}

        {isLoadingMessages &&
        messages.length === 0 ? (
          <div
            style={{
              textAlign:
                "center",
              color:
                "var(--text-muted)",
              padding: 20,
            }}
          >
            Loading message
            history…
          </div>
        ) : (
          messages.map(
            (msg, index) => {
              const isOutgoing =
                msg.sender.id ===
                currentUser.id;

              const prevMsg =
                messages[index - 1];

              const showDateHeader =
                !prevMsg ||
                new Date(
                  prevMsg.created_at
                ).toDateString() !==
                  new Date(
                    msg.created_at
                  ).toDateString();

              return (
                <div
                  key={msg.id}
                  style={{
                    display:
                      "flex",
                    flexDirection:
                      "column",
                  }}
                >
                  {showDateHeader && (
                    <div className="date-divider">
                      <span>
                        {formatDateHeader(
                          msg.created_at
                        )}
                      </span>
                    </div>
                  )}

                  <div
                    className={`message-row ${
                      isOutgoing
                        ? "outgoing"
                        : "incoming"
                    }`}
                  >
                    {isGroup &&
                      !isOutgoing && (
                        <span className="sender-name">
                          {
                            msg.sender
                              .display_name
                          }
                        </span>
                      )}

                    <div className="message-bubble">
                      {msg.content_type &&
                      msg.content_type !==
                        "text" ? (
                        (() => {
                          try {
                            const payload =
                              JSON.parse(
                                msg.content
                              );

                            return (
                              <div
                                style={{
                                  display:
                                    "flex",
                                  flexDirection:
                                    "column",
                                  gap: 8,
                                }}
                              >
                                {payload.attachments?.map(
                                  (
                                    a: any,
                                    idx: number
                                  ) => (
                                    <div
                                      key={
                                        idx
                                      }
                                      style={{
                                        borderRadius:
                                          10,
                                        overflow:
                                          "hidden",
                                        border:
                                          "1px solid var(--border-color)",
                                        background:
                                          "var(--bg-card)",
                                        padding:
                                          8,
                                      }}
                                    >
                                      {a.content_type?.startsWith(
                                        "image/"
                                      ) ? (
                                        <img
                                          src={getAttachmentUrl(
                                            a.url
                                          )}
                                          alt={
                                            a.filename
                                          }
                                          style={{
                                            maxWidth:
                                              320,
                                            maxHeight:
                                              240,
                                            display:
                                              "block",
                                            borderRadius:
                                              8,
                                            objectFit:
                                              "contain",
                                          }}
                                          onError={(
                                            e
                                          ) => {
                                            console.error(
                                              "Failed to load attachment:",
                                              getAttachmentUrl(
                                                a.url
                                              )
                                            );

                                            e.currentTarget.style.display =
                                              "none";
                                          }}
                                        />
                                      ) : a.content_type?.startsWith(
                                          "video/"
                                        ) ? (
                                        <video
                                          controls
                                          src={getAttachmentUrl(
                                            a.url
                                          )}
                                          style={{
                                            maxWidth:
                                              320,
                                            maxHeight:
                                              240,
                                            display:
                                              "block",
                                            borderRadius:
                                              8,
                                          }}
                                        />
                                      ) : (
                                        <a
                                          href={getAttachmentUrl(
                                            a.url
                                          )}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{
                                            display:
                                              "flex",
                                            justifyContent:
                                              "space-between",
                                            alignItems:
                                              "center",
                                            gap: 12,
                                            textDecoration:
                                              "none",
                                          }}
                                        >
                                          <span>
                                            📄{" "}
                                            {
                                              a.filename
                                            }
                                          </span>

                                          <span
                                            style={{
                                              fontSize: 12,
                                              color:
                                                "var(--text-muted)",
                                            }}
                                          >
                                            {Math.round(
                                              a.size /
                                                1024
                                            )}{" "}
                                            KB
                                          </span>
                                        </a>
                                      )}
                                    </div>
                                  )
                                )}

                                {payload.text ? (
                                  <div>
                                    {
                                      payload.text
                                    }
                                  </div>
                                ) : null}
                              </div>
                            );
                          } catch {
                            return (
                              <span>
                                {msg.content}
                              </span>
                            );
                          }
                        })()
                      ) : (
                        <span>
                          {msg.content}
                        </span>
                      )}

                      <span className="message-footer">
                        <span>
                          {formatTime(
                            msg.created_at
                          )}
                        </span>

                        {isOutgoing && (
                          <span
                            className="status-icon"
                            title="Sent / Delivered"
                          >
                            ✓✓
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
          )
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* =================================================
          COMPOSER
      ================================================= */}

      <div className="composer-container">
        <form
          className="composer-box"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          {/* Attachment */}
          <button
            type="button"
            className="icon-btn"
            title="Add attachment"
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            <PaperclipIcon />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            style={{
              display: "none",
            }}
            multiple
            onChange={(e) => {
              const files =
                e.target.files;

              if (!files) return;

              setAttachments(
                (prev) => [
                  ...prev,
                  ...Array.from(
                    files
                  ),
                ]
              );

              e.currentTarget.value =
                "";
            }}
          />

          {/* Message input */}
          <textarea
            className="composer-input"
            placeholder="Signal message"
            value={text}
            onChange={(e) =>
              handleChangeText(
                e.target.value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            rows={1}
          />

          {/* Emoji */}
          <div
            style={{
              position:
                "relative",
            }}
          >
            <button
              type="button"
              className="icon-btn"
              title="Emoji"
              onClick={() =>
                setShowEmoji(
                  (s) => !s
                )
              }
            >
              <SmileIcon />
            </button>

            {showEmoji && (
              <div
                style={{
                  position:
                    "absolute",
                  bottom: 48,
                  right: 0,
                  zIndex: 40,
                }}
              >
                <EmojiPickerInline
                  onSelect={(
                    emoji
                  ) => {
                    setText(
                      (t) =>
                        t + emoji
                    );
                    setShowEmoji(
                      false
                    );
                  }}
                />
              </div>
            )}
          </div>

          {/* Send */}
          <button
            type="submit"
            className="send-btn"
            disabled={
              (!text.trim() &&
                attachments.length ===
                  0) ||
              isSending
            }
            title="Send Message"
          >
            <SendIcon />
          </button>
        </form>

        {/* =================================================
            ATTACHMENT PREVIEWS
        ================================================= */}

        {attachments.length >
          0 && (
          <div
            style={{
              display:
                "flex",
              gap: 8,
              padding: 8,
              overflowX:
                "auto",
            }}
          >
            {attachments.map(
              (file, index) => (
                <div
                  key={index}
                  className="upload-preview"
                >
                  {file.type.startsWith(
                    "image/"
                  ) ? (
                    <img
                      src={URL.createObjectURL(
                        file
                      )}
                      style={{
                        width: 64,
                        height: 48,
                        objectFit:
                          "cover",
                        borderRadius:
                          6,
                      }}
                      alt={file.name}
                    />
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 48,
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        fontSize: 24,
                      }}
                    >
                      📄
                    </div>
                  )}

                  <div
                    style={{
                      maxWidth: 200,
                    }}
                  >
                    <div
                      style={{
                        fontWeight:
                          700,
                        whiteSpace:
                          "nowrap",
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                      }}
                    >
                      {file.name}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      {Math.round(
                        file.size /
                          1024
                      )}{" "}
                      KB
                    </div>

                    <div
                      className="upload-progress-bar"
                      style={{
                        marginTop: 6,
                      }}
                    >
                      <div
                        className="upload-progress-inner"
                        style={{
                          width: `${
                            uploadProgress[
                              index
                            ] ?? 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      setAttachments(
                        (prev) =>
                          prev.filter(
                            (
                              _,
                              i
                            ) =>
                              i !==
                              index
                          )
                      )
                    }
                  >
                    ✕
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* =================================================
            TOAST
        ================================================= */}

        {toast && (
          <div
            style={{
              position:
                "fixed",
              right: 20,
              bottom: 20,
              zIndex: 100,
            }}
          >
            <div className="toast">
              {toast}

              <button
                type="button"
                className="icon-btn"
                onClick={() =>
                  setToast(null)
                }
                style={{
                  marginLeft: 8,
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}