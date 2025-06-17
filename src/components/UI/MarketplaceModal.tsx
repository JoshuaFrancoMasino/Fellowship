import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Search, Plus, DollarSign, MessageCircle, User, Calendar, Filter, Edit, Trash2, Star } from 'lucide-react';
import { MarketplaceItem, getMarketplaceItems, deleteMarketplaceItem, getCurrentUserProfile, getProfileByUsername, updateMarketplaceItem } from '../../lib/supabase';
import CreateListingModal from './CreateListingModal';
import MarketplaceItemDetailModal from './MarketplaceItemDetailModal';
import { chatService } from '../../lib/chatService';

interface MarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  isAuthenticated: boolean;
  onOpenChatWindow: (recipientUsername?: string) => void;
  onOpenUserProfile: (username: string) => void;
  initialItem?: MarketplaceItem | null;
}

const MarketplaceModal: React.FC<MarketplaceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAuthenticated,
  onOpenChatWindow,
  onOpenUserProfile,
  initialItem = null,
}) => {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price-low' | 'price-high'>('newest');
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<MarketplaceItem | null>(null);
  const [contactingItem, setContactingItem] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [profilePictureCache, setProfilePictureCache] = useState<{ [key: string]: string | null }>({});
  const [togglingEditorChoice, setTogglingEditorChoice] = useState<string | null>(null);

  // Check if username is a guest user (7-digit number)
  const isGuestUser = (username: string) => username.match(/^\d{7}$/);

  useEffect(() => {
    if (isOpen) {
      fetchItems();
      checkAdminStatus();

      // If initialItem is provided, set it as selected
      if (initialItem) {
        setSelectedItem(initialItem);
      }
    }
  }, [isOpen, isAuthenticated, initialItem]);

  useEffect(() => {
    if (items.length > 0) {
      fetchProfilePictures();
    }
  }, [items]);

  const fetchProfilePictures = async () => {
    const usernames = [...new Set(items.map(item => item.seller_username))];
    const cache: { [key: string]: string | null } = {};

    // Fetch profile pictures for non-guest users
    for (const username of usernames) {
      if (!isGuestUser(username)) {
        try {
          const profile = await getProfileByUsername(username);
          cache[username] = profile?.profile_picture_url || null;
        } catch (error) {
          console.error(`Error fetching profile picture for ${username}:`, error);
          cache[username] = null;
        }
      } else {
        cache[username] = null; // Guest users don't have profile pictures
      }
    }

    setProfilePictureCache(cache);
  };

  const checkAdminStatus = async () => {
    if (!isAuthenticated) {
      setIsAdminUser(false);
      return;
    }

    try {
      const profile = await getCurrentUserProfile();
      setIsAdminUser(profile?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdminUser(false);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const marketplaceItems = await getMarketplaceItems();
      setItems(marketplaceItems);
    } catch (error) {
      console.error('Error fetching marketplace items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEditorChoice = async (itemId: string, currentStatus: boolean) => {
    if (!isAdminUser) return;

    setTogglingEditorChoice(itemId);

    try {
      const success = await updateMarketplaceItem(itemId, {
        is_editor_choice: !currentStatus
      });

      if (success) {
        // Update the local items data
        setItems(prevItems =>
          prevItems.map(item =>
            item.id === itemId
              ? { ...item, is_editor_choice: !currentStatus }
              : item
          )
        );
      } else {
        alert('Failed to update editor\'s choice status');
      }
    } catch (error) {
      console.error('Error toggling editor choice:', error);
      alert('Failed to update editor\'s choice status');
    } finally {
      setTogglingEditorChoice(null);
    }
  };

  const handleEditItem = (item: MarketplaceItem) => {
    setItemToEdit(item);
    setIsCreateListingOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteMarketplaceItem(itemId);
      fetchItems(); // Refresh the list
      if (selectedItem?.id === itemId) {
        setSelectedItem(null); // Close the detail view if it's the deleted item
      }
    } catch (error) {
      console.error('Error deleting marketplace item:', error);
      alert('Failed to delete listing. Please try again.');
    }
  };

  const canEditItem = (item: MarketplaceItem) => {
    return item.seller_username === currentUser || isAdminUser;
  };

  const canDeleteItem = (item: MarketplaceItem) => {
    return item.seller_username === currentUser || isAdminUser;
  };

  const filteredAndSortedItems = items
    .filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.seller_username.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // First, always sort by editor's choice status
      if (a.is_editor_choice && !b.is_editor_choice) return -1;
      if (!a.is_editor_choice && b.is_editor_choice) return 1;
      
      // Then sort by the selected criteria
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        default:
          return 0;
      }
    });

  const handleContactSeller = async (item: MarketplaceItem) => {
    if (!isAuthenticated) {
      alert('Please sign in to contact sellers');
      return;
    }

    if (!contactMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    if (item.seller_username === currentUser) {
      alert('You cannot contact yourself');
      return;
    }

    try {
      // Send message through chat service
      const success = await chatService.sendDirectMessage(
        item.seller_username,
        `Hi! I'm interested in your listing: "${item.title}". ${contactMessage.trim()}`
      );

      if (success) {
        setContactingItem(null);
        setContactMessage('');
        onOpenChatWindow(item.seller_username);
        alert('Message sent! Check your direct messages to continue the conversation.');
      } else {
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleItemClick = (item: MarketplaceItem) => {
    setSelectedItem(item);
  };

  const handleCloseDetailModal = () => {
    setSelectedItem(null);
  };

  const handleUserProfileClick = (username: string) => {
    // Only allow profile clicks for non-guest users
    if (!isGuestUser(username)) {
      onClose(); // Close the marketplace modal first
      onOpenUserProfile(username); // Then open the user profile
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="glass-header p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 glass-white rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-green-600 icon-shadow-white-sm" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-shadow-white-md">Marketplace</h2>
                  <p className="text-blue-100 text-sm text-shadow-white-sm">
                    Buy and sell items in your community
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isAuthenticated && (
                  <button
                    onClick={() => setIsCreateListingOpen(true)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Sell Item</span>
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

          {/* Search and Filter Bar */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items, descriptions, or sellers..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-200"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Items Grid */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredAndSortedItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">
                  {searchTerm ? 'No items found' : 'No items for sale yet'}
                </p>
                <p className="text-sm">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : isAuthenticated 
                      ? 'Be the first to list an item!' 
                      : 'Sign in to start selling items'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedItems.map((item) => {
                  const sellerProfilePicture = profilePictureCache[item.seller_username];

                  return (
                    <div
                      key={item.id}
                      className={`bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:bg-gray-700 transition-all duration-200 group cursor-pointer ${
                        item.is_editor_choice ? 'editor-choice-border' : ''
                      }`}
                      onClick={() => handleItemClick(item)}
                    >
                      {/* Editor's Choice Badge */}
                      {item.is_editor_choice && (
                        <div className="relative">
                          <div className="absolute top-2 left-2 z-10">
                            <span className="editor-choice-badge px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                              <Star className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Item Image */}
                      {item.images && item.images.length > 0 && (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          {item.images.length > 1 && (
                            <div className="absolute top-2 right-2 bg-gray-800/70 text-gray-200 px-2 py-1 rounded-full text-xs">
                              +{item.images.length - 1} more
                            </div>
                          )}
                          <div className="absolute top-2 left-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                            {formatPrice(item.price)}
                          </div>
                        </div>
                      )}

                      {/* Item Content */}
                      <div className="p-4">
                        {/* Title and Price */}
                        <div className="mb-3">
                          <h3 className="text-lg font-semibold text-gray-200 mb-1 line-clamp-1">
                            {item.title}
                          </h3>
                          {(!item.images || item.images.length === 0) && (
                            <div className="flex items-center space-x-2 text-green-400 mb-2">
                              <DollarSign className="w-5 h-5" />
                              <span className="text-xl font-bold">{formatPrice(item.price)}</span>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-300 line-clamp-3 mb-4">
                          {item.description}
                        </p>

                        {/* Seller Info */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            {isGuestUser(item.seller_username) ? (
                              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <User className="w-3 h-3 text-white" />
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUserProfileClick(item.seller_username);
                                }}
                                className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center hover:scale-105 transition-transform overflow-hidden"
                              >
                                {sellerProfilePicture ? (
                                  <img
                                    src={sellerProfilePicture}
                                    alt={`${item.seller_username}'s profile`}
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                ) : (
                                  <User className="w-3 h-3 text-white" />
                                )}
                              </button>
                            )}
                            {isGuestUser(item.seller_username) ? (
                              <span className="text-sm text-gray-400 cursor-default">
                                Guest {item.seller_username}
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUserProfileClick(item.seller_username);
                                }}
                                className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
                              >
                                {item.seller_username}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(item.created_at)}</span>
                            </div>
                            {/* Admin Editor's Choice Toggle */}
                            {isAdminUser && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleEditorChoice(item.id, !!item.is_editor_choice);
                                  }}
                                  disabled={togglingEditorChoice === item.id}
                                  className={`p-1 rounded-full transition-colors ${
                                    item.is_editor_choice
                                      ? 'text-yellow-400 hover:text-yellow-300 bg-yellow-900/20'
                                      : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-900/20'
                                  }`}
                                  title={item.is_editor_choice ? "Remove from Editor's Choice" : "Set as Editor's Choice"}
                                >
                                  {togglingEditorChoice === item.id ? (
                                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Star className={`w-3 h-3 ${item.is_editor_choice ? 'fill-current' : ''}`} />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {(canEditItem(item) || canDeleteItem(item)) && item.seller_username === currentUser ? (
                          // Own listing - show edit/delete buttons
                          <div className="border-t border-gray-700 pt-4">
                            <div className="flex space-x-2">
                              {canEditItem(item) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditItem(item);
                                  }}
                                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-1"
                                  title={isAdminUser && item.seller_username !== currentUser ? "Edit listing (Admin)" : "Edit your listing"}
                                >
                                  <Edit className="w-4 h-4" />
                                  <span>Edit</span>
                                </button>
                              )}
                              {canDeleteItem(item) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(item.id);
                                  }}
                                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center space-x-1"
                                  title={isAdminUser && item.seller_username !== currentUser ? "Delete listing (Admin)" : "Delete your listing"}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ) : item.seller_username !== currentUser ? (
                          // Other's listing - show contact seller button
                          <div className="border-t border-gray-700 pt-4">
                            {contactingItem === item.id ? (
                              <div className="space-y-3">
                                <textarea
                                  value={contactMessage}
                                  onChange={(e) => setContactMessage(e.target.value)}
                                  placeholder="Hi! I'm interested in this item..."
                                  maxLength={200}
                                  rows={3}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-200 placeholder:text-gray-400 text-sm resize-none"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleContactSeller(item);
                                    }}
                                    disabled={!contactMessage.trim() || !isAuthenticated}
                                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                    <span>Send</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setContactingItem(null);
                                      setContactMessage('');
                                    }}
                                    className="px-3 py-2 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500 transition-colors text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <div className="text-xs text-gray-400">
                                  {contactMessage.length}/200 characters
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isAuthenticated) {
                                    alert('Please sign in to contact sellers');
                                    return;
                                  }
                                  setContactingItem(item.id);
                                }}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span>Contact Seller</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          // Admin actions for items they don't own
                          isAdminUser && (
                            <div className="border-t border-gray-700 pt-4">
                              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-center">
                                <p className="text-red-300 text-sm font-medium mb-2">Admin Actions</p>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditItem(item);
                                    }}
                                    className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteItem(item.id);
                                    }}
                                    className="flex-1 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 p-4 bg-gray-900">
            <div className="text-center text-sm text-gray-400">
              Showing {filteredAndSortedItems.length} of {items.length} items
              {!isAuthenticated && (
                <span className="ml-2 text-blue-400">• Sign in to sell items</span>
              )}
              {isAdminUser && (
                <span className="ml-2 text-yellow-400">• Admin: Click ⭐ to set Editor's Choice</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={isCreateListingOpen}
        onClose={() => {
          setIsCreateListingOpen(false);
          setItemToEdit(null);
        }}
        onSuccess={() => {
          setIsCreateListingOpen(false);
          setItemToEdit(null);
          fetchItems();
        }}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        initialItem={itemToEdit}
      />

      {/* Item Detail Modal */}
      <MarketplaceItemDetailModal
        isOpen={!!selectedItem}
        onClose={handleCloseDetailModal}
        item={selectedItem}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        onOpenChatWindow={onOpenChatWindow}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        isAdminUser={isAdminUser}
        onOpenUserProfile={onOpenUserProfile}
      />
    </>
  );
};

export default MarketplaceModal;