import { ProtectedRoute } from "@/components/auth/protected-route";
import { ChatsView } from "@/components/chats/chats-view";

export default function ChatsPage() { return <ProtectedRoute><ChatsView /></ProtectedRoute>; }
