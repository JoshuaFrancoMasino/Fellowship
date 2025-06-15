import React, { useState, useEffect } from 'react';
import { X, MapPin, Camera, Plus, Upload, Palette, UserPlus, Globe, AlertCircle } from 'lucide-react';
import { supabase, uploadImage, getImageUrl, TRIBE_COLORS, TribeName } from '../../lib/supabase';
import { reverseGeocode, LocationData } from '../../lib/geocoding';

interface PinCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (description: string, images: string[], pinColor?: string, storagePaths?: string[], locationData?: LocationData) => Promise<void>;
  lat: number;
  lng: number;
}

const PinCreationModal: React.FC<PinCreationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  lat,
  lng,
}) => {
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedTribe, setSelectedTribe] = useState<TribeName>('Dan'); // Default to yellow
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [locationData, setLocationData] = useState<LocationData>({});
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkAuthStatus();
      fetchLocationData();
    }
  }, [isOpen, lat, lng]);

  const checkAuthStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    setCurrentUser(user);
  };

  const fetchLocationData = async () => {
    setIsGeocodingLocation(true);
    try {
      const location = await reverseGeocode(lat, lng);
      setLocationData(location);
    } catch (error) {
      console.error('Failed to fetch location data:', error);
    } finally {
      setIsGeocodingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const pinColor = TRIBE_COLORS[selectedTribe];
      await onSubmit(description.trim(), images, pinColor, uploadedPaths, locationData);
      
      // Only reset and close if submission was successful
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Pin creation failed:', error);
      setSubmitError(error.message || 'Failed to create pin. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setImages([]);
    setImageUrl('');
    setSelectedTribe('Dan');
    setUploadedPaths([]);
    setLocationData({});
    setSubmitError(null);
  };

  const handleAddImageUrl = () => {
    if (imageUrl.trim() && images.length < 3 && !images.includes(imageUrl.trim()) && isAuthenticated) {
      setImages([...images, imageUrl.trim()]);
      setImageUrl('');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !isAuthenticated || !currentUser) return;

    setUploading(true);
    
    for (let i = 0; i < Math.min(files.length, 3 - images.length); i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select only image files');
        continue;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        continue;
      }

      try {
        const path = await uploadImage(file, currentUser.id);
        if (path) {
          const publicUrl = getImageUrl(path);
          setImages(prev => [...prev, publicUrl]);
          setUploadedPaths(prev => [...prev, path]);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload image');
      }
    }
    
    setUploading(false);
    // Reset the input
    event.target.value = '';
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

  const handleSignupClick = () => {
    // Close the pin creation modal first
    resetForm();
    onClose();
    // Then open the auth page
    window.dispatchEvent(new CustomEvent('openAuth'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="glass-header p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 glass-white rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-orange-500 icon-shadow-white-sm" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-shadow-white-md">Create Pin</h2>
                <p className="text-yellow-100 text-sm text-shadow-white-sm">
                  {lat.toFixed(4)}, {lng.toFixed(4)}
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
          {/* Authentication Status */}
          {isAuthenticated && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg">
              <p className="text-green-300 text-sm flex items-center space-x-2">
                <Camera className="w-4 h-4" />
                <span>Authenticated user - Upload images and choose pin colors!</span>
              </p>
            </div>
          )}

          {/* Error Message */}
          {submitError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <div className="flex items-center space-x-2 text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{submitError}</p>
              </div>
            </div>
          )}

          {/* Location Information */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span>Location</span>
              </div>
            </label>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              {isGeocodingLocation ? (
                <div className="flex items-center space-x-2 text-gray-400">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Looking up location...</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {locationData.locality && (
                    <p className="text-sm text-gray-200">
                      <span className="text-gray-400">City:</span> {locationData.locality}
                    </p>
                  )}
                  {locationData.state && (
                    <p className="text-sm text-gray-200">
                      <span className="text-gray-400">State:</span> {locationData.state}
                    </p>
                  )}
                  {locationData.country && (
                    <p className="text-sm text-gray-200">
                      <span className="text-gray-400">Country:</span> {locationData.country}
                    </p>
                  )}
                  {locationData.continent && (
                    <p className="text-sm text-gray-200">
                      <span className="text-gray-400">Continent:</span> {locationData.continent}
                    </p>
                  )}
                  {!locationData.locality && !locationData.state && !locationData.country && !locationData.continent && (
                    <p className="text-sm text-gray-400">Location information not available</p>
                  )}
                </div>
              )}
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
              placeholder="What's happening here?"
              maxLength={200}
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none text-gray-200 placeholder:text-gray-400"
            />
            <div className="text-xs text-gray-400 mt-1">
              {description.length}/200 characters
            </div>
          </div>

          {/* Pin Color Selection - Only for authenticated users */}
          {isAuthenticated && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-200 mb-3">
                <div className="flex items-center space-x-2">
                  <Palette className="w-4 h-4" />
                  <span>Tribe Color</span>
                </div>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(TRIBE_COLORS).map(([tribe, color]) => (
                  <button
                    key={tribe}
                    type="button"
                    onClick={() => setSelectedTribe(tribe as TribeName)}
                    className={`
                      p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium
                      ${selectedTribe === tribe 
                        ? 'border-white bg-white/10 scale-105' 
                        : 'border-gray-600 hover:border-gray-500'
                      }
                    `}
                    style={{ 
                      backgroundColor: selectedTribe === tribe ? `${color}20` : 'transparent',
                      color: selectedTribe === tribe ? color : '#9CA3AF'
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-white/30"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs">{tribe}</span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Selected: <span style={{ color: TRIBE_COLORS[selectedTribe] }}>{selectedTribe}</span>
              </p>
            </div>
          )}

          {/* Images */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Images (up to 3)
            </label>
            
            {/* Guest Signup Reminder - Now Clickable */}
            {!isAuthenticated && (
              <button
                onClick={handleSignupClick}
                className="w-full mb-4 p-4 bg-blue-900/30 border border-blue-700 rounded-lg hover:bg-blue-900/40 transition-colors cursor-pointer group"
              >
                <div className="flex items-start space-x-3">
                  <UserPlus className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5 group-hover:text-blue-300 transition-colors" />
                  <div className="text-left">
                    <p className="text-blue-300 text-sm font-medium mb-1 group-hover:text-blue-200 transition-colors">
                      Sign up to unlock image uploads!
                    </p>
                    <p className="text-blue-200 text-xs group-hover:text-blue-100 transition-colors">
                      If you would like to post images with your pin and access more features please sign up for an account
                    </p>
                  </div>
                </div>
              </button>
            )}
            
            {/* File Upload - Only for authenticated users */}
            {isAuthenticated && (
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
                    disabled={uploading || images.length >= 3 || !isAuthenticated}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* URL Input - Available for all users but disabled for guests */}
            <div className="flex space-x-2 mb-3">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyPress={handleImageUrlKeyPress}
                placeholder={isAuthenticated ? "Or paste image URL" : "Sign up to add images"}
                disabled={!isAuthenticated}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm text-gray-200 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleAddImageUrl}
                disabled={!imageUrl.trim() || images.length >= 3 || !isAuthenticated}
                className="px-4 py-2 bg-yellow-400 text-gray-800 rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Image previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
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
              {isAuthenticated 
                ? 'Upload local images or use URLs from services like Pexels, Unsplash'
                : 'Create an account to upload images and use URLs from services like Pexels, Unsplash'
              }
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
              disabled={!description.trim() || uploading || isGeocodingLocation || isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-lg hover:from-yellow-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {isSubmitting ? 'Creating...' : uploading ? 'Uploading...' : isGeocodingLocation ? 'Processing...' : 'Create Pin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinCreationModal;