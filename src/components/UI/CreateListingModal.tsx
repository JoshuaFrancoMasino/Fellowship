import React, { useState, useEffect } from 'react';
import { X, Upload, Plus, DollarSign, Package, AlertCircle, Save } from 'lucide-react';
import { createMarketplaceItem, updateMarketplaceItem, uploadImage, getImageUrl, getCurrentUserProfile, MarketplaceItem } from '../../lib/supabase';
import { useNotifications } from './NotificationSystem';
import { logError } from '../../lib/utils/logger';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: string;
  isAuthenticated: boolean;
  initialItem?: MarketplaceItem | null;
}

const CreateListingModal: React.FC<CreateListingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
  isAuthenticated,
  initialItem = null,
}) => {
  const { showError, showSuccess, showWarning } = useNotifications();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditMode = !!initialItem;

  useEffect(() => {
    if (initialItem) {
      // Editing mode - populate form with existing data
      setTitle(initialItem.title);
      setDescription(initialItem.description);
      setPrice(initialItem.price.toString());
      setImages(initialItem.images || []);
      setUploadedPaths(initialItem.storage_paths || []);
    } else {
      // Creating mode - reset form
      setTitle('');
      setDescription('');
      setPrice('');
      setImages([]);
      setUploadedPaths([]);
    }
    setSubmitError(null);
  }, [initialItem]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setImages([]);
    setImageUrl('');
    setUploadedPaths([]);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !price.trim()) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    const priceNumber = parseFloat(price);
    if (isNaN(priceNumber) || priceNumber < 0) {
      setSubmitError('Please enter a valid price');
      return;
    }

    if (!isAuthenticated) {
      setSubmitError('You must be signed in to create listings');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (isEditMode && initialItem) {
        // Update existing item
        await updateMarketplaceItem(initialItem.id, {
          title: title.trim(),
          description: description.trim(),
          price: priceNumber,
          images,
          storage_paths: uploadedPaths,
        });
      } else {
        // Create new item
        await createMarketplaceItem(
          title.trim(),
          description.trim(),
          priceNumber,
          images,
          uploadedPaths
        );
      }

      resetForm();
      showSuccess('Success', `Listing ${isEditMode ? 'updated' : 'created'} successfully!`);
      onSuccess();
    } catch (error: any) {
      logError(`Failed to ${isEditMode ? 'update' : 'create'} listing`, error);
      setSubmitError(error.message || `Failed to ${isEditMode ? 'update' : 'create'} listing. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrl.trim() && images.length < 10 && !images.includes(imageUrl.trim())) {
      setImages([...images, imageUrl.trim()]);
      setImageUrl('');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !isAuthenticated) return;

    setUploading(true);
    
    try {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        showWarning('Sign In Required', 'Please sign in to upload images');
        return;
      }

      for (let i = 0; i < Math.min(files.length, 10 - images.length); i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          showError('Invalid File Type', 'Please select only image files');
          continue;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          showError('File Too Large', 'Image size must be less than 5MB');
          continue;
        }

        try {
          const path = await uploadImage(file, profile.id, 'marketplace-images');
          if (path) {
            const publicUrl = getImageUrl(path, 'marketplace-images');
            setImages(prev => [...prev, publicUrl]);
            setUploadedPaths(prev => [...prev, path]);
          }
        } catch (error) {
          logError('Error uploading file', error instanceof Error ? error : new Error(String(error)));
          showError('Upload Failed', 'Failed to upload image');
        }
      }
    } catch (error) {
      logError('Error in file upload', error instanceof Error ? error : new Error(String(error)));
      showError('Upload Failed', 'Failed to upload images');
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    // Also remove from uploaded paths if it exists
    if (uploadedPaths[index]) {
      setUploadedPaths(uploadedPaths.filter((_, i) => i !== index));
    }
  };

  const handleImageUrlKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddImageUrl();
    }
  };

  if (!isOpen) return null;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="glass-header p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-400 icon-shadow-white-sm" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-shadow-white-md">Authentication Required</h2>
                  <p className="text-red-100 text-sm text-shadow-white-sm">
                    Sign in to create listings
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
              You need to be signed in to create marketplace listings.
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
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="glass-header p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 glass-white rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600 icon-shadow-white-sm" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-shadow-white-md">
                  {isEditMode ? 'Edit Listing' : 'Create Listing'}
                </h2>
                <p className="text-green-100 text-sm text-shadow-white-sm">
                  {isEditMode ? 'Update your marketplace listing' : 'Sell an item to the community'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5 icon-shadow-white-sm" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {submitError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <div className="flex items-center space-x-2 text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{submitError}</p>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you selling?"
              maxLength={100}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
            />
            <div className="text-xs text-gray-400 mt-1">
              {title.length}/100 characters
            </div>
          </div>

          {/* Price */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Price *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item in detail..."
              maxLength={1000}
              rows={4}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-gray-200 placeholder:text-gray-400"
            />
            <div className="text-xs text-gray-400 mt-1">
              {description.length}/1000 characters
            </div>
          </div>

          {/* Images */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Images (up to 10)
            </label>
            
            {/* File Upload */}
            <div className="mb-3">
              <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-600 rounded-lg hover:border-gray-500 transition-colors cursor-pointer">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {uploading ? 'Uploading...' : 'Click to upload images'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG up to 5MB each
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading || images.length >= 10}
                  className="hidden"
                />
              </label>
            </div>

            {/* URL Input */}
            <div className="flex space-x-2 mb-3">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyPress={handleImageUrlKeyPress}
                placeholder="Or paste image URL"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-200 placeholder:text-gray-400"
              />
              <button
                onClick={handleAddImageUrl}
                disabled={!imageUrl.trim() || images.length >= 10}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Image previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2">
              Upload local images or use URLs from services like Pexels, Unsplash
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !description.trim() || !price.trim() || uploading || isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting 
                  ? (isEditMode ? 'Updating...' : 'Creating...') 
                  : uploading 
                    ? 'Uploading...' 
                    : (isEditMode ? 'Update Listing' : 'Create Listing')
                }
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateListingModal;