import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, User, AlertCircle, UserPlus, Lock, Database, ArrowLeft, Clock, Search, Trash2, Heart, Smile } from 'lucide-react';
import { chatService, ChatMessage, Conversation } from '../../lib/chatService';
import { getProfileByUsername, getCurrentUserProfile, toggleChatMessageLike, getChatMessageLikeCounts, getUserChatMessageLikes } from '../../lib/supabase';

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
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<string | null>(null);
  const [messageLikeCounts, setMessageLikeCounts] = useState<{ [key: string]: number }>({});
  const [userMessageLikes, setUserMessageLikes] = useState<{ [key: string]: boolean }>({});
  const [togglingLike, setTogglingLike] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Common emojis for quick access
  const commonEmojis = ['😀', '😂', '😍', '🥰', '😊', '😎', '🤗', '🤔', '😮', '😢', '😡', '👍', '👎', '❤️', '🔥', '💯', '🎉', '🙏', '👋', '💪'];

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
  }, [conversations, viewingConversation, recipientUsername, messages, currentUser]);

  useEffect(() => {
    if (messages.length > 0) {
      fetchMessageLikeCounts();
      if (currentUser) {
        fetchUserMessageLikes();
      }
    }
  }, [messages, currentUser]);

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

    // Always add current user to ensure their profile picture is cached
    usernames.add(currentUser);

    const cache: { [key: string]: string | null } = { ...profilePictureCache };

    // Fetch profile pictures for non-guest users who aren't already cached
    for (const username of usernames) {
      if (!isGuestUser(username) && !(username in cache)) {
        try {
          // Use getCurrentUserProfile for current user, getProfileByUsername for others
          const profile = username === currentUser && isAuthenticated
            ? await getCurrentUserProfile()
            : await getProfileByUsername(username);
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

  const fetchMessageLikeCounts = async () => {
    const messageIds = messages.map(msg => msg.id);
    const likeCounts = await getChatMessageLikeCounts(messageIds);
    setMessageLikeCounts(likeCounts);
  };

  const fetchUserMessageLikes = async () => {
    const messageIds = messages.map(msg => msg.id);
    const userLikes = await getUserChatMessageLikes(messageIds, currentUser);
    setUserMessageLikes(userLikes);
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
        setShowEmojiPicker(false); // Close emoji picker after sending
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

  const handleDeleteConversation = async (username: string) => {
    if (!isAuthenticated) {
      alert('You must be signed in to delete conversations');
      return;
    }

    setDeletingConversation(username);

    try {
      const success = await chatService.deleteConversation(username);
      
      if (success) {
        // Refresh conversations list
        await fetchConversations();
        
        // If we're currently viewing the deleted conversation, go back to conversation list
        if (viewingConversation && recipientUsername === username) {
          handleBackToConversations();
        }
        
        alert('Conversation deleted successfully');
      } else {
        alert('Failed to delete conversation. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    } finally {
      setDeletingConversation(null);
      setShowDeleteConfirmation(null);
    }
  };

  const handleDeleteConfirmation = (username: string) => {
    setShowDeleteConfirmation(username);
  };

  const handleToggleMessageLike = async (messageId: string) => {
    if (!currentUser) {
      alert('Please sign in or set a username to like messages');
      return;
    }

    setTogglingLike(messageId);

    try {
      const success = await toggleChatMessageLike(messageId, currentUser);

      if (success) {
        // Optimistically update the UI
        const currentLikeCount = messageLikeCounts[messageId] || 0;
        const userHasLiked = userMessageLikes[messageId] || false;

        if (userHasLiked) {
          // User is removing their like
          setMessageLikeCounts(prev => ({
            ...prev,
            [messageId]: Math.max(0, currentLikeCount - 1)
          }));
          setUserMessageLikes(prev => ({
            ...prev,
            [messageId]: false
          }));
        } else {
          // User is adding a like
          setMessageLikeCounts(prev => ({
            ...prev,
            [messageId]: currentLikeCount + 1
          }));
          setUserMessageLikes(prev => ({
            ...prev,
            [messageId]: true
          }));
        }
      } else {
        alert('Failed to update like status');
      }
    } catch (error) {
      console.error('Error toggling message like:', error);
      alert('Failed to update like status');
    } finally {
      setTogglingLike(null);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
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
    <>
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
                        {dayMessages.map((message) => {
                          const likeCount = messageLikeCounts[message.id] || 0;
                          const userHasLiked = userMessageLikes[message.id] || false;

                          return (
                            <div
                              key={message.id}
                              className={`flex items-start space-x-3 group ${message.username === currentUser ? 'justify-end' : 'justify-start'}`}
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

                              <div className="flex flex-col">
                                <div
                                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative ${
                                    message.username === currentUser
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-700 text-gray-200'
                                  }`}
                                >
                                  <p className="text-sm break-words">{message.message}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className={`text-xs ${
                                      message.username === currentUser ? 'text-blue-200' : 'text-gray-400'
                                    }`}>
                                      {formatTime(message.created_at)}
                                    </p>
                                    
                                    {/* Like button - positioned in bottom right */}
                                    <button
                                      onClick={() => handleToggleMessageLike(message.id)}
                                      disabled={togglingLike === message.id}
                                      className={`ml-2 p-1 rounded-full transition-all duration-200 hover:scale-110 ${
                                        userHasLiked
                                          ? 'text-red-400 hover:text-red-300'
                                          : message.username === currentUser
                                            ? 'text-blue-200 hover:text-red-400'
                                            : 'text-gray-400 hover:text-red-400'
                                      } ${togglingLike === message.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      title={userHasLiked ? 'Unlike message' : 'Like message'}
                                    >
                                      {togglingLike === message.id ? (
                                        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                      ) : (
                                        <Heart
                                          className={`w-3 h-3 ${userHasLiked ? 'fill-current' : ''}`}
                                        />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Like count below message */}
                                {likeCount > 0 && (
                                  <div className={`text-xs text-gray-400 mt-1 flex items-center space-x-1 ${
                                    message.username === currentUser ? 'justify-end' : 'justify-start'
                                  }`}>
                                    <Heart className="w-3 h-3 text-red-400" />
                                    <span>{likeCount}</span>
                                  </div>
                                )}
                              </div>

                              {/* Profile picture for current user's messages */}
                              {message.username === currentUser && (
                                <div className="flex-shrink-0">
                                  {isGuestUser(currentUser) ? (
                                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                                      <User className="w-4 h-4 text-white" />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                                      {profilePictureCache[currentUser] ? (
                                        <img
                                          src={profilePictureCache[currentUser]!}
                                          alt="Your profile"
                                          className="w-full h-full object-cover rounded-full"
                                        />
                                      ) : (
                                        <User className="w-4 h-4 text-white" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
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

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="border-t border-gray-700 p-4 bg-gray-800">
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Quick Emojis</h4>
                    <div className="grid grid-cols-10 gap-2">
                      {commonEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-8 h-8 text-lg hover:bg-gray-700 rounded transition-colors flex items-center justify-center"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    💡 Tip: You can also use your device's emoji keyboard (Windows: Win + .), or type emojis directly!
                  </p>
                </div>
              )}

              {/* Message Input */}
              <div className="border-t border-gray-700 p-4">
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Message ${recipientUsername}... (emojis supported! 😊)`}
                      disabled={!isConnected || isLoading}
                      className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400 disabled:opacity-50"
                    />
                    {/* Emoji picker toggle button */}
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-700 rounded-full transition-colors"
                      title="Open emoji picker"
                    >
                      <Smile className="w-4 h-4 text-gray-400 hover:text-gray-300" />
                    </button>
                  </div>
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
                        <div
                          key={conversation.username}
                          className="flex items-center hover:bg-gray-800 transition-colors group"
                        >
                          <button
                            onClick={() => handleSelectConversation(conversation)}
                            className="flex-1 p-4 text-left flex items-center space-x-3"
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

                          {/* Delete Button */}
                          <div className="pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDeleteConfirmation(conversation.username)}
                              disabled={deletingConversation === conversation.username}
                              className="p-2 hover:bg-red-600 rounded-full transition-colors"
                              title="Delete conversation"
                            >
                              {deletingConversation === conversation.username ? (
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 className="w-4 h-4 text-red-400 hover:text-white" />
                              )}
                            </button>
                          </div>
                        </div>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 mx-4 max-w-sm w-full border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-200 mb-3 text-center">
              Delete Conversation
            </h3>
            <p className="text-gray-400 text-sm mb-6 text-center">
              Are you sure you want to delete your conversation with <strong>{showDeleteConfirmation}</strong>? 
              This action cannot be undone and will permanently remove all messages.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(null)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConversation(showDeleteConfirmation)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWindow;