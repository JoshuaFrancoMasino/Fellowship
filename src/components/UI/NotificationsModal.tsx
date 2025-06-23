import React, { useState, useEffect, useRef } from 'react';
import { X, Bell, BellOff, Check, CheckCheck, Trash2, User, Clock, MapPin, BookOpen, ShoppingBag, MessageCircle } from 'lucide-react';
import { 
  Notification, 
  getNotificationsForUser, 
  getUnreadNotificationCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  supabase,
  getComment,
  getBlogPostComment
} from '../../lib/supabase';
import { useNotifications } from './NotificationSystem';
import { logError } from '../../lib/utils/logger';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  isAuthenticated: boolean;
  onOpenUserProfile: (username: string) => void;
  onSelectPin: (pinId: string) => void;
  onSelectBlogPost: (blogPostId: string) => void;
  onSelectMarketplaceItem: (itemId: string) => void;
  onSelectChatMessage: (senderUsername: string) => void;
  onNotificationAction: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAuthenticated,
  onOpenUserProfile,
  onSelectPin,
  onSelectBlogPost,
  onSelectMarketplaceItem,
  onSelectChatMessage,
  onNotificationAction,
}) => {
  const { showError, showSuccess } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const channelRef = useRef<any>(null);
  const deletedNotificationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      // Wrap async calls in try-catch to prevent crashes
      const initializeModal = async () => {
        try {
          await fetchNotifications();
          await fetchUnreadCount();
          setupRealtimeSubscription();
        } catch (error) {
          console.error('Error initializing notifications modal:', error);
          showError('Connection Error', 'Unable to load notifications. Please check your connection.');
        }
      };
      
      initializeModal();
    }

    return () => {
      // Cleanup channel on unmount or when modal closes
      if (channelRef.current) {
        try {
          supabase?.removeChannel(channelRef.current);
          channelRef.current = null;
        } catch (error) {
          console.error('Error cleaning up channel:', error);
        }
      }
    };
  }, [isOpen, isAuthenticated, currentUser]);

  // Separate effect for filter changes to avoid recreating subscription
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      // Wrap in try-catch to prevent crashes
      const loadFilteredNotifications = async () => {
        try {
          await fetchNotifications();
        } catch (error) {
          console.error('Error loading filtered notifications:', error);
          showError('Load Error', 'Unable to filter notifications. Please try again.');
        }
      };
      
      loadFilteredNotifications();
    }
  }, [filter]);

  const setupRealtimeSubscription = () => {
    if (!supabase || !isAuthenticated) return null;

    // Clean up existing channel if any
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.error('Error removing existing channel:', error);
      }
    }

    try {
      // Create a unique channel name to avoid conflicts
      const channelName = `notifications_${currentUser}_${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'notifications',
            filter: `recipient_username=eq.${currentUser}`
          },
          (payload) => {
            // Always refetch data for any change to ensure consistency
            // Only refetch if this isn't a local deletion we just made
            const eventType = payload.eventType;
            const notificationId = payload.new?.id || payload.old?.id;
            
            if (eventType === 'DELETE' && deletedNotificationsRef.current.has(notificationId)) {
              // This was a local deletion, remove from tracking set but don't refetch
              deletedNotificationsRef.current.delete(notificationId);
            } else {
              // This is a real change from elsewhere, refetch data
              fetchNotifications().catch(error => {
                console.error('Error refetching notifications in subscription:', error);
              });
              fetchUnreadCount().catch(error => {
                console.error('Error refetching unread count in subscription:', error);
              });
            }
          }
        );

      channelRef.current = channel;
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Notifications subscription established');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Notifications subscription error');
        }
      });

      return channel;
    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
      return null;
    }
  };

  const fetchNotifications = async () => {
    if (!supabase) {
      console.warn('Supabase client not initialized, skipping notification fetch');
      return;
    }
    
    setLoading(true);
    try {
      const data = await getNotificationsForUser(
        currentUser, 
        filter === 'unread' ? false : undefined
      );
      setNotifications(data);
    } catch (error) {
      logError('Error fetching notifications', error instanceof Error ? error : new Error(String(error)));
      showError('Failed to Load', 'Could not fetch notifications. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!supabase) {
      console.warn('Supabase client not initialized, skipping unread count fetch');
      return;
    }
    
    try {
      const count = await getUnreadNotificationCount(currentUser);
      setUnreadCount(count);
    } catch (error) {
      logError('Error fetching unread count', error instanceof Error ? error : new Error(String(error)));
      // Don't show error to user for unread count failures - it's not critical
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await markNotificationAsRead(notificationId);
      if (success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        fetchUnreadCount();
        onNotificationAction(); // Refresh notification counts
      } else {
        showError('Update Failed', 'Could not mark notification as read. Please check your connection.');
      }
    } catch (error) {
      logError('Error marking notification as read', error instanceof Error ? error : new Error(String(error)));
      showError('Update Failed', 'Could not mark notification as read. Please check your connection.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const success = await markAllNotificationsAsRead(currentUser);
      if (success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        showSuccess('Success', 'All notifications marked as read');
        onNotificationAction(); // Refresh notification counts
      } else {
        showError('Update Failed', 'Could not mark all notifications as read. Please check your connection.');
      }
    } catch (error) {
      logError('Error marking all notifications as read', error instanceof Error ? error : new Error(String(error)));
      showError('Update Failed', 'Could not mark all notifications as read. Please check your connection.');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    // Track this deletion to prevent refetch overriding local state
    deletedNotificationsRef.current.add(notificationId);
    
    // Optimistically remove from UI first
    const previousNotifications = notifications;
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    try {
      const success = await deleteNotification(notificationId);
      if (success) {
        fetchUnreadCount();
        onNotificationAction(); // Refresh notification counts
        showSuccess('Deleted', 'Notification removed');
      } else {
        // Remove from tracking set on failure
        deletedNotificationsRef.current.delete(notificationId);
        // Revert optimistic update
        setNotifications(previousNotifications);
        showError('Delete Failed', 'Could not delete notification. Please check your connection.');
      }
    } catch (error) {
      // Remove from tracking set on error
      deletedNotificationsRef.current.delete(notificationId);
      // Revert optimistic update
      setNotifications(previousNotifications);
      logError('Error deleting notification', error instanceof Error ? error : new Error(String(error)));
      showError('Delete Failed', 'Could not delete notification. Please check your connection.');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate to the relevant entity
    switch (notification.entity_type) {
      case 'pin':
        onSelectPin(notification.entity_id);
        break;
      case 'blog_post':
        onSelectBlogPost(notification.entity_id);
        break;
      case 'marketplace_item':
        onSelectMarketplaceItem(notification.entity_id);
        break;
      case 'chat_message':
        onSelectChatMessage(notification.sender_username);
        break;
      case 'comment':
        // For comment likes, fetch the comment to get the parent pin ID
        try {
          const comment = await getComment(notification.entity_id);
          if (comment) {
            onSelectPin(comment.pin_id);
          } else {
            showError('Navigation Error', 'The original pin could not be found.');
          }
        } catch (error) {
          console.error('Error fetching comment for navigation:', error);
          showError('Navigation Error', 'Failed to navigate to the original pin.');
        }
        break;
      case 'blog_post_comment':
        // For blog post comment likes, fetch the comment to get the parent blog post ID
        try {
          const blogComment = await getBlogPostComment(notification.entity_id);
          if (blogComment) {
            onSelectBlogPost(blogComment.blog_post_id);
          } else {
            showError('Navigation Error', 'The original blog post could not be found.');
          }
        } catch (error) {
          console.error('Error fetching blog post comment for navigation:', error);
          showError('Navigation Error', 'Failed to navigate to the original blog post.');
        }
        break;
    }

    onClose();
  };

  const handleUserClick = (username: string) => {
    onOpenUserProfile(username);
    onClose();
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'pin':
        return <MapPin className="w-4 h-4 text-blue-400" />;
      case 'blog_post':
        return <BookOpen className="w-4 h-4 text-purple-400" />;
      case 'marketplace_item':
        return <ShoppingBag className="w-4 h-4 text-green-400" />;
      case 'chat_message':
        return <MessageCircle className="w-4 h-4 text-blue-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTime = (timestamp: string) => {
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

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || (filter === 'unread' && !n.is_read)
  );

  if (!isOpen) return null;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="glass-header p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <BellOff className="w-5 h-5 text-red-400 icon-shadow-white-sm" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-shadow-white-md">Notifications</h2>
                  <p className="text-red-100 text-sm text-shadow-white-sm">
                    Sign in required
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 icon-shadow-white-sm" />
              </button>
            </div>
          </div>
          <div className="p-6 text-center">
            <p className="text-gray-300 mb-4">
              You need to be signed in to view notifications.
            </p>
            <button
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('openAuth'));
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="glass-header p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 glass-white rounded-full flex items-center justify-center relative">
                <Bell className="w-5 h-5 text-blue-600 icon-shadow-white-sm" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-shadow-white-md">Notifications</h2>
                <p className="text-blue-100 text-sm text-shadow-white-sm">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-5 h-5 icon-shadow-white-sm" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 icon-shadow-white-sm" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="border-b border-gray-700 px-6 py-3">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-sm">
                {filter === 'unread' 
                  ? 'All caught up! Check back later for updates.' 
                  : 'You\'ll see notifications here when others interact with your content.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-800 transition-colors cursor-pointer group ${
                    !notification.is_read ? 'bg-blue-900/20' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Entity Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getEntityIcon(notification.entity_type)}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-200 leading-relaxed">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUserClick(notification.sender_username);
                              }}
                              className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              {notification.sender_username}
                            </button>{' '}
                            {notification.message.replace(notification.sender_username, '').trim()}
                          </p>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-xs text-gray-400 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(notification.created_at)}</span>
                            </span>
                            {!notification.is_read && (
                              <span className="text-xs text-blue-400 font-medium">NEW</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              className="p-1 hover:bg-blue-600 rounded-full transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3 text-blue-400 hover:text-white" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notification.id);
                            }}
                            className="p-1 hover:bg-red-600 rounded-full transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3 h-3 text-red-400 hover:text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredNotifications.length > 0 && (
          <div className="border-t border-gray-700 p-4 bg-gray-900">
            <div className="text-center text-sm text-gray-400">
              Showing {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsModal;