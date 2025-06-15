import { supabase } from './supabase';

export interface ChatMessage {
  id: string;
  pin_id: string;
  username: string;
  message: string;
  created_at: string;
}

class ChatService {
  private currentUser: string = '';
  private isAuthenticated: boolean = false;
  private subscription: any = null;

  initialize(username: string, isAuthenticated: boolean = false) {
    this.currentUser = username;
    this.isAuthenticated = isAuthenticated;
    
    // Clean up existing subscription
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async sendDirectMessage(recipientUsername: string, message: string): Promise<boolean> {
    if (!supabase || !this.isAuthenticated) {
      console.error('❌ Supabase not available or user not authenticated');
      return false;
    }

    try {
      // Create a unique pin_id for the conversation between two users
      const conversationId = this.getConversationId(this.currentUser, recipientUsername);
      
      const { error } = await supabase
        .from('chat_messages')
        .insert([
          {
            pin_id: conversationId,
            username: this.currentUser,
            message: message.trim(),
          }
        ]);

      if (error) {
        console.error('❌ Error sending message:', error);
        return false;
      }

      console.log('✅ Message sent successfully');
      return true;
    } catch (err) {
      console.error('💥 Failed to send message:', err);
      return false;
    }
  }

  async getConversationMessages(otherUsername: string): Promise<ChatMessage[]> {
    if (!supabase) {
      console.error('❌ Supabase not available');
      return [];
    }

    try {
      const conversationId = this.getConversationId(this.currentUser, otherUsername);
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('pin_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching messages:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('💥 Failed to fetch messages:', err);
      return [];
    }
  }

  subscribeToConversation(otherUsername: string, onMessage: (message: ChatMessage) => void) {
    if (!supabase) {
      console.error('❌ Supabase not available');
      return null;
    }

    const conversationId = this.getConversationId(this.currentUser, otherUsername);
    
    this.subscription = supabase
      .channel(`chat_${conversationId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `pin_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('📨 New message received:', payload);
          onMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();

    return this.subscription;
  }

  unsubscribeFromConversation() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  private getConversationId(user1: string, user2: string): string {
    // Create a consistent conversation ID by sorting usernames
    const participants = [user1, user2].sort();
    return `dm_${participants[0]}_${participants[1]}`;
  }

  isConnected(): boolean {
    return !!supabase && this.isAuthenticated;
  }

  getCurrentUser(): string {
    return this.currentUser;
  }
}

export const chatService = new ChatService();