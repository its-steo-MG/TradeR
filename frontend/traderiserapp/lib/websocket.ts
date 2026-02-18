//const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://traderiserproapp.onrender.com";

interface ChatMessage {
  type: string;
  message?: string;
  username?: string;
  timestamp?: string;
  messages?: Array<{
    id: string;
    market: string;
    message: string;
    username: string;
    timestamp: string;
  }>;
}

export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private market: string;
  private token: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor(market: string) {
    this.market = market;
    this.token = localStorage.getItem("access_token") || "";
  }

  async connect(
    onMessage: (data: ChatMessage) => void,
    onError?: (error: Event) => void,
    onClose?: () => void
  ) {
    if (!this.token) {
      console.error("No access token found. Please log in.");
      if (onError) onError(new Event("No token"));
      return;
    }

    const wsUrl = `${WS_BASE_URL}/ws/chat/${this.market}/?token=${this.token}`;
    console.log(`Attempting WebSocket connection: ${wsUrl}, Attempt ${this.reconnectAttempts + 1}`);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log(`WebSocket connected for market: ${this.market}`);
      this.reconnectAttempts = 0; // Reset on successful connection
    };

    this.ws.onmessage = (event) => {
      try {
        const data: ChatMessage = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error, "Data:", event.data);
        if (onError) onError(new Event("Parse error"));
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error details:", { event: error, url: wsUrl });
      if (onError) onError(error);
    };

    this.ws.onclose = async (event) => {
      console.log(`WebSocket closed: Code ${event.code}, Reason: ${event.reason || "Unknown"}`);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
        setTimeout(() => this.connect(onMessage, onError, onClose), 2000 * this.reconnectAttempts);
      } else {
        console.error("Max reconnect attempts reached");
        if (onClose) onClose();
      }
    };
  }

  sendMessage(message: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ message }));
    } else {
      console.error("WebSocket is not connected");
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.reconnectAttempts = 0;
    }
  }
}

export function useChatWebSocket(market: string) {
  const connectChat = (
    onMessage: (data: ChatMessage) => void,
    onError?: (error: Event) => void,
    onClose?: () => void
  ) => {
    const chatWs = new ChatWebSocket(market);
    chatWs.connect(onMessage, onError, onClose);
    return chatWs;
  };

  return { connectChat };
}