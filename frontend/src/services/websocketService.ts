/**
 * WebSocket Service
 * Manages WebSocket connections for real-time chat
 * 
 * Author: Brandon K Mhako (R223931W)
 */

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

// Event types
export type MessageHandler = (message: ChatMessage) => void;
export type ConnectionHandler = () => void;
export type ErrorHandler = (error: Event) => void;
export type TypingHandler = (isTyping: boolean) => void;

export interface ChatMessage {
  id?: string;
  session_id: string;
  content: string;
  is_from_ai: boolean;
  timestamp?: string;
  intent?: string;
  confidence?: number;
  language?: string;
}

export interface WebSocketConfig {
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private sessionId: string | null = null;
  private token: string | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectHandlers: Set<ConnectionHandler> = new Set();
  private disconnectHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private typingHandlers: Set<TypingHandler> = new Set();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private isManualDisconnect: boolean = false;

  /**
   * Configure WebSocket service
   */
  configure(config: WebSocketConfig): void {
    this.maxReconnectAttempts = config.reconnectAttempts ?? 5;
    this.reconnectDelay = config.reconnectDelay ?? 1000;
  }

  /**
   * Connect to WebSocket server
   */
  connect(sessionId: string, token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sessionId = sessionId;
      this.token = token || localStorage.getItem('access_token');
      this.isManualDisconnect = false;

      const wsUrl = `${WS_URL}/ws/chat/${sessionId}${this.token ? `?token=${this.token}` : ''}`;
      
      try {
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('🔌 WebSocket connected:', sessionId);
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.connectHandlers.forEach(handler => handler());
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle different message types
            if (data.type === 'typing') {
              this.typingHandlers.forEach(handler => handler(data.isTyping));
            } else if (data.type === 'message' || data.content) {
              const message: ChatMessage = {
                id: data.id,
                session_id: data.session_id || sessionId,
                content: data.content,
                is_from_ai: data.is_from_ai ?? true,
                timestamp: data.timestamp || new Date().toISOString(),
                intent: data.intent,
                confidence: data.confidence,
                language: data.language,
              };
              this.messageHandlers.forEach(handler => handler(message));
            } else if (data.type === 'pong') {
              // Heartbeat response received
              console.log('💓 Heartbeat pong received');
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.errorHandlers.forEach(handler => handler(error));
          reject(error);
        };

        this.socket.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.stopHeartbeat();
          this.disconnectHandlers.forEach(handler => handler());
          
          // Attempt reconnection if not manual disconnect
          if (!this.isManualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close(1000, 'Manual disconnect');
      this.socket = null;
    }
    
    this.sessionId = null;
    console.log('🔌 WebSocket manually disconnected');
  }

  /**
   * Send a chat message
   */
  sendMessage(content: string, language: string = 'en'): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = {
        type: 'message',
        content: content,
        language: language,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
      };
      
      this.socket.send(JSON.stringify(message));
      console.log('📤 Message sent:', content.substring(0, 50));
    } else {
      console.warn('⚠️ WebSocket not connected. Message not sent.');
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(isTyping: boolean): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'typing',
        isTyping: isTyping,
        session_id: this.sessionId,
      }));
    }
  }

  /**
   * Register message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register connect handler
   */
  onConnect(handler: ConnectionHandler): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  /**
   * Register disconnect handler
   */
  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  /**
   * Register error handler
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Register typing handler
   */
  onTyping(handler: TypingHandler): () => void {
    this.typingHandlers.add(handler);
    return () => this.typingHandlers.delete(handler);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.sessionId && !this.isManualDisconnect) {
        this.connect(this.sessionId, this.token || undefined).catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;

// Also export class for testing
export { WebSocketService };
