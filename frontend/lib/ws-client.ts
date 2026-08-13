type EventHandler = (event: any) => void;

let socket: WebSocket | null = null;
let tokenValue: string | null = null;
const subscribers = new Set<EventHandler>();
let reconnectTimer: number | null = null;

function notifySubscribers(event: any) {
  for (const s of Array.from(subscribers)) {
    try {
      s(event);
    } catch (e) {
      // swallow
    }
  }
}

function buildWsUrl() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "https://securemessagingplatform.onrender.com";
  // convert http://host:port to ws://host:port
  return api.replace(/^http/, "ws") + "/ws";
}

export function connect(token: string) {
  tokenValue = token;
  if (socket) return;
  const url = buildWsUrl();
  socket = new WebSocket(url);

  socket.addEventListener("open", () => {
    // send auth handshake
    socket?.send(JSON.stringify({ type: "auth", data: { token } }));
  });

  socket.addEventListener("message", (ev) => {
    try {
      const payload = JSON.parse(ev.data);
      notifySubscribers(payload);
    } catch (e) {
      // ignore
    }
  });

  socket.addEventListener("close", () => {
    socket = null;
    // attempt reconnect
    if (tokenValue) {
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => connect(tokenValue as string), 1500);
    }
  });

  socket.addEventListener("error", () => {
    // let close handler manage reconnection
  });
}

export function disconnect() {
  tokenValue = null;
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
}

export function sendEvent(event: any) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  try {
    socket.send(JSON.stringify(event));
  } catch (e) {
    // ignore
  }
}

export function subscribe(handler: EventHandler) {
  subscribers.add(handler);
  return () => {
    subscribers.delete(handler);
  };
}

export function isConnected() {
  return !!socket && socket.readyState === WebSocket.OPEN;
}
