import React, { useState, useEffect } from 'react';
import MapComponent from './components/Map/MapContainer';
import PinFormModal from './components/UI/PinFormModal';
import FloatingControls from './components/UI/FloatingControls';
import UserProfileModal from './components/UI/UserProfileModal';
import ExploreModal from './components/UI/ExploreModal';
import MarketplaceModal from './components/UI/MarketplaceModal';
import BlogModal from './components/UI/BlogModal';
import ChatWindow from './components/UI/ChatWindow';
import WelcomeModal from './components/UI/WelcomeModal';
import AuthPage from './components/Auth/AuthPage';
import SignOutConfirmationModal from './components/UI/SignOutConfirmationModal';
import { Pin, supabase, getCurrentUserProfile, BlogPost, MarketplaceItem } from './lib/supabase';
import { NotificationProvider, NotificationSystem } from './components/UI/NotificationSystem';
import { logError } from './lib/utils/logger';
import { getGuestUsername, setGuestUsername } from './lib/storage';
import { LocationData } from './lib/geocoding';

function App() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [currentUser, setCurrentUser] = useState<string>(getGuestUsername());
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isExploreModalOpen, setIsExploreModalOpen] = useState(false);
  const [isMarketplaceModalOpen, setIsMarketplaceModalOpen] = useState(false);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [isChatWindowOpen, setIsChatWindowOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isAuthPageOpen, setIsAuthPageOpen] = useState(false);
  const [showSignOutConfirmation, setShowSignOutConfirmation] = useState(false);
  const [profileToViewUsername, setProfileToViewUsername] = useState('');
  const [chatRecipientUsername, setChatRecipientUsername] = useState('');
  const [pinToOpenOnMap, setPinToOpenOnMap] = useState<string | null>(null);
  const [pinToCreateLocation, setPinToCreateLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pinToEdit, setPinToEdit] = useState<Pin | null>(null);
  const [firstClickLocation, setFirstClickLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);
  const [selectedMarketplaceItem, setSelectedMarketplaceItem] = useState<MarketplaceItem | null>(null);

  useEffect(() => {
    // Check authentication status
    checkAuthStatus();
    
    // Fetch initial pins
    fetchPins();

    // Listen for auth state changes
    if (supabase) {
      console.log('🔄 Setting up auth state change listener...');
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔔 Auth state changed:', {
          event,
          userId: session?.user?.id,
          hasSession: !!session,
          timestamp: new Date().toISOString()
        });
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in, updating state...');
          setIsAuthenticated(true);
          setIsAuthPageOpen(false); // Auto-close auth page on successful sign-in
          
          // Get the user's profile and update current user
          const profile = await getCurrentUserProfile();
          if (profile) {
            console.log('📝 Profile fetched for signed in user:', profile.username);
            setCurrentUser(profile.username);
            setIsAdminUser(profile.role === 'admin');
          } else {
            console.error('❌ Failed to fetch profile for signed in user');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out, resetting state...');
          setIsAuthenticated(false);
          setIsAdminUser(false);
          // Reset to guest username
          const guestUsername = getGuestUsername();
          console.log('🔄 Setting current user to guest:', guestUsername);
          setCurrentUser(guestUsername);
          console.log('✅ Sign out state reset complete');
        } else {
          console.log('ℹ️ Other auth event:', event);
        }
      });

      return () => {
        console.log('🧹 Cleaning up auth state change listener');
        subscription.unsubscribe();
      };
    }
  }, []);

  // Separate useEffect for auth event listener - only set up once
  useEffect(() => {
    const handleOpenAuth = () => {
      setIsAuthPageOpen(true);
    };

    window.addEventListener('openAuth', handleOpenAuth);

    return () => {
      window.removeEventListener('openAuth', handleOpenAuth);
    };
  }, []); // Empty dependency array - only run once on mount

  // Separate useEffect for real-time subscription
  useEffect(() => {
    let subscription: any = null;
    
    if (isConnected) {
      subscription = supabase
        ?.channel('pins')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'pins' },
          () => {
            fetchPins();
          }
        )
        .subscribe();
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [isConnected]);

  const checkAuthStatus = async () => {
    if (!supabase) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      
      if (user) {
        const profile = await getCurrentUserProfile();
        if (profile) {
          setCurrentUser(profile.username);
          setIsAdminUser(profile.role === 'admin');
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      
      // Check if the error is related to invalid refresh token
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Invalid Refresh Token') || errorMessage.includes('refresh_token_not_found')) {
        console.log('🔄 Invalid refresh token detected, clearing session...');
        // Clear the invalid session data
        await supabase.auth.signOut();
      }
      
      setIsAuthenticated(false);
      setIsAdminUser(false);
    }
  };

  const handleOpenUserProfile = (username: string) => {
    setProfileToViewUsername(username);
    setIsUserProfileModalOpen(true);
  };

  const handleSelectPinFromProfile = (pinId: string) => {
    setPinToOpenOnMap(pinId);
    setIsUserProfileModalOpen(false);
  };

  const handleSelectBlogPostFromProfile = (post: BlogPost) => {
    setSelectedBlogPost(post);
    setIsUserProfileModalOpen(false);
    setIsBlogModalOpen(true);
  };

  const handleSelectMarketplaceItemFromProfile = (item: MarketplaceItem) => {
    setSelectedMarketplaceItem(item);
    setIsUserProfileModalOpen(false);
    setIsMarketplaceModalOpen(true);
  };

  const handleOpenExploreModal = () => {
    setIsExploreModalOpen(true);
  };

  const handleOpenMarketplaceModal = (item?: MarketplaceItem) => {
    if (item) {
      setSelectedMarketplaceItem(item);
    }
    setIsMarketplaceModalOpen(true);
  };

  const handleOpenBlogModal = (post?: BlogPost) => {
    if (post) {
      setSelectedBlogPost(post);
    }
    setIsBlogModalOpen(true);
  };

  const handleOpenChatWindow = (recipientUsername?: string) => {
    setChatRecipientUsername(recipientUsername || '');
    setIsChatWindowOpen(true);
  };

  const handleOpenWelcomeModal = () => {
    setIsWelcomeModalOpen(true);
  };

  const handleAuthButtonClick = () => {
    console.log('🔘 Auth button clicked, current state:', { isAuthenticated });
    if (isAuthenticated) {
      // Show sign-out confirmation
      console.log('📋 Showing sign-out confirmation modal');
      setShowSignOutConfirmation(true);
    } else {
      // Open auth page for sign-in
      console.log('🔑 Opening auth page for sign-in');
      setIsAuthPageOpen(true);
    }
  };

  const handleSignOutConfirm = async () => {
    console.log('🚨 handleSignOutConfirm called - starting sign out process');
    console.log('📊 Current state before sign out:', {
      isAuthenticated,
      currentUser,
      isAdminUser,
      supabaseExists: !!supabase
    });

    if (supabase) {
      try {
        console.log('🔄 Calling supabase.auth.signOut()...');
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error('❌ Supabase sign out error:', error);
          alert('Error signing out: ' + error.message);
          return;
        }
        
        console.log('✅ Supabase sign out successful');
        console.log('🔄 Closing sign out confirmation modal');
        setShowSignOutConfirmation(false);
        
        console.log('🔄 Opening auth page');
        setIsAuthPageOpen(true); // Redirect to sign-in page
        
        console.log('✅ handleSignOutConfirm completed successfully');
      } catch (error) {
        console.error('💥 Unexpected error during sign out:', error);
        alert('Unexpected error during sign out: ' + (error as Error).message);
      }
    } else {
      console.error('❌ Supabase client not available for sign out');
      alert('Sign out failed: Supabase client not available');
    }

  const handleSignOutCancel = () => {
    console.log('❌ Sign out cancelled by user');
    setShowSignOutConfirmation(false);
  };

  const fetchPins = async () => {
    if (!supabase) {
      setIsConnected(false);
      setPins([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching pins:', error);
        setIsConnected(false);
      } else {
        setPins(data || []);
        setIsConnected(true);
      }
    } catch (err) {
      console.error('Failed to connect to Supabase:', err);
      setIsConnected(false);
      setPins([]);
    }
  };

  const handleAddPin = (lat: number, lng: number) => {
    console.log('📍 Pin creation initiated:', {
      lat,
      lng,
      isConnected,
      currentUser,
      firstClickLocation
    });
    
    if (!isConnected) {
      console.log('❌ Pin creation blocked: No database connection');
      // Note: This will be handled by individual components using the notification system
      return;
    }

    // Two-click pin placement logic
    if (!firstClickLocation) {
      // First click - store location and show temporary marker
      console.log('🎯 First click - storing location for confirmation');
      setFirstClickLocation({ lat, lng });
    } else {
      // Second click - confirm pin creation with first click location
      console.log('✅ Second click - confirming pin creation at first click location');
      setPinToCreateLocation(firstClickLocation);
      setIsPinModalOpen(true);
      setFirstClickLocation(null); // Reset first click location
    }
  };

  const handleEditPin = (pin: Pin) => {
    setPinToEdit(pin);
    setIsPinModalOpen(true);
  };

  const handlePinFormSubmit = async (
    pinId: string | null,
    description: string,
    images: string[],
    lat: number,
    lng: number,
    pinColor?: string,
    storagePaths?: string[],
    locationData?: LocationData
  ) => {
    if (!isConnected || !supabase) {
      throw new Error('Cannot process pin - database connection unavailable');
    }

    try {
      if (pinId) {
        // Update existing pin
        console.log('📤 Updating pin in Supabase...');
        const { error } = await supabase
          .from('pins')
          .update({
            description,
            images,
            pin_color: pinColor || '#FFFC00',
            storage_paths: storagePaths || [],
            // Update location data
            continent: locationData?.continent || null,
            country: locationData?.country || null,
            state: locationData?.state || null,
            locality: locationData?.locality || null,
          })
          .eq('id', pinId);

        if (error) {
          console.error('❌ Supabase update error:', error);
          throw new Error(error.message);
        } else {
          console.log('✅ Pin updated successfully');
          fetchPins();
        }
      } else {
        // Create new pin
        const { data: { user } } = await supabase.auth.getUser();
        const isUserAuthenticated = !!user;
        
        console.log('📤 Creating new pin in Supabase...');
        const { data, error } = await supabase
          .from('pins')
          .insert([
            {
              username: currentUser,
              lat,
              lng,
              description,
              images,
              pin_color: pinColor || '#FFFC00',
              storage_paths: storagePaths || [],
              is_authenticated: isUserAuthenticated,
              // Add location data
              continent: locationData?.continent || null,
              country: locationData?.country || null,
              state: locationData?.state || null,
              locality: locationData?.locality || null,
            }
          ]);

        if (error) {
          console.error('❌ Supabase insert error:', error);
          throw new Error(error.message);
        } else {
          console.log('✅ Pin created successfully:', data);
          fetchPins();
        }
      }
    } catch (err: any) {
      console.error('💥 Failed to process pin:', err);
      throw err; // Re-throw the error so the modal can catch it
    }
  };

  const handleDeletePin = async (pinId: string) => {
    if (!isConnected || !supabase) {
      // Note: This will be handled by individual components using the notification system
      return;
    }

    try {
      const { error } = await supabase
        .from('pins')
        .delete()
        .eq('id', pinId);

      if (error) {
        console.error('Error deleting pin:', error);
      } else {
        fetchPins();
      }
    } catch (err) {
      logError('Failed to delete pin', err instanceof Error ? err : new Error(String(err)));
      // Note: This will be handled by individual components using the notification system
    }
  };

  const handleLikePin = async (pinId: string, imageIndex: number) => {
    console.log('❤️ Like function called:', {
      pinId,
      imageIndex,
      currentUser,
      isConnected
    });

    if (!isConnected || !supabase) {
      console.log('❌ Like blocked: No database connection');
      // Note: This will be handled by individual components using the notification system
      return;
    }

    try {
      console.log('🔍 Checking for existing like...');
      const { data: existingLike, error: selectError } = await supabase
        .from('likes')
        .select('id')
        .eq('pin_id', pinId)
        .eq('image_index', imageIndex)
        .eq('username', currentUser)
        .maybeSingle();

      if (selectError) {
        console.error('❌ Error checking existing like:', selectError);
        return;
      }

      console.log('🔍 Existing like check result:', { existingLike, selectError });

      if (existingLike) {
        console.log('👎 Removing existing like...');
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) {
          console.error('❌ Error deleting like:', deleteError);
        } else {
          console.log('✅ Like removed successfully');
        }
      } else {
        console.log('👍 Adding new like...');
        const { error: insertError } = await supabase
          .from('likes')
          .insert([
            {
              pin_id: pinId,
              image_index: imageIndex,
              username: currentUser,
            }
          ]);

        if (insertError) {
          console.error('❌ Error inserting like:', insertError);
        } else {
          console.log('✅ Like added successfully');
        }
      }
    } catch (err) {
      logError('Failed to toggle like', err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleCommentPin = async (pinId: string, comment: string, mediaUrl?: string) => {
    if (!isConnected || !supabase) {
      // Note: This will be handled by individual components using the notification system
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .insert([
          {
            pin_id: pinId,
            username: currentUser,
            text: comment,
            media_url: mediaUrl || null,
          }
        ]);

      if (error) {
        console.error('Error adding comment:', error);
      }
    } catch (err) {
      logError('Failed to add comment', err instanceof Error ? err : new Error(String(err)));
      // Note: This will be handled by individual components using the notification system
    }
  };

  const handleUsernameChange = (newUsername: string) => {
    setCurrentUser(newUsername);
    setGuestUsername(newUsername);
    if (isConnected) {
      fetchPins();
    }
  };

  const handleCloseAuth = () => {
    setIsAuthPageOpen(false);
  };

  const handleCancelFirstClick = () => {
    setFirstClickLocation(null);
  };

  const handleClosePinModal = () => {
    setIsPinModalOpen(false);
    setPinToCreateLocation(null);
    setPinToEdit(null);
  };

  const handleCloseBlogModal = () => {
    setIsBlogModalOpen(false);
    setSelectedBlogPost(null);
  };

  const handleCloseMarketplaceModal = () => {
    setIsMarketplaceModalOpen(false);
    setSelectedMarketplaceItem(null);
  };

  // Show auth page if requested
  if (isAuthPageOpen) {
    return <AuthPage onCloseAuth={handleCloseAuth} />;
  }

  console.log('🗺️ Rendering main app');
  return (
    <NotificationProvider>
      <div className="h-screen w-full bg-blue-500 overflow-hidden relative">
        <NotificationSystem />
        
      {/* Map Layer - positioned at the bottom */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          pins={pins}
          onAddPin={handleAddPin}
          onDeletePin={handleDeletePin}
          onLikePin={handleLikePin}
          onCommentPin={handleCommentPin}
          onOpenUserProfile={handleOpenUserProfile}
          onEditPin={handleEditPin}
          currentUser={currentUser}
          isAdmin={isAdminUser}
          pinToOpenOnMap={pinToOpenOnMap}
          onPinOpened={() => setPinToOpenOnMap(null)}
          firstClickLocation={firstClickLocation}
          onCancelFirstClick={handleCancelFirstClick}
        />
      </div>
      
      {/* UI Layer - positioned above the map */}
      <FloatingControls
        onOpenUserProfile={() => handleOpenUserProfile(currentUser)}
        onOpenExploreModal={handleOpenExploreModal}
        onOpenMarketplaceModal={() => handleOpenMarketplaceModal()}
        onOpenBlogModal={() => handleOpenBlogModal()}
        onOpenChatWindow={() => handleOpenChatWindow()}
        onOpenWelcomeModal={handleOpenWelcomeModal}
        onAuthButtonClick={handleAuthButtonClick}
        totalPins={pins.length}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
      />

      <PinFormModal
        isOpen={isPinModalOpen}
        onClose={handleClosePinModal}
        onSubmit={handlePinFormSubmit}
        initialPin={pinToEdit}
        initialLat={pinToCreateLocation?.lat}
        initialLng={pinToCreateLocation?.lng}
      />

      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
        username={profileToViewUsername}
        currentUser={currentUser}
        onSelectPin={handleSelectPinFromProfile}
        onSelectBlogPost={handleSelectBlogPostFromProfile}
        onSelectMarketplaceItem={handleSelectMarketplaceItemFromProfile}
        onUsernameChange={handleUsernameChange}
        isCurrentUserAdmin={isAdminUser}
        onOpenChatWindow={handleOpenChatWindow}
      />

      <ExploreModal
        isOpen={isExploreModalOpen}
        onClose={() => setIsExploreModalOpen(false)}
        pins={pins}
        onSelectPin={(pinId) => {
          setPinToOpenOnMap(pinId);
          setIsExploreModalOpen(false);
        }}
        onOpenUserProfile={handleOpenUserProfile}
        currentUser={currentUser}
      />

      <MarketplaceModal
        isOpen={isMarketplaceModalOpen}
        onClose={handleCloseMarketplaceModal}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        onOpenChatWindow={handleOpenChatWindow}
        onOpenUserProfile={handleOpenUserProfile}
        initialItem={selectedMarketplaceItem}
      />

      <BlogModal
        isOpen={isBlogModalOpen}
        onClose={handleCloseBlogModal}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        onOpenUserProfile={handleOpenUserProfile}
        initialPost={selectedBlogPost}
      />

      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
      />

      <ChatWindow
        isOpen={isChatWindowOpen}
        onClose={() => setIsChatWindowOpen(false)}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        initialRecipientUsername={chatRecipientUsername}
      />

      <SignOutConfirmationModal
        isOpen={showSignOutConfirmation}
        onConfirm={handleSignOutConfirm}
        onCancel={handleSignOutCancel}
      />

      {!isConnected && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Database connection unavailable. Please check your Supabase configuration.
        </div>
      )}

      {/* First Click Indicator */}
      {firstClickLocation && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-3">
          <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse"></div>
          <span className="font-medium">Click again to confirm pin location</span>
          <button
            onClick={handleCancelFirstClick}
            className="ml-2 text-blue-200 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
      </div>
    </NotificationProvider>
  );
}

export default App;