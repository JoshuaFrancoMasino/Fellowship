import React, { useState, useEffect, useRef } from 'react';
import { User, MapPin, X, Settings, ArrowRight, ChevronDown, Camera, Upload, Edit, Save, MessageCircle, UserPlus, Globe, FileText, BookOpen, ShoppingBag } from 'lucide-react';
import { Pin, getUserPins, getCurrentUserProfile, updateUserProfile, uploadImage, getImageUrl, getProfileByUsername, supabase, BlogPost, MarketplaceItem, getUserBlogPosts, getUserMarketplaceItems } from '../../lib/supabase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  currentUser: string;
  onSelectPin: (pinId: string) => void;
  onSelectBlogPost: (post: BlogPost) => void;
  onSelectMarketplaceItem: (item: MarketplaceItem) => void;
  onUsernameChange: (newUsername: string) => void;
  isCurrentUserAdmin?: boolean;
  onOpenChatWindow: (recipientUsername?: string) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  username,
  currentUser,
  onSelectPin,
  onSelectBlogPost,
  onSelectMarketplaceItem,
  onUsernameChange,
  isCurrentUserAdmin = false,
  onOpenChatWindow,
}) => {
  const [userPins, setUserPins] = useState<Pin[]>([]);
  const [userBlogPosts, setUserBlogPosts] = useState<BlogPost[]>([]);
  const [userMarketplaceItems, setUserMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isPinsExpanded, setIsPinsExpanded] = useState(false);
  const [isBlogPostsExpanded, setIsBlogPostsExpanded] = useState(false);
  const [isMarketplaceItemsExpanded, setIsMarketplaceItemsExpanded] = useState(false);
  const [isUploadingProfilePicture, setIsUploadingProfilePicture] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editAboutMe, setEditAboutMe] = useState('');
  const [editContactInfo, setEditContactInfo] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = username === currentUser;
  const isGuestUser = username.match(/^\d{7}$/);

  useEffect(() => {
    if (isOpen && username) {
      fetchProfileData();
      checkAuthStatus();
    }
  }, [isOpen, username]);

  const checkAuthStatus = async () => {
    if (!supabase) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      
      if (user) {
        const profile = await getCurrentUserProfile();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    }
  };

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // Fetch pins
      const pins = await getUserPins(username);
      setUserPins(pins);

      // Fetch blog posts
      const blogPosts = await getUserBlogPosts(username);
      setUserBlogPosts(blogPosts);

      // Fetch marketplace items
      const marketplaceItems = await getUserMarketplaceItems(username);
      setUserMarketplaceItems(marketplaceItems);

      // Only fetch complete profile data for authenticated users, and skip guest users
      if (!isGuestUser) {
        let profile = null;
        if (isOwnProfile) {
          profile = await getCurrentUserProfile();
        } else {
          profile = await getProfileByUsername(username);
        }
        setUserProfile(profile);
        
        // Initialize edit fields
        if (profile) {
          setEditAboutMe(profile.about_me || '');
          setEditContactInfo(profile.contact_info || '');
        }
      } else if (isGuestUser) {
        // Create a mock profile for guest users to avoid database queries
        const mockProfile = {
          id: null,
          username: username,
          role: 'guest',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          contact_info: null,
          about_me: null,
          profile_picture_url: null,
          banner_url: null
        };
        setUserProfile(mockProfile);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameSubmit = () => {
    if (newUsername.trim() && newUsername.length === 7 && /^\d+$/.test(newUsername)) {
      onUsernameChange(newUsername);
      setIsEditingUsername(false);
      setNewUsername('');
    }
  };

  const handleSignupClick = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('openAuth'));
  };

  const handleProfilePictureClick = () => {
    if (isOwnProfile && isAuthenticated && !isGuestUser && profilePictureInputRef.current) {
      profilePictureInputRef.current.click();
    }
  };

  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isAuthenticated || !userProfile || isGuestUser) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setIsUploadingProfilePicture(true);

    try {
      console.log('📤 Starting profile picture upload...');
      
      // Upload image to profile-pictures bucket
      const path = await uploadImage(file, userProfile.id, 'profile-pictures');
      
      if (!path) {
        throw new Error('Failed to upload image');
      }

      console.log('✅ Image uploaded successfully:', path);

      // Get public URL
      const publicUrl = getImageUrl(path, 'profile-pictures');
      console.log('🔗 Public URL generated:', publicUrl);

      // Update user profile with new picture URL
      const updateSuccess = await updateUserProfile(userProfile.id, {
        profile_picture_url: publicUrl
      });

      if (!updateSuccess) {
        throw new Error('Failed to update profile');
      }

      console.log('✅ Profile updated successfully');

      // Re-fetch profile data to update UI
      await fetchProfileData();
      
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('❌ Error updating profile picture:', error);
      alert('Failed to update profile picture. Please try again.');
    } finally {
      setIsUploadingProfilePicture(false);
      // Reset file input
      if (profilePictureInputRef.current) {
        profilePictureInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!userProfile || isGuestUser) return;

    setSavingProfile(true);

    try {
      const updateSuccess = await updateUserProfile(userProfile.id, {
        about_me: editAboutMe.trim() || null,
        contact_info: editContactInfo.trim() || null,
      });

      if (!updateSuccess) {
        throw new Error('Failed to update profile');
      }

      // Re-fetch profile data to update UI
      await fetchProfileData();
      setIsEditingProfile(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDirectMessage = () => {
    if (!isAuthenticated) {
      alert('Please sign in to send direct messages');
      return;
    }
    
    if (isOwnProfile) {
      alert('You cannot message yourself');
      return;
    }

    onOpenChatWindow(username);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatItemDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper function to detect if a URL is valid
  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Helper function to format contact info for display
  const formatContactInfo = (contactInfo: string) => {
    if (!contactInfo) return null;
    
    // If it looks like a URL, make it clickable
    if (isValidUrl(contactInfo)) {
      return (
        <a
          href={contactInfo}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 transition-colors underline flex items-center space-x-1"
        >
          <Globe className="w-4 h-4" />
          <span>{contactInfo}</span>
        </a>
      );
    }
    
    // Otherwise, just display as text
    return <span className="text-gray-200">{contactInfo}</span>;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Banner Section - Changed from h-8 to h-16 */}
        <div className="relative h-16 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 flex-shrink-0 overflow-hidden">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-1 right-1 p-1 glass-white hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-4 h-4 icon-shadow-white-sm" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto max-h-[calc(90vh-256px)]">
          {/* Profile Header */}
          <div className="px-6 pb-6 pt-6 flex items-center space-x-4">
            {/* Profile Picture */}
            <div className="w-32 h-32 bg-gray-800 rounded-full p-1 shadow-lg flex-shrink-0">
              <button
                onClick={handleProfilePictureClick}
                disabled={!isOwnProfile || !isAuthenticated || isUploadingProfilePicture || isGuestUser}
                className={`
                  w-full h-full rounded-full flex items-center justify-center relative overflow-hidden group
                  ${isOwnProfile && isAuthenticated && !isGuestUser ? 'cursor-pointer hover:bg-blue-600/20 transition-colors' : 'cursor-default'}
                `}
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
                }}
              >
                {/* Profile Picture or Default Icon */}
                {userProfile?.profile_picture_url && !isGuestUser ? (
                  <img
                    src={userProfile.profile_picture_url}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <User className="w-12 h-12 text-white icon-shadow-white-md" />
                )}

                {/* Upload Overlay - Only show for own profile when authenticated and not guest */}
                {isOwnProfile && isAuthenticated && !isGuestUser && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full">
                    {isUploadingProfilePicture ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Camera className="w-8 h-8 text-white" />
                    )}
                  </div>
                )}
              </button>

              {/* Hidden Profile Picture File Input */}
              <input
                ref={profilePictureInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="hidden"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h1 className="text-3xl font-bold text-gray-200">
                      {isAuthenticated && userProfile && !isGuestUser ? userProfile.username : `Guest ${username}`}
                    </h1>
                    {userProfile?.role === 'admin' && (
                      <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    {isAuthenticated && isOwnProfile && !isGuestUser ? 'Your Profile' : 
                     isGuestUser ? 'Guest User' : 'Community Member'}
                  </p>

                  {/* Profile Stats */}
                  <div className="flex space-x-6 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{userPins.length}</div>
                      <div className="text-sm text-gray-400">Pins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{userBlogPosts.length}</div>
                      <div className="text-sm text-gray-400">Posts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{userMarketplaceItems.length}</div>
                      <div className="text-sm text-gray-400">Items</div>
                    </div>
                    {userProfile?.created_at && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-300">
                          {formatDate(userProfile.created_at)}
                        </div>
                        <div className="text-sm text-gray-400">Joined</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  {/* Direct Message Button - Only show for other users when authenticated */}
                  {!isOwnProfile && isAuthenticated && !isGuestUser && (
                    <button
                      onClick={handleDirectMessage}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Message</span>
                    </button>
                  )}

                  {/* Edit Profile Button - Only show for own profile */}
                  {isOwnProfile && isAuthenticated && !isGuestUser && (
                    <button
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>{isEditingProfile ? 'Cancel' : 'Edit Profile'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="px-6 pb-6">
            {/* About Me Section */}
            {(userProfile?.about_me || isEditingProfile) && !isGuestUser && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>About Me</span>
                </h3>
                {isEditingProfile && isOwnProfile ? (
                  <div>
                    <textarea
                      value={editAboutMe}
                      onChange={(e) => setEditAboutMe(e.target.value)}
                      placeholder="Tell others about yourself, your interests, background, or anything you'd like to share..."
                      maxLength={1000}
                      rows={5}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400 resize-none"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      {editAboutMe.length}/1000 characters
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Share your story, hobbies, professional background, or what makes you unique!
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {userProfile?.about_me || 'No description provided yet.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Website/Contact Section */}
            {(userProfile?.contact_info || isEditingProfile) && !isGuestUser && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Website & Contact</span>
                </h3>
                {isEditingProfile && isOwnProfile ? (
                  <div>
                    <input
                      type="text"
                      value={editContactInfo}
                      onChange={(e) => setEditContactInfo(e.target.value)}
                      placeholder="Your website, social media, email, or other contact information"
                      maxLength={500}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      {editContactInfo.length}/500 characters
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Add your website URL, social media profiles, or preferred contact method
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-gray-200">
                      {userProfile?.contact_info ? (
                        formatContactInfo(userProfile.contact_info)
                      ) : (
                        'No contact information provided.'
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Save Profile Button */}
            {isEditingProfile && isOwnProfile && (
              <div className="mb-6">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            )}

            {/* Username Settings - Only for authenticated users viewing their own profile */}
            {isOwnProfile && isAuthenticated && !isGuestUser && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-200 flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </h3>
                  <button
                    onClick={() => setIsEditingUsername(!isEditingUsername)}
                    className="text-orange-500 hover:text-orange-600 transition-colors text-sm font-medium"
                  >
                    {isEditingUsername ? 'Cancel' : 'Change Username'}
                  </button>
                </div>
                
                {isEditingUsername ? (
                  <div className="space-y-3 bg-gray-800 rounded-lg p-4">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter new username"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleUsernameSubmit}
                        disabled={!newUsername.trim()}
                        className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        Update Username
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingUsername(false);
                          setNewUsername('');
                        }}
                        className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">
                      Choose a unique username for your account
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-200 font-mono text-lg">
                      {userProfile?.username || `Guest ${username}`}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Your current username
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Guest Username Display - For guests viewing their own profile */}
            {isOwnProfile && (!isAuthenticated || isGuestUser) && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Username</span>
                </h3>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-200 font-mono text-lg">Guest {username}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Guest usernames cannot be changed. Sign up for an account to customize your username.
                  </p>
                </div>
              </div>
            )}

            {/* Authentication Button for Current User */}
            {isOwnProfile && !isAuthenticated && (
              <div className="mb-6">
                <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700 rounded-lg p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-blue-300 mb-2">
                      Unlock Full Profile Features
                    </h3>
                    <p className="text-blue-200 text-sm">
                      Sign up to add your description, website, profile picture, and connect with the community
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-blue-200">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span>Personal description</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-blue-200">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span>Website & contact info</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-blue-200">
                      <Camera className="w-4 h-4 text-blue-400" />
                      <span>Profile picture</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-blue-200">
                      <MessageCircle className="w-4 h-4 text-blue-400" />
                      <span>Direct messaging</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSignupClick}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Sign Up / Sign In</span>
                  </button>
                </div>
              </div>
            )}

            {/* Content Sections */}
            <div className="space-y-4">
              {/* Pins Section */}
              <div>
                <button
                  onClick={() => setIsPinsExpanded(!isPinsExpanded)}
                  className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors mb-4 group"
                >
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400 group-hover:text-gray-300 transition-colors" />
                    <h3 className="text-lg font-semibold text-gray-200 group-hover:text-gray-100 transition-colors">
                      Pins ({userPins.length})
                    </h3>
                  </div>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-400 group-hover:text-gray-300 transition-all duration-200 ${
                      isPinsExpanded ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                
                {isPinsExpanded && (
                  <div className="animate-fadeInUp">
                    {userPins.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No pins created yet</p>
                        {isOwnProfile && (
                          <p className="text-sm">Tap on the map to create your first pin!</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userPins.map((pin) => (
                          <button
                            key={pin.id}
                            onClick={() => onSelectPin(pin.id)}
                            className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left transition-all duration-200 group border border-gray-700 hover:border-gray-600"
                          >
                            <div className="flex items-start space-x-3">
                              {pin.images && pin.images.length > 0 && (
                                <img
                                  src={pin.images[0]}
                                  alt="Pin preview"
                                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0 group-hover:scale-105 transition-transform duration-200"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-200 line-clamp-2 mb-2 group-hover:text-gray-100 transition-colors">
                                  {pin.description}
                                </p>
                                <p className="text-xs text-gray-400 mb-2">
                                  {formatItemDate(pin.created_at)}
                                </p>
                                <p className="text-xs text-gray-500 mb-3">
                                  {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                                </p>
                                
                                <div className="flex items-center space-x-2 text-blue-400 group-hover:text-blue-300 transition-colors">
                                  <MapPin className="w-4 h-4" />
                                  <span className="text-xs font-medium">View on Map</span>
                                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" />
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Blog Posts Section */}
              <div>
                <button
                  onClick={() => setIsBlogPostsExpanded(!isBlogPostsExpanded)}
                  className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors mb-4 group"
                >
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-gray-300 transition-colors" />
                    <h3 className="text-lg font-semibold text-gray-200 group-hover:text-gray-100 transition-colors">
                      Blog Posts ({userBlogPosts.length})
                    </h3>
                  </div>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-400 group-hover:text-gray-300 transition-all duration-200 ${
                      isBlogPostsExpanded ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                
                {isBlogPostsExpanded && (
                  <div className="animate-fadeInUp">
                    {userBlogPosts.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No blog posts yet</p>
                        {isOwnProfile && (
                          <p className="text-sm">Start writing to share your thoughts!</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userBlogPosts.map((post) => (
                          <button
                            key={post.id}
                            onClick={() => onSelectBlogPost(post)}
                            className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left transition-all duration-200 group border border-gray-700 hover:border-gray-600"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm font-semibold text-gray-200 line-clamp-1 group-hover:text-gray-100 transition-colors">
                                {post.title}
                              </h4>
                              {!post.is_published && (
                                <span className="px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded-full flex-shrink-0">
                                  Draft
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-300 line-clamp-2 mb-3">
                              {post.excerpt || truncateText(post.content)}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-400">
                                {formatItemDate(post.created_at)}
                              </p>
                              <div className="flex items-center space-x-2 text-purple-400 group-hover:text-purple-300 transition-colors">
                                <BookOpen className="w-4 h-4" />
                                <span className="text-xs font-medium">Read Post</span>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Marketplace Items Section */}
              <div>
                <button
                  onClick={() => setIsMarketplaceItemsExpanded(!isMarketplaceItemsExpanded)}
                  className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors mb-4 group"
                >
                  <div className="flex items-center space-x-3">
                    <ShoppingBag className="w-5 h-5 text-gray-400 group-hover:text-gray-300 transition-colors" />
                    <h3 className="text-lg font-semibold text-gray-200 group-hover:text-gray-100 transition-colors">
                      Marketplace Items ({userMarketplaceItems.length})
                    </h3>
                  </div>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-400 group-hover:text-gray-300 transition-all duration-200 ${
                      isMarketplaceItemsExpanded ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                
                {isMarketplaceItemsExpanded && (
                  <div className="animate-fadeInUp">
                    {userMarketplaceItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No items for sale yet</p>
                        {isOwnProfile && (
                          <p className="text-sm">List your first item for sale!</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userMarketplaceItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => onSelectMarketplaceItem(item)}
                            className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left transition-all duration-200 group border border-gray-700 hover:border-gray-600"
                          >
                            <div className="flex items-start space-x-3">
                              {item.images && item.images.length > 0 && (
                                <img
                                  src={item.images[0]}
                                  alt="Item preview"
                                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0 group-hover:scale-105 transition-transform duration-200"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-semibold text-gray-200 line-clamp-1 group-hover:text-gray-100 transition-colors">
                                    {item.title}
                                  </h4>
                                  <span className="text-sm font-bold text-green-400 flex-shrink-0">
                                    {formatPrice(item.price)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300 line-clamp-2 mb-3">
                                  {truncateText(item.description)}
                                </p>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-400">
                                    {formatItemDate(item.created_at)}
                                  </p>
                                  <div className="flex items-center space-x-2 text-green-400 group-hover:text-green-300 transition-colors">
                                    <ShoppingBag className="w-4 h-4" />
                                    <span className="text-xs font-medium">View Item</span>
                                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;