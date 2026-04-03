import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketMessage {
  type: string;
  message: string;
  timestamp?: string;
}

export function useWebSocket(runId: string | null) {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!runId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/ws/logs/${runId}`
    );

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as WebSocketMessage;
      setMessages((prev) => [...prev, data]);
    };

    wsRef.current = ws;
  }, [runId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { messages, connected };
}
