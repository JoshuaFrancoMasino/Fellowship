import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
}

export interface UserTyping {
  from: string;
  typing: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private currentUser: string = '';
  private isAuthenticated: boolean = false;

  connect(username: string, isAuthenticated: boolean = false) {
    if (this.socket?.connected) {
      this.disconnect();
    }

    this.currentUser = username;
    this.isAuthenticated = isAuthenticated;

    // Use environment variable for chat server URL, fallback to localhost for development
    const chatServerUrl = import.meta.env.VITE_CHAT_SERVER_URL || 'http://localhost:3001';

    // Connect to the server
    this.socket = io(chatServerUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to chat server');
      this.socket?.emit('user_join', {
        username: this.currentUser,
        isAuthenticated: this.isAuthenticated
      });
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from chat server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendPrivateMessage(to: string, message: string) {
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected');
      return false;
    }

    this.socket.emit('private_message', {
      from: this.currentUser,
      to,
      message,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  startTyping(to: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', {
        from: this.currentUser,
        to
      });
    }
  }

  stopTyping(to: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', {
        from: this.currentUser,
        to
      });
    }
  }

  onPrivateMessage(callback: (message: ChatMessage) => void) {
    this.socket?.on('private_message', callback);
  }

  onMessageSent(callback: (data: any) => void) {
    this.socket?.on('message_sent', callback);
  }

  onMessageError(callback: (error: any) => void) {
    this.socket?.on('message_error', callback);
  }

  onUserTyping(callback: (data: UserTyping) => void) {
    this.socket?.on('user_typing', callback);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getCurrentUser(): string {
    return this.currentUser;
  }
}

export const socketService = new SocketService();