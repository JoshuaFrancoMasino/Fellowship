import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, User, AlertCircle, UserPlus, Lock, Database, ArrowLeft, Clock, Search } from 'lucide-react';
import { chatService, ChatMessage, Conversation } from '../../lib/chatService';
import { getProfileByUsername } from '../../lib/supabase';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  isAuthenticated: boolean;
  initialRecipientUsername?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAuthenticated,
  initialRecipientUsername = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipientUsername, setRecipientUsername] = useState<string>(initialRecipientUsername);
  const [newChatUsername, setNewChatUsername] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [viewingConversation, setViewingConversation] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messageError, setMessageError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [profilePictureCache, setProfilePictureCache] = useState<{ [key: string]: string | null }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if username is a guest user (7-digit number)
  const isGuestUser = (username: string) => username.match(/^\d{7}$/);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      initializeChat();
      fetchConversations();
    }

    return () => {
      chatService.unsubscribeFromConversation();
    };
  }, [isOpen, currentUser, isAuthenticated]);

  // Handle initial recipient when modal opens
  useEffect(() => {
    if (isOpen && initialRecipientUsername) {
      setRecipientUsername(initialRecipientUsername);
      setViewingConversation(true);
    }
  }, [isOpen, initialRecipientUsername]);

  useEffect(() => {
    if (recipientUsername && isConnected && viewingConversation) {
      loadConversation();
    }
  }, [recipientUsername, isConnected, viewingConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (conversations.length > 0 || (viewingConversation && recipientUsername)) {
      fetchProfilePictures();
    }
  }, [conversations, viewingConversation, recipientUsername]);

  const fetchProfilePictures = async () => {
    const usernames = new Set<string>();

    // Add usernames from conversations
    conversations.forEach(conv => usernames.add(conv.username));

    // Add usernames from current conversation messages
    messages.forEach(msg => usernames.add(msg.username));

    // Add current recipient if viewing a conversation
    if (viewingConversation && recipientUsername) {
      usernames.add(recipientUsername);
    }

    const cache: { [key: string]: string | null } = { ...profilePictureCache };

    // Fetch profile pictures for non-guest users who aren't already cached
    for (const username of usernames) {
      if (!isGuestUser(username) && !(username in cache)) {
        try {
          const profile = await getProfileByUsername(username);
          cache[username] = profile?.profile_picture_url || null;
        } catch (error) {
          console.error(`Error fetching profile picture for ${username}:`, error);
          cache[username] = null;
        }
      } else if (isGuestUser(username) && !(username in cache)) {
        cache[username] = null; // Guest users don't have profile pictures
      }
    }

    setProfilePictureCache(cache);
  };

  const initializeChat = () => {
    chatService.initialize(currentUser, isAuthenticated);
    setIsConnected(chatService.isConnected());
    setMessageError('');
  };

  const fetchConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const conversationList = await chatService.getConversations();
      setConversations(conversationList);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversation = async () => {
    if (!recipientUsername.trim()) return;

    // Unsubscribe from any existing conversation before subscribing to a new one
    chatService.unsubscribeFromConversation();

    setIsLoading(true);
    try {
      // Load existing messages
      const existingMessages = await chatService.getConversationMessages(recipientUsername);
      setMessages(existingMessages);

      // Subscribe to new messages
      chatService.subscribeToConversation(recipientUsername, (newMessage: ChatMessage) => {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(msg => msg.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      });
    } catch (error) {
      console.error('Error loading conversation:', error);
      setMessageError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !recipientUsername.trim() || !isConnected) return;

    setIsLoading(true);
    try {
      const success = await chatService.sendDirectMessage(recipientUsername.trim(), newMessage.trim());
      
      if (success) {
        setNewMessage('');
        setMessageError('');
        // Refresh conversations list to update last message
        await fetchConversations();
        // Message will be added via the real-time subscription
      } else {
        setMessageError('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartNewChat = () => {
    if (!newChatUsername.trim()) return;
    
    setRecipientUsername(newChatUsername.trim());
    setNewChatUsername('');
    setViewingConversation(true);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setRecipientUsername(conversation.username);
    setViewingConversation(true);
  };

  const handleBackToConversations = () => {
    chatService.unsubscribeFromConversation();
    setViewingConversation(false);
    setRecipientUsername('');
    setMessages([]);
    setMessageError('');
    fetchConversations(); // Refresh the conversations list
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.abs(now.getTime() - date.getTime()) / (1000 * 60);
      return `${Math.floor(diffInMinutes)}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {};
    
    messages.forEach(message => {
      const dateKey = new Date(message.created_at).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return Object.entries(groups).map(([date, msgs]) => ({
      date,
      messages: msgs
    }));
  };

  if (!isOpen) return null;

  // Show signup reminder for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          
          {/* Header */}
          <div className="glass-header p-4 text-white border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 icon-shadow-white-sm" />
                <h3 className="font-semibold text-shadow-white-sm">Direct Messages</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4 icon-shadow-white-sm" />
              </button>
            </div>
          </div>

          {/* Signup Reminder Content */}
          <div className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Authentication Required
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Sign up to access direct messaging
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-gray-300 bg-gray-800/50 rounded-lg p-3">
                <MessageSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Send private messages to other users</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-300 bg-gray-800/50 rounded-lg p-3">
                <User className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Email-style messaging system</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-300 bg-gray-800/50 rounded-lg p-3">
                <Database className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>Secure and reliable messaging</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <button
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new CustomEvent('openAuth'));
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Sign Up to Continue</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular chat interface for authenticated users
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] overflow-hidden flex flex-col">
        
        {/* Chat Header */}
        <div className="glass-header p-4 text-white border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {viewingConversation && (
                <button
                  onClick={handleBackToConversations}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors mr-2"
                  title="Back to conversations"
                >
                  <ArrowLeft className="w-4 h-4 icon-shadow-white-sm" />
                </button>
              )}
              <MessageSquare className="w-5 h-5 icon-shadow-white-sm" />
              <div className="flex items-center space-x-2">
                {viewingConversation && recipientUsername && (
                  <>
                    {isGuestUser(recipientUsername) ? (
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                        {profilePictureCache[recipientUsername] ? (
                          <img
                            src={profilePictureCache[recipientUsername]!}
                            alt={`${recipientUsername}'s profile`}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <User className="w-3 h-3 text-white" />
                        )}
                      </div>
                    )}
                  </>
                )}
                <h3 className="font-semibold text-shadow-white-sm">
                  {viewingConversation ? `Chat with ${recipientUsername}` : 'Direct Messages'}
                </h3>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Database className="w-4 h-4 text-green-400 icon-shadow-white-sm" />
              ) : (
                <Database className="w-4 h-4 text-red-400 icon-shadow-white-sm" />
              )}
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4 icon-shadow-white-sm" />
              </button>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="p-3 border-b border-gray-700">
          <div className={`text-xs px-2 py-1 rounded-full text-center ${
            isConnected 
              ? 'bg-green-900/30 text-green-300 border border-green-700' 
              : 'bg-red-900/30 text-red-300 border border-red-700'
          }`}>
            {isConnected ? 'Connected to Supabase' : 'Not Connected'}
          </div>
        </div>

        {viewingConversation ? (
          // Individual Conversation View
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No messages with {recipientUsername} yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                groupMessagesByDate(messages).map(({ date, messages: dayMessages }) => (
                  <div key={date}>
                    {/* Date separator */}
                    <div className="flex items-center justify-center mb-4">
                      <div className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full">
                        {formatDate(dayMessages[0].created_at)}
                      </div>
                    </div>
                    
                    {/* Messages for this date */}
                    <div className="space-y-3">
                      {dayMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex items-start space-x-3 ${message.username === currentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {/* Profile picture for other users' messages */}
                          {message.username !== currentUser && (
                            <div className="flex-shrink-0">
                              {isGuestUser(message.username) ? (
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-white" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                                  {profilePictureCache[message.username] ? (
                                    <img
                                      src={profilePictureCache[message.username]!}
                                      alt={`${message.username}'s profile`}
                                      className="w-full h-full object-cover rounded-full"
                                    />
                                  ) : (
                                    <User className="w-4 h-4 text-white" />
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                              message.username === currentUser
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-200'
                            }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            <p className={`text-xs mt-1 ${
                              message.username === currentUser ? 'text-blue-200' : 'text-gray-400'
                            }`}>
                              {formatTime(message.created_at)}
                            </p>
                          </div>

                          {/* Profile picture for current user's messages */}
                          {message.username === currentUser && (
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Message */}
            {messageError && (
              <div className="px-4 py-2 bg-red-900/30 border-t border-red-700">
                <div className="flex items-center space-x-2 text-red-300">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{messageError}</p>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="border-t border-gray-700 p-4">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Message ${recipientUsername}...`}
                  disabled={!isConnected || isLoading}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400 disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !isConnected || isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {isLoading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          // Conversations List View
          <>
            {/* Start New Chat */}
            <div className="p-4 border-b border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Start New Chat</h4>
              <div className="flex items-center space-x-3">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={newChatUsername}
                  onChange={(e) => setNewChatUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleStartNewChat()}
                  placeholder="Enter username..."
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
                />
                <button
                  onClick={handleStartNewChat}
                  disabled={!newChatUsername.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Start
                </button>
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingConversations ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>Loading conversations...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No conversations yet</p>
                  <p className="text-sm">Start a new chat above to begin messaging</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {conversations.map((conversation) => {
                    const profilePicture = profilePictureCache[conversation.username];

                    return (
                      <button
                        key={conversation.username}
                        onClick={() => handleSelectConversation(conversation)}
                        className="w-full p-4 hover:bg-gray-800 transition-colors text-left flex items-center space-x-3"
                      >
                        {/* Avatar */}
                        {isGuestUser(conversation.username) ? (
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-6 h-6 text-white" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {profilePicture ? (
                              <img
                                src={profilePicture}
                                alt={`${conversation.username}'s profile`}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <User className="w-6 h-6 text-white" />
                            )}
                          </div>
                        )}
                        
                        {/* Conversation Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-gray-200 truncate">
                              {conversation.username}
                            </h4>
                            <div className="flex items-center space-x-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>{formatRelativeTime(conversation.lastMessageTime)}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-400 truncate">
                            {conversation.lastMessage}
                          </p>
                        </div>
                        
                        {/* Unread indicator (if needed) */}
                        {conversation.unreadCount > 0 && (
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold">
                              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Connection Status Footer */}
        {!isConnected && (
          <div className="border-t border-gray-700 p-3 bg-red-900/20">
            <p className="text-xs text-red-400 text-center">
              Not connected to Supabase. Please check your configuration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;