import { supabase } from './supabase';

export interface ChatMessage {
  id: string;
  pin_id: string;
  username: string;
  message: string;
  media_url?: string;
  created_at: string;
}

export interface Conversation {
  username: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
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

  async getConversations(): Promise<Conversation[]> {
    if (!supabase || !this.isAuthenticated) {
      console.error('❌ Supabase not available or user not authenticated');
      return [];
    }

    try {
      // Get all chat messages involving the current user
      const { data, error } = await supabase
        .from('chat_messages')
        .select('pin_id, username, message, created_at')
        .or(`username.eq.${this.currentUser},pin_id.like.%_${this.currentUser}_%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching conversations:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group messages by conversation and extract other participants
      const conversationMap = new Map<string, Conversation>();

      data.forEach(message => {
        // Extract the other participant from the conversation ID
        const otherUser = this.extractOtherUser(message.pin_id, this.currentUser);
        if (!otherUser || otherUser === this.currentUser) return;

        const existingConversation = conversationMap.get(otherUser);
        
        // If this is the first message for this conversation, or a more recent message
        if (!existingConversation || new Date(message.created_at) > new Date(existingConversation.lastMessageTime)) {
          conversationMap.set(otherUser, {
            username: otherUser,
            lastMessage: message.message,
            lastMessageTime: message.created_at,
            unreadCount: 0 // We'll implement read status later if needed
          });
        }
      });

      // Convert map to array and sort by last message time
      return Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    } catch (err) {
      console.error('💥 Failed to fetch conversations:', err);
      return [];
    }
  }

  async sendDirectMessage(recipientUsername: string, message: string): Promise<boolean> {
  }
  async sendDirectMessage(recipientUsername: string, message: string, mediaUrl?: string): Promise<boolean> {
  }
  async sendDirectMessage(
    recipientUsername: string, 
    message: string, 
    mediaUrl?: string,
    entityType?: 'marketplace_item',
    entityId?: string
  ): Promise<boolean> {
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
            media_url: mediaUrl || null,
          }
        ]);

      if (error) {
        console.error('❌ Error sending message:', error);
        return false;
      }

      // Create notification for marketplace item inquiry if applicable
      if (entityType === 'marketplace_item' && entityId) {
        await createNotification(
          recipientUsername,
          this.currentUser,
          'message',
          'marketplace_item',
          entityId,
          `${this.currentUser} sent you a message about your marketplace listing`
        );
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

  async deleteConversation(otherUsername: string): Promise<boolean> {
    if (!supabase || !this.isAuthenticated) {
      console.error('❌ Supabase not available or user not authenticated');
      return false;
    }

    try {
      const conversationId = this.getConversationId(this.currentUser, otherUsername);
      
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('pin_id', conversationId);

      if (error) {
        console.error('❌ Error deleting conversation:', error);
        return false;
      }

      console.log('✅ Conversation deleted successfully');
      return true;
    } catch (err) {
      console.error('💥 Failed to delete conversation:', err);
      return false;
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

  private extractOtherUser(conversationId: string, currentUser: string): string | null {
    // Extract usernames from conversation ID format: "dm_user1_user2"
    if (!conversationId.startsWith('dm_')) return null;
    
    const parts = conversationId.substring(3).split('_');
    if (parts.length < 2) return null;
    
    // Find the user that isn't the current user
    const user1 = parts[0];
    const user2 = parts.slice(1).join('_'); // Handle usernames with underscores
    
    if (user1 === currentUser) {
      return user2;
    } else if (user2 === currentUser) {
      return user1;
    }
    
    // If neither matches exactly, try to find the current user in the conversation ID
    const fullConversationUsers = conversationId.substring(3);
    if (fullConversationUsers.includes(currentUser)) {
      // Extract the other user by removing current user from the string
      const withoutPrefix = conversationId.substring(3);
      const currentUserIndex = withoutPrefix.indexOf(currentUser);
      
      if (currentUserIndex === 0) {
        // Current user is first, other user is after the underscore
        return withoutPrefix.substring(currentUser.length + 1);
      } else {
        // Current user is second, other user is before the underscore
        return withoutPrefix.substring(0, currentUserIndex - 1);
      }
    }
    
    return null;
  }

  isConnected(): boolean {
    return !!supabase && this.isAuthenticated;
  }

  getCurrentUser(): string {
    return this.currentUser;
  }
}

export const chatService = new ChatService();