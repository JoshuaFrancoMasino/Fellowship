import React from 'react';
import { User, MapPin, MessageSquare, LogIn, LogOut, ShoppingBag, BookOpen, Bell } from 'lucide-react';

interface FloatingControlsProps {
  onOpenUserProfile: () => void;
  onOpenExploreModal: () => void;
  onOpenChatWindow: () => void;
  onOpenMarketplaceModal: () => void;
  onOpenBlogModal: () => void;
  onOpenWelcomeModal: () => void;
  onAuthButtonClick: () => void;
  onOpenNotificationsModal: () => void;
  totalPins: number;
  currentUser: string;
  isAuthenticated: boolean;
  unreadNotificationCount: number;
  unreadChatNotificationCount: number;
}

const FloatingControls: React.FC<FloatingControlsProps> = ({
  onOpenUserProfile,
  onOpenExploreModal,
  onOpenChatWindow,
  onOpenWelcomeModal,
  onOpenMarketplaceModal,
  onOpenBlogModal,
  onAuthButtonClick,
  onOpenNotificationsModal,
  totalPins,
  currentUser,
  isAuthenticated,
  unreadNotificationCount,
  unreadChatNotificationCount,
}) => {
  return (
    <>
      {/* Left Side Controls */}
      <div className="fixed bottom-4 left-4 z-40 space-y-3 pointer-events-none">
        {/* Auth Button - Sign In/Sign Out */}
        <button
          onClick={onAuthButtonClick}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-all duration-200 pointer-events-auto ${
            isAuthenticated 
              ? 'glass-blue hover:bg-red-200/30' 
              : 'glass-blue hover:bg-green-200/30'
          }`}
          title={isAuthenticated ? 'Sign out' : 'Sign in'}
        >
          {isAuthenticated ? (
            <LogOut className="w-6 h-6 text-red-600 icon-shadow-white-sm" />
          ) : (
            <LogIn className="w-6 h-6 text-green-600 icon-shadow-white-sm" />
          )}
        </button>

        {/* User Profile Button */}
        <button
          onClick={onOpenUserProfile}
          className="w-14 h-14 glass-blue rounded-full shadow-xl flex items-center justify-center hover:bg-blue-200/30 hover:scale-105 transition-all duration-200 pointer-events-auto"
          title="View your profile & settings"
        >
          <User className="w-6 h-6 text-blue-700 icon-shadow-white-sm" />
        </button>

        {/* Blog Button */}
        <button
          onClick={onOpenBlogModal}
          className="w-14 h-14 glass-blue rounded-full shadow-xl flex items-center justify-center hover:bg-purple-200/30 hover:scale-105 transition-all duration-200 pointer-events-auto"
          title="Read and write blog posts"
        >
          <BookOpen className="w-6 h-6 text-purple-700 icon-shadow-white-sm" />
        </button>

        {/* Marketplace Button */}
        <button
          onClick={onOpenMarketplaceModal}
          className="w-14 h-14 glass-blue rounded-full shadow-xl flex items-center justify-center hover:bg-green-200/30 hover:scale-105 transition-all duration-200 pointer-events-auto"
          title="Browse marketplace"
        >
          <ShoppingBag className="w-6 h-6 text-green-700 icon-shadow-white-sm" />
        </button>

        {/* Chat Button */}
        <button
          onClick={onOpenChatWindow}
          className="w-14 h-14 glass-blue rounded-full shadow-xl flex items-center justify-center hover:bg-blue-200/30 hover:scale-105 transition-all duration-200 pointer-events-auto relative"
          title="Open chat"
        >
          <MessageSquare className="w-6 h-6 text-blue-700 icon-shadow-white-sm" />
          {unreadChatNotificationCount > 0 && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
              <span className="text-xs text-white font-bold">
                {unreadChatNotificationCount > 9 ? '9+' : unreadChatNotificationCount}
              </span>
            </div>
          )}
        </button>

        {/* Stats Panel - Now Clickable for Explore */}
        <button
          onClick={onOpenExploreModal}
          className="w-14 h-14 glass-blue rounded-full shadow-xl flex flex-col items-center justify-center hover:bg-blue-200/30 hover:scale-105 transition-all duration-200 pointer-events-auto"
          title="Explore all pins"
        >
          <MapPin className="w-4 h-4 text-orange-500 mb-1 icon-shadow-white-sm" />
          <div className="text-xs font-bold text-blue-800 text-shadow-white-sm">{totalPins}</div>
        </button>

        {/* Help Text */}
        <button
          onClick={onOpenWelcomeModal}
          className="glass-blue rounded-2xl shadow-xl p-3 text-center max-w-[200px] pointer-events-auto hover:bg-blue-200/30 hover:scale-105 transition-all duration-200 group"
        >
          <div className="flex items-center justify-center space-x-1 mb-1">
            <MapPin className="w-4 h-4 text-blue-800 icon-shadow-white-sm group-hover:text-blue-700 transition-colors" />
          </div>
          <div className="text-xs font-medium text-blue-800 text-shadow-white-sm group-hover:text-blue-700 transition-colors">
            Tap anywhere on the map to create a pin!
          </div>
        </button>
      </div>

      {/* Right Side Controls */}
      <div className="fixed top-[220px] right-4 z-40 space-y-3 pointer-events-none">
        {/* Notifications Button - Only for authenticated users, positioned below map controls */}
        {isAuthenticated && (
          <button
            onClick={onOpenNotificationsModal}
            className="w-14 h-14 glass-blue rounded-full shadow-xl flex items-center justify-center hover:bg-yellow-200/30 hover:scale-105 transition-all duration-200 pointer-events-auto relative"
            title="View notifications"
          >
            <Bell className="w-6 h-6 text-yellow-600 icon-shadow-white-sm" />
            {unreadNotificationCount > 0 && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-xs text-white font-bold">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              </div>
            )}
          </button>
        )}
      </div>
    </>
  );
};

export default FloatingControls;