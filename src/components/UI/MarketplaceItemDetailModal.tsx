import React, { useState } from 'react';
import { X, MessageCircle, User, Calendar, DollarSign, ChevronLeft, ChevronRight, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { MarketplaceItem } from '../../lib/supabase';
import { socketService } from '../../lib/socket';

interface MarketplaceItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MarketplaceItem | null;
  currentUser: string;
  isAuthenticated: boolean;
  onOpenChatWindow: () => void;
  onEditItem: (item: MarketplaceItem) => void;
  onDeleteItem: (itemId: string) => void;
  isAdminUser: boolean;
}

const MarketplaceItemDetailModal: React.FC<MarketplaceItemDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  isAuthenticated,
  onOpenChatWindow,
  onEditItem,
  onDeleteItem,
  isAdminUser,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [contactMessage, setContactMessage] = useState('');
  const [isContacting, setIsContacting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleContactSeller = async () => {
    if (!isAuthenticated) {
      setContactError('Please sign in to contact sellers');
      return;
    }

    if (!contactMessage.trim()) {
      setContactError('Please enter a message');
      return;
    }

    if (item.seller_username === currentUser) {
      setContactError('You cannot contact yourself');
      return;
    }

    setIsContacting(true);
    setContactError(null);

    try {
      // Send message through socket service
      const success = socketService.sendPrivateMessage(
        item.seller_username,
        `Hi! I'm interested in your listing: "${item.title}". ${contactMessage.trim()}`
      );

      if (success) {
        setContactMessage('');
        onOpenChatWindow();
        onClose();
        // Show success message
        setTimeout(() => {
          alert('Message sent! Check your direct messages to continue the conversation.');
        }, 100);
      } else {
        setContactError('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setContactError('Failed to send message. Please try again.');
    } finally {
      setIsContacting(false);
    }
  };

  const handlePreviousImage = () => {
    if (item.images && item.images.length > 1) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? item.images.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (item.images && item.images.length > 1) {
      setSelectedImageIndex((prev) => 
        prev === item.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handleEditClick = () => {
    onEditItem(item);
    onClose();
  };

  const handleDeleteClick = () => {
    onDeleteItem(item.id);
    onClose();
  };

  const isOwnListing = item.seller_username === currentUser;
  const canEditItem = isOwnListing || isAdminUser;
  const canDeleteItem = isOwnListing || isAdminUser;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="glass-header p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 glass-white rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600 icon-shadow-white-sm" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-shadow-white-md line-clamp-1">
                  {item.title}
                </h2>
                <p className="text-green-100 text-sm text-shadow-white-sm">
                  {formatPrice(item.price)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {(canEditItem || canDeleteItem) && (
                <div className="flex items-center space-x-2 mr-2">
                  {canEditItem && (
                    <button
                      onClick={handleEditClick}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors"
                      title={isAdminUser && !isOwnListing ? "Edit listing (Admin)" : "Edit your listing"}
                    >
                      <Edit className="w-5 h-5 icon-shadow-white-sm" />
                    </button>
                  )}
                  {canDeleteItem && (
                    <button
                      onClick={handleDeleteClick}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors"
                      title={isAdminUser && !isOwnListing ? "Delete listing (Admin)" : "Delete your listing"}
                    >
                      <Trash2 className="w-5 h-5 text-red-400 icon-shadow-white-sm" />
                    </button>
                  )}
                </div>
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

        {/* Content */}
        <div className="flex flex-col lg:flex-row max-h-[calc(90vh-120px)]">
          {/* Image Section */}
          {item.images && item.images.length > 0 && (
            <div className="lg:w-1/2 relative bg-gray-800">
              <img
                src={item.images[selectedImageIndex]}
                alt={item.title}
                className="w-full h-64 lg:h-full object-cover"
              />
              
              {/* Image Navigation */}
              {item.images.length > 1 && (
                <>
                  <button
                    onClick={handlePreviousImage}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  
                  {/* Image Indicators */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {item.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
              
              {/* Image Counter */}
              {item.images.length > 1 && (
                <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {selectedImageIndex + 1} / {item.images.length}
                </div>
              )}
            </div>
          )}

          {/* Details Section */}
          <div className="lg:w-1/2 p-6 overflow-y-auto">
            {/* Price */}
            <div className="mb-6">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {formatPrice(item.price)}
              </div>
            </div>

            {/* Title */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-200 mb-2">
                {item.title}
              </h1>
            </div>

            {/* Seller Info */}
            <div className="mb-6 p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-200">
                    {item.seller_username.match(/^\d{7}$/) ? `Guest ${item.seller_username}` : item.seller_username}
                  </p>
                  <div className="flex items-center space-x-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>Listed {formatDate(item.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Description</h3>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </p>
              </div>
            </div>

            {/* Contact Section */}
            {!isOwnListing && (
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">Contact Seller</h3>
                
                {!isAuthenticated ? (
                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-blue-300 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">Sign in required</span>
                    </div>
                    <p className="text-blue-200 text-sm mb-3">
                      You need to be signed in to contact sellers.
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('openAuth'));
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Sign In
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contactError && (
                      <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                        <div className="flex items-center space-x-2 text-red-300">
                          <AlertCircle className="w-4 h-4" />
                          <p className="text-sm">{contactError}</p>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Message to seller
                      </label>
                      <textarea
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Hi! I'm interested in this item..."
                        maxLength={200}
                        rows={4}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-200 placeholder:text-gray-400 text-sm resize-none"
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        {contactMessage.length}/200 characters
                      </div>
                    </div>
                    
                    <button
                      onClick={handleContactSeller}
                      disabled={!contactMessage.trim() || isContacting}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>
                        {isContacting ? 'Sending...' : 'Send Message'}
                      </span>
                    </button>
                    
                    <p className="text-xs text-gray-400 text-center">
                      Your message will be sent via direct message
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Own Listing Indicator */}
            {isOwnListing && (
              <div className="border-t border-gray-700 pt-6">
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-center">
                  <p className="text-blue-300 font-medium">This is your listing</p>
                  <p className="text-blue-200 text-sm mt-1">
                    Other users can contact you about this item
                  </p>
                </div>
              </div>
            )}

            {/* Admin Indicator */}
            {isAdminUser && !isOwnListing && (
              <div className="border-t border-gray-700 pt-6">
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-center">
                  <p className="text-red-300 font-medium">Admin View</p>
                  <p className="text-red-200 text-sm mt-1">
                    You have admin privileges to edit or delete this listing
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceItemDetailModal;