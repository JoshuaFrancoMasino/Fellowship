import React, { useState, useEffect, useRef } from 'react';
import { X, BookOpen, Save, Eye, EyeOff, AlertCircle, Image, Upload } from 'lucide-react';
import { createBlogPost, updateBlogPost, BlogPost, uploadImage, getImageUrl, getCurrentUserProfile } from '../../lib/supabase';
import { useNotifications } from './NotificationSystem';
import { logError } from '../../lib/utils/logger';

interface CreateBlogPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: string;
  isAuthenticated: boolean;
  initialPost?: BlogPost | null;
}

const CreateBlogPostModal: React.FC<CreateBlogPostModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
  isAuthenticated,
  initialPost = null,
}) => {
  const { showError, showSuccess, showWarning } = useNotifications();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!initialPost;

  // Updated useEffect to properly initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialPost) {
        // Editing mode - populate form with existing data
        setTitle(initialPost.title);
        setContent(initialPost.content);
        setIsPublished(initialPost.is_published);
      } else {
        // Creating mode - reset form to defaults
        setTitle('');
        setContent('');
        setIsPublished(false);
      }
      
      // Reset other form states
      setSubmitError(null);
    }
  }, [isOpen, initialPost]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setIsPublished(false);
    setSubmitError(null);
  };

  const insertAtCursor = (textToInsert: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newContent = content.substring(0, start) + textToInsert + content.substring(end);
    setContent(newContent);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isAuthenticated) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Invalid File Type', 'Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('File Too Large', 'Image size must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);

    try {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        showWarning('Sign In Required', 'Please sign in to upload images');
        return;
      }

      // Upload image to blog-images bucket
      const path = await uploadImage(file, profile.id, 'blog-images');
      
      if (!path) {
        throw new Error('Failed to upload image');
      }

      // Get public URL
      const publicUrl = getImageUrl(path, 'blog-images');
      
      // Insert image HTML at cursor position
      const imageHtml = `<img src="${publicUrl}" alt="Blog image" style="max-width: 100%; height: auto; margin: 10px 0;" />`;
      insertAtCursor(imageHtml);
      
    } catch (error) {
      logError('Error uploading image', error instanceof Error ? error : new Error(String(error)));
      showError('Upload Failed', 'Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setSubmitError('Please fill in both title and content');
      return;
    }

    if (!isAuthenticated) {
      setSubmitError('You must be signed in to create blog posts');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (isEditMode && initialPost) {
        // Update existing post
        const success = await updateBlogPost(initialPost.id, {
          title: title.trim(),
          content: content.trim(),
          is_published: isPublished,
        });
        
        if (!success) {
          throw new Error('Failed to update blog post');
        }
      } else {
        // Create new post
        const result = await createBlogPost(title.trim(), content.trim(), isPublished);
        
        if (!result) {
          throw new Error('Failed to create blog post');
        }
      }
      
      // Success - reset form and close modal
      resetForm();
      const action = isEditMode ? 'updated' : isPublished ? 'published' : 'saved as draft';
      showSuccess('Success', `Blog post ${action} successfully!`);
      onSuccess(); // This will refresh the blog list
      onClose(); // Close the modal
      
    } catch (error: any) {
      logError(`Failed to ${isEditMode ? 'update' : 'create'} blog post`, error);
      setSubmitError(error.message || `Failed to ${isEditMode ? 'update' : 'create'} blog post. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCloseModal();
    }
  };

  const handleCloseModal = () => {
    resetForm();
    onClose();
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
                    Sign in to create blog posts
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 icon-shadow-white-sm" />
              </button>
            </div>
          </div>
          <div className="p-6 text-center">
            <p className="text-gray-300 mb-4">
              You need to be signed in to create and publish blog posts.
            </p>
            <button
              onClick={() => {
                handleCloseModal();
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
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="glass-header p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 glass-white rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600 icon-shadow-white-sm" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-shadow-white-md">
                  {isEditMode ? 'Edit Blog Post' : 'Create Blog Post'}
                </h2>
                <p className="text-blue-100 text-sm text-shadow-white-sm">
                  {isEditMode ? 'Update your blog post' : 'Share your thoughts with the community'}
                </p>
              </div>
            </div>
            <button
              onClick={handleCloseModal}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5 icon-shadow-white-sm" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
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
              placeholder="Enter your blog post title..."
              maxLength={200}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400 text-lg font-medium"
            />
            <div className="text-xs text-gray-400 mt-1">
              {title.length}/200 characters
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Content *
            </label>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your blog post content here..."
              maxLength={10000}
              rows={16}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-200 placeholder:text-gray-400 leading-relaxed"
            />
            <div className="text-xs text-gray-400 mt-1">
              {content.length}/10,000 characters
            </div>

            {/* Media Buttons */}
            <div className="mt-3 flex flex-wrap gap-3">
              {/* Image Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
              >
                {isUploadingImage ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Image className="w-4 h-4" />
                )}
                <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
              </button>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Media Instructions */}
            <div className="mt-3 text-xs text-gray-400">
              <p>💡 <strong>Tips:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Click "Upload Image" to add photos directly from your device</li>
                <li>Images will be inserted at your cursor position</li>
                <li>You can mix text and images in any order</li>
                <li>Use HTML formatting for advanced styling</li>
              </ul>
            </div>
          </div>

          {/* Publication Status */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-3">
              Publication Status
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsPublished(false)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  !isPublished
                    ? 'bg-yellow-600 border-yellow-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <EyeOff className="w-4 h-4" />
                <span>Save as Draft</span>
              </button>
              <button
                onClick={() => setIsPublished(true)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  isPublished
                    ? 'bg-green-600 border-green-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Publish Now</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {isPublished 
                ? 'Your post will be visible to all users immediately'
                : 'Your post will be saved as a draft and only visible to you'
              }
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || isSubmitting || isUploadingImage}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting 
                  ? (isEditMode ? 'Updating...' : 'Saving...') 
                  : isPublished 
                    ? (isEditMode ? 'Update Post' : 'Publish Post')
                    : (isEditMode ? 'Save Changes' : 'Save Draft')
                }
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBlogPostModal;