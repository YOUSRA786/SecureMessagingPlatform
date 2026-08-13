export type User = {
  id: number;
  username: string;
  phone: string | null;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen_at: string | null;
};

export type AuthResponse = { access_token: string; token_type: "bearer"; user: User };

export type ConversationMember = {
  user: User;
  role: "member" | "admin";
  joined_at: string;
  last_read_message_id: number | null;
};

export type Conversation = {
  id: number;
  conversation_type: "direct" | "group";
  title: string | null;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  latest_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  members: ConversationMember[];
};

export type MessageStatus = {
  user: User;
  status: "sent" | "delivered" | "read";
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
};

export type Message = {
  id: number;
  conversation_id: number;
  content: string;
  content_type: string;
  created_at: string;
  edited_at: string | null;
  sender: User;
  statuses: MessageStatus[];
};

export type MessagePageResponse = {
  messages: Message[];
  next_before_message_id: number | null;
};

export type Contact = {
  id: number;
  created_at: string;
  user: User;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://securemessagingplatform.onrender.com/";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof body === "object" && body !== null && "detail" in body ? String((body as { detail?: unknown }).detail) : "Request failed";
    throw new ApiError(response.status, detail);
  }
  return body as T;
}

export const authApi = {
  register: (payload: { username?: string; phone?: string; password: string; otp: string; display_name?: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { identifier: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: (token: string) => request<{ message: string }>("/auth/logout", { method: "POST" }, token),
  me: (token: string) => request<User>("/auth/me", {}, token),
};

export const conversationsApi = {
  list: (token: string) => request<Conversation[]>("/conversations", {}, token),
  get: (token: string, conversationId: number) => request<Conversation>(`/conversations/${conversationId}`, {}, token),
  createDirect: (token: string, userId: number) =>
    request<Conversation>("/conversations/direct", { method: "POST", body: JSON.stringify({ user_id: userId }) }, token),
  createGroup: (token: string, title: string, memberIds: number[]) =>
    request<Conversation>("/conversations/group", { method: "POST", body: JSON.stringify({ title, member_ids: memberIds }) }, token),
  listMembers: (token: string, conversationId: number) =>
    request<ConversationMember[]>(`/conversations/${conversationId}/members`, {}, token),
  addMember: (token: string, conversationId: number, userId: number) =>
    request<ConversationMember>(`/conversations/${conversationId}/members`, { method: "POST", body: JSON.stringify({ user_id: userId }) }, token),
  removeMember: (token: string, conversationId: number, userId: number) =>
    request<void>(`/conversations/${conversationId}/members/${userId}`, { method: "DELETE" }, token),
  updateMemberRole: (token: string, conversationId: number, userId: number, role: "member" | "admin") =>
    request<ConversationMember>(`/conversations/${conversationId}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) }, token),
};

export const messagesApi = {
  list: (token: string, conversationId: number, beforeMessageId?: number, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (beforeMessageId) params.append("before_message_id", String(beforeMessageId));
    return request<MessagePageResponse>(`/conversations/${conversationId}/messages?${params.toString()}`, {}, token);
  },
  send: (token: string, conversationId: number, content: string, contentType = "text") =>
    // Ensure content is a JSON string when sending complex payloads (attachments)
    request<Message>(
      `/conversations/${conversationId}/messages`,
      { method: "POST", body: JSON.stringify({ content: typeof content === "string" ? content : JSON.stringify(content), content_type: contentType }) },
      token
    ),
};

export const usersApi = {
  list: (token: string) => request<User[]>("/users", {}, token),
  search: (token: string, query: string) => request<User[]>(`/users/search?query=${encodeURIComponent(query)}`, {}, token),
};

export const contactsApi = {
  list: (token: string) => request<Contact[]>("/contacts", {}, token),
  add: (token: string, userId: number) =>
    request<Contact>("/contacts", { method: "POST", body: JSON.stringify({ user_id: userId }) }, token),
};
