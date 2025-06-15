import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Wifi, WifiOff, User, AlertCircle, UserPlus, Lock } from 'lucide-react';
import { socketService, ChatMessage, UserTyping } from '../../lib/socket';

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
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [messageError, setMessageError] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Set initial recipient when modal opens
  useEffect(() => {
    if (isOpen && initialRecipientUsername) {
      setRecipientUsername(initialRecipientUsername);
    }
  }, [isOpen, initialRecipientUsername]);

  useEffect(() => {
    // Only connect if user is authenticated
    if (isOpen && isAuthenticated && !socketService.isConnected()) {
      connectToChat();
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isOpen, currentUser, isAuthenticated]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectToChat = () => {
    const socket = socketService.connect(currentUser, isAuthenticated);
    
    if (socket) {
      socket.on('connect', () => {
        setIsConnected(true);
        setMessageError('');
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socketService.onPrivateMessage((message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
      });

      socketService.onMessageSent((data) => {
        // Add sent message to local state
        const sentMessage: ChatMessage = {
          id: `sent_${Date.now()}`,
          from: currentUser,
          to: data.to,
          message: data.message,
          timestamp: data.timestamp
        };
        setMessages(prev => [...prev, sentMessage]);
        setMessageError('');
      });

      socketService.onMessageError((error) => {
        console.error('Message error:', error);
        setMessageError(`Failed to send message: ${error.error}`);
        setTimeout(() => setMessageError(''), 5000);
      });

      socketService.onUserTyping((data: UserTyping) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.typing) {
            newSet.add(data.from);
          } else {
            newSet.delete(data.from);
          }
          return newSet;
        });

        // Clear typing indicator after 3 seconds
        if (data.typing) {
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.from);
              return newSet;
            });
          }, 3000);
        }
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !recipientUsername.trim() || !isConnected) return;

    const success = socketService.sendPrivateMessage(recipientUsername.trim(), newMessage.trim());
    
    if (success) {
      setNewMessage('');
      stopTyping();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (recipientUsername && e.target.value.trim() && !isTyping) {
      startTyping();
    } else if (!e.target.value.trim() && isTyping) {
      stopTyping();
    }
  };

  const startTyping = () => {
    if (!isTyping && recipientUsername) {
      setIsTyping(true);
      socketService.startTyping(recipientUsername);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 2000);
    }
  };

  const stopTyping = () => {
    if (isTyping && recipientUsername) {
      setIsTyping(false);
      socketService.stopTyping(recipientUsername);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const getConversationMessages = () => {
    if (!recipientUsername) return [];
    
    return messages.filter(msg => 
      (msg.from === currentUser && msg.to === recipientUsername) ||
      (msg.from === recipientUsername && msg.to === currentUser)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
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
                Sign up in order to access direct messaging service
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-gray-300 bg-gray-800/50 rounded-lg p-3">
                <MessageSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Send private messages to other users</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-300 bg-gray-800/50 rounded-lg p-3">
                <User className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Real-time chat with typing indicators</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-300 bg-gray-800/50 rounded-lg p-3">
                <Wifi className="w-4 h-4 text-purple-400 flex-shrink-0" />
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
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] overflow-hidden flex flex-col">
        
        {/* Chat Header */}
        <div className="glass-header p-4 text-white border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 icon-shadow-white-sm" />
              <h3 className="font-semibold text-shadow-white-sm">Direct Messages</h3>
              {recipientUsername && (
                <span className="text-blue-200 text-sm">
                  → {recipientUsername}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-400 icon-shadow-white-sm" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400 icon-shadow-white-sm" />
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
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>

        {/* Recipient Input */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <User className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={recipientUsername}
              onChange={(e) => setRecipientUsername(e.target.value)}
              placeholder="Enter username to message..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
            />
          </div>
          {recipientUsername && typingUsers.has(recipientUsername) && (
            <p className="text-xs text-blue-300 mt-2 ml-7 italic">
              {recipientUsername} is typing...
            </p>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {recipientUsername ? (
            <>
              {getConversationMessages().length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No messages with {recipientUsername} yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                getConversationMessages().map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.from === currentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        message.from === currentUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.from === currentUser ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Welcome to Direct Messages</p>
                <p className="text-sm">Enter a username above to start messaging</p>
              </div>
            </div>
          )}
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
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={recipientUsername ? `Message ${recipientUsername}...` : "Enter a username above first..."}
              disabled={!isConnected || !recipientUsername.trim()}
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !recipientUsername.trim() || !isConnected}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          
          {!isConnected && (
            <p className="text-xs text-red-400 mt-2">
              Disconnected from chat server. Trying to reconnect...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;