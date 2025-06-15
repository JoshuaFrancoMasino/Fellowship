import React, { useState, useEffect, useRef } from 'react';
import { User, MapPin, X, Settings, ArrowRight, ChevronDown, Camera, Upload } from 'lucide-react';
import { Pin, getUserPins, getCurrentUserProfile, updateUserProfile, uploadImage, getImageUrl, getProfileByUsername, supabase } from '../../lib/supabase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  currentUser: string;
  onSelectPin: (pinId: string) => void;
  onUsernameChange: (newUsername: string) => void;
  isCurrentUserAdmin?: boolean;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  username,
  currentUser,
  onSelectPin,
  onUsernameChange,
  isCurrentUserAdmin = false,
}) => {
  const [userPins, setUserPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isPinsExpanded, setIsPinsExpanded] = useState(false);
  const [isUploadingProfilePicture, setIsUploadingProfilePicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const pins = await getUserPins(username);
      setUserPins(pins);

      // Fetch complete profile data if authenticated
      if (isAuthenticated) {
        let profile = null;
        if (isOwnProfile) {
          profile = await getCurrentUserProfile();
        } else {
          profile = await getProfileByUsername(username);
        }
        setUserProfile(profile);
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
    if (isOwnProfile && isAuthenticated && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isAuthenticated || !userProfile) return;

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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {loading && (
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Banner Section */}
        <div className="relative h-32 glass-header flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <User className="w-8 h-8 mx-auto mb-2 opacity-70 icon-shadow-white-sm" />
              <p className="text-sm opacity-70 text-shadow-white-sm">
                {isAuthenticated && isOwnProfile ? 'Your Profile' : 'Guest Profile'}
              </p>
            </div>
          </div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 glass-white hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5 icon-shadow-white-sm" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile Header */}
          <div className="relative px-6 pb-6">
            {/* Profile Picture - increased gap from banner */}
            <div className="absolute top-6 left-6">
              <div className="w-24 h-24 bg-gray-800 rounded-full p-1 shadow-lg">
                <button
                  onClick={handleProfilePictureClick}
                  disabled={!isOwnProfile || !isAuthenticated || isUploadingProfilePicture}
                  className={`
                    w-full h-full rounded-full glass-header flex items-center justify-center relative overflow-hidden group
                    ${isOwnProfile && isAuthenticated ? 'cursor-pointer hover:bg-blue-600/20 transition-colors' : 'cursor-default'}
                  `}
                >
                  {/* Profile Picture or Default Icon */}
                  {userProfile?.profile_picture_url ? (
                    <img
                      src={userProfile.profile_picture_url}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <User className="w-8 h-8 text-white icon-shadow-white-md" />
                  )}

                  {/* Upload Overlay - Only show for own profile when authenticated */}
                  {isOwnProfile && isAuthenticated && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full">
                      {isUploadingProfilePicture ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </div>
                  )}
                </button>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              
              {/* Upload hint text for own profile */}
              {isOwnProfile && isAuthenticated && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  Click to change picture
                </p>
              )}
            </div>

            {/* Profile Info - increased top padding to account for larger gap */}
            <div className="pt-32">
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-200">
                  {isAuthenticated && userProfile ? userProfile.username : `Guest ${username}`}
                </h1>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                {isAuthenticated && isOwnProfile ? 'Authenticated user' : 'Guest user'}
              </p>

              {/* Username Settings - Only for authenticated users viewing their own profile */}
              {isOwnProfile && isAuthenticated && (
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
              {isOwnProfile && !isAuthenticated && (
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
                <div className="mb-4">
                  <button
                    onClick={handleSignupClick}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
                  >
                    <User className="w-5 h-5" />
                    <span>Sign Up / Sign In</span>
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Create an account to save your pins and access more features
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="flex space-x-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{userPins.length}</div>
                  <div className="text-sm text-gray-400">Pins</div>
                </div>
              </div>
            </div>
          </div>

          {/* Pins Section */}
          <div className="px-6 pb-6">
            {/* Collapsible Pins Section */}
            <div>
              {/* Clickable Header */}
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
              
              {/* Collapsible Pin List */}
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
                                {new Date(pin.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              <p className="text-xs text-gray-500 mb-3">
                                {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                              </p>
                              
                              {/* View on Map indicator */}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;