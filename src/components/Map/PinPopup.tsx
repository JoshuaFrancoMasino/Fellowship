import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Trash2, X, User, Edit, Image, Upload } from 'lucide-react';
import { Pin, Comment, supabase, getProfileByUsername, uploadImage, getImageUrl, getCurrentUserProfile } from '../../lib/supabase';
import { useNotifications } from '../UI/NotificationSystem';
import { logError } from '../../lib/utils/logger';

interface PinPopupProps {
  pin: Pin;
  currentUser: string;
  isAdmin?: boolean;
  onDelete: () => void;
  onLike: (pinId: string, imageIndex: number) => void;
  onComment: (pinId: string, comment: string, mediaUrl?: string) => void;
  onOpenUserProfile: (username: string) => void;
  onClose: () => void;
  onEdit?: (pin: Pin) => void;
}

const PinPopup: React.FC<PinPopupProps> = ({
  pin,
  currentUser,
  isAdmin = false,
  onDelete,
  onLike,
  onComment,
  onOpenUserProfile,
  onClose,
  onEdit,
}) => {
  const { showError, showSuccess, showWarning } = useNotifications();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [likes, setLikes] = useState<{ [key: number]: number }>({});
  const [userLikes, setUserLikes] = useState<{ [key: number]: boolean }>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [authorProfilePicture, setAuthorProfilePicture] = useState<string | null>(null);
  const [commentProfilePictures, setCommentProfilePictures] = useState<{ [key: string]: string | null }>({});
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [selectedCommentFile, setSelectedCommentFile] = useState<File | null>(null);
  const [isUploadingCommentFile, setIsUploadingCommentFile] = useState(false);
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  // Check if username is a guest user (7-digit number)
  const isGuestUser = (username: string) => username.match(/^\d{7}$/);

  useEffect(() => {
    console.log('🔄 PinPopup useEffect triggered for pin:', pin.id);
    fetchComments();
    fetchLikes();
    fetchAuthorProfilePicture();
  }, [pin.id, currentUser, pin.username]);

  useEffect(() => {
    if (comments.length > 0) {
      fetchCommentProfilePictures();
    }
  }, [comments]);

  const fetchAuthorProfilePicture = async () => {
    if (isGuestUser(pin.username)) {
      setAuthorProfilePicture(null);
      return;
    }

    try {
      const profile = await getProfileByUsername(pin.username);
      setAuthorProfilePicture(profile?.profile_picture_url || null);
    } catch (error) {
      console.error('Error fetching author profile picture:', error);
      setAuthorProfilePicture(null);
    }
  };

  const fetchCommentProfilePictures = async () => {
    const usernames = [...new Set(comments.map(comment => comment.username))];
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

    setCommentProfilePictures(cache);
  };

  const fetchComments = async () => {
    console.log('💬 Fetching comments for pin:', pin.id);
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('pin_id', pin.id)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching comments:', error);
    } else {
      console.log('✅ Comments fetched:', data?.length || 0);
      setComments(data || []);
    }
  };

  const fetchLikes = async () => {
    console.log('❤️ Fetching likes for pin:', pin.id, 'currentUser:', currentUser);
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('pin_id', pin.id);
    
    if (error) {
      console.error('❌ Error fetching likes:', error);
      return;
    }

    console.log('✅ Likes data fetched:', data);
    
    if (data) {
      const likeCounts: { [key: number]: number } = {};
      const userLikeStatus: { [key: number]: boolean } = {};
      
      data.forEach((like) => {
        likeCounts[like.image_index] = (likeCounts[like.image_index] || 0) + 1;
        if (like.username === currentUser) {
          userLikeStatus[like.image_index] = true;
        }
      });
      
      console.log('📊 Processed like counts:', likeCounts);
      console.log('👤 User like status:', userLikeStatus);
      
      setLikes(likeCounts);
      setUserLikes(userLikeStatus);
    }
  };

  const handleComment = async () => {
    if ((newComment.trim() || selectedCommentFile) && newComment.length <= 100) {
      let mediaUrl: string | undefined;

      // Upload file if selected
      if (selectedCommentFile) {
        setIsUploadingCommentFile(true);
        try {
          const profile = await getCurrentUserProfile();
          if (profile) {
            const path = await uploadImage(selectedCommentFile, profile.id, 'chat-and-comment-media');
            if (path) {
              mediaUrl = getImageUrl(path, 'chat-and-comment-media');
            }
          }
        } catch (error) {
          logError('Error uploading comment media', error instanceof Error ? error : new Error(String(error)));
          showError('Upload Failed', 'Failed to upload media. Please try again.');
        } finally {
          setIsUploadingCommentFile(false);
        }
      }

      await onComment(pin.id, newComment.trim() || '', mediaUrl);
      
      // Create notification for pin owner
      if (newComment.trim() || mediaUrl) {
        await createNotification(
          pin.username,
          currentUser,
          'comment',
          'pin',
          pin.id,
          `${currentUser} commented on your pin`
        );
      }
      
      setNewComment('');
      setSelectedCommentFile(null);
      fetchComments();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!supabase) {
      alert('Cannot delete comment - database connection unavailable.');
      return;
    }

    setDeletingCommentId(commentId);

    try {
      console.log('🗑️ Deleting comment:', commentId);
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('❌ Error deleting comment:', error);
        showError('Delete Failed', 'Failed to delete comment. Please try again.');
      } else {
        console.log('✅ Comment deleted successfully');
        showSuccess('Comment Deleted', 'Comment has been removed successfully.');
        fetchComments(); // Refresh comments list
      }
    } catch (err) {
      logError('Failed to delete comment', err instanceof Error ? err : new Error(String(err)));
      showError('Connection Error', 'Failed to delete comment - database connection unavailable.');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleLike = async (imageIndex: number) => {
    console.log('👆 Like button clicked for image index:', imageIndex);
    console.log('🔍 Current user likes state:', userLikes);
    console.log('🔍 Current like counts:', likes);
    
    await onLike(pin.id, imageIndex);
    // Refresh likes after the operation
    setTimeout(() => {
      fetchLikes();
    }, 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canDelete = pin.username === currentUser || isAdmin;
  const canEdit = pin.username === currentUser || isAdmin;

  // Check if user can delete a specific comment
  const canDeleteComment = (comment: Comment) => {
    return comment.username === currentUser || isAdmin;
  };

  const handleCommentFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type (images and GIFs)
      if (file.type.startsWith('image/')) {
        // Validate file size (max 5MB)
        if (file.size <= 5 * 1024 * 1024) {
          setSelectedCommentFile(file);
        } else {
          alert('File size must be less than 5MB');
        }
      } else {
        alert('Please select an image or GIF file');
      }
    }
    
    // Reset file input
    if (commentFileInputRef.current) {
      commentFileInputRef.current.value = '';
    }
  };

  const handleRemoveCommentFile = () => {
    setSelectedCommentFile(null);
  };

  // Calculate total likes across all images
  const totalLikes = Object.values(likes).reduce((sum, count) => sum + count, 0);

  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteConfirmation(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit(pin);
    }
  };

  const handleUserProfileClick = (username: string) => {
    // Only allow profile clicks for non-guest users
    if (!isGuestUser(username)) {
      onClose(); // Close the pin popup first
      onOpenUserProfile(username); // Then open the user profile
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl shadow-2xl p-0 overflow-hidden max-w-sm relative">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-gray-800 rounded-xl p-6 mx-4 max-w-sm w-full border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-200 mb-3 text-center">
              Are you sure?
            </h3>
            <p className="text-gray-400 text-sm mb-6 text-center">
              {isAdmin && pin.username !== currentUser 
                ? 'This action cannot be undone. This pin will be permanently deleted.'
                : 'This action cannot be undone. Your pin will be permanently deleted.'
              }
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                No, Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-header p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isGuestUser(pin.username) ? (
              // Non-clickable version for guest users
              <div className="w-8 h-8 glass-white rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600 icon-shadow-white-sm" />
              </div>
            ) : (
              // Clickable version for authenticated users with profile picture
              <button
                onClick={() => handleUserProfileClick(pin.username)}
                className="w-8 h-8 glass-white rounded-full flex items-center justify-center hover:bg-white/20 transition-colors overflow-hidden"
              >
                {authorProfilePicture ? (
                  <img
                    src={authorProfilePicture}
                    alt={`${pin.username}'s profile`}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <User className="w-4 h-4 text-gray-600 icon-shadow-white-sm" />
                )}
              </button>
            )}
            <div>
              {isGuestUser(pin.username) ? (
                // Non-clickable version for guest users
                <span className="font-semibold text-sm text-shadow-white-sm cursor-default">
                  Guest {pin.username}
                </span>
              ) : (
                // Clickable version for authenticated users
                <button
                  onClick={() => handleUserProfileClick(pin.username)}
                  className="font-semibold text-sm hover:underline transition-all text-shadow-white-sm"
                >
                  {pin.username}
                </button>
              )}
              <p className="text-xs opacity-90 text-shadow-white-sm">{formatDate(pin.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {canEdit && (
              <button
                onClick={handleEditClick}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                title={isAdmin && pin.username !== currentUser ? "Edit pin (Admin)" : "Edit your pin"}
              >
                <Edit className="w-4 h-4 icon-shadow-white-sm" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDeleteClick}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                title={isAdmin && pin.username !== currentUser ? "Delete pin (Admin)" : "Delete your pin"}
              >
                <Trash2 className="w-4 h-4 icon-shadow-white-sm" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              title="Close pin"
            >
              <X className="w-4 h-4 icon-shadow-white-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Images */}
      {pin.images && pin.images.length > 0 && (
        <div className="relative">
          <img
            src={pin.images[selectedImageIndex]}
            alt="Pin image"
            className="w-full h-48 object-cover"
          />
          
          {/* Image navigation */}
          {pin.images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {pin.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Like Button - Now smaller and consistently styled */}
          <div className="absolute top-3 right-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('💖 HEART BUTTON CLICKED! Image index:', selectedImageIndex);
                console.log('💖 Current user:', currentUser);
                console.log('💖 Pin ID:', pin.id);
                handleLike(selectedImageIndex);
              }}
              className={`
                flex items-center justify-center
                w-8 h-8 
                rounded-full 
                shadow-lg
                transition-all duration-200 
                transform hover:scale-110 active:scale-95
                ${userLikes[selectedImageIndex]
                  ? 'bg-red-500 text-white' 
                  : 'glass-white text-red-500 hover:bg-white/20'
                }
              `}
              style={{ 
                zIndex: 1000,
                cursor: 'pointer'
              }}
              type="button"
            >
              <Heart
                className="w-4 h-4"
                fill={userLikes[selectedImageIndex] ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
              />
            </button>
          </div>

          {/* Like count badge */}
          {likes[selectedImageIndex] > 0 && (
            <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
              {likes[selectedImageIndex]} ❤️
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div className="p-4">
        <p className="text-gray-200 text-sm leading-relaxed">{pin.description}</p>
      </div>

      {/* Comments Section */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Heart className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-200">
              {totalLikes} likes
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-200">
              {comments.length} comments
            </span>
          </div>
        </div>

        {/* Comments list */}
        <div className="space-y-3 mb-3 max-h-32 overflow-y-auto">
          {comments.map((comment) => {
            const commentProfilePicture = commentProfilePictures[comment.username];
            const canDeleteThisComment = canDeleteComment(comment);
            const isDeletingThisComment = deletingCommentId === comment.id;

            return (
              <div key={comment.id} className="flex items-start space-x-2 group">
                {/* Profile Picture */}
                <div className="flex-shrink-0">
                  {isGuestUser(comment.username) ? (
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUserProfileClick(comment.username)}
                      className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center hover:scale-105 transition-transform overflow-hidden"
                    >
                      {commentProfilePicture ? (
                        <img
                          src={commentProfilePicture}
                          alt={`${comment.username}'s profile`}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User className="w-3 h-3 text-white" />
                      )}
                    </button>
                  )}
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    {isGuestUser(comment.username) ? (
                      // Non-clickable version for guest users
                      <span className="font-medium text-blue-400 cursor-default">
                        Guest {comment.username}
                      </span>
                    ) : (
                      // Clickable version for authenticated users
                      <button
                        onClick={() => handleUserProfileClick(comment.username)}
                        className="font-medium text-blue-400 hover:underline"
                      >
                        {comment.username}
                      </button>
                    )}
                    {comment.text && (
                      <span className="text-gray-200 ml-2">{comment.text}</span>
                    )}
                  </div>
                  
                  {/* Media content */}
                  {comment.media_url && (
                    <div className="mt-2">
                      <img
                        src={comment.media_url}
                        alt="Comment media"
                        className="max-w-full h-auto rounded-lg"
                        style={{ maxHeight: '150px' }}
                      />
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mt-1">
                    {formatDate(comment.created_at)}
                  </div>
                </div>

                {/* Delete Button */}
                {canDeleteThisComment && (
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={isDeletingThisComment}
                      className="p-1 hover:bg-red-600 rounded-full transition-colors disabled:opacity-50"
                      title={isAdmin && comment.username !== currentUser ? "Delete comment (Admin)" : "Delete your comment"}
                    >
                      {isDeletingThisComment ? (
                        <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-3 h-3 text-red-400 hover:text-white" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add comment */}
        {/* Selected File Preview */}
        {selectedCommentFile && (
          <div className="mb-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-200 truncate">
                  {selectedCommentFile.name}
                </span>
                <span className="text-xs text-gray-400">
                  ({(selectedCommentFile.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
              <button
                onClick={handleRemoveCommentFile}
                className="p-1 hover:bg-red-600 rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-red-400 hover:text-white" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end space-x-2">
          {/* File Upload Button */}
          <button
            onClick={() => commentFileInputRef.current?.click()}
            disabled={isUploadingCommentFile}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 rounded-full transition-colors"
            title="Upload image or GIF"
          >
            {isUploadingCommentFile ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </button>

          {/* Hidden File Input */}
          <input
            ref={commentFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCommentFileSelect}
            className="hidden"
          />

          {/* Comment Input */}
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={selectedCommentFile ? "Add a caption (optional)..." : "Add a comment..."}
            maxLength={100}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-gray-200 placeholder:text-gray-400"
          />

          {/* Submit Button */}
          <button
            onClick={handleComment}
            disabled={(!newComment.trim() && !selectedCommentFile) || isUploadingCommentFile}
            className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full text-sm font-medium hover:from-yellow-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isUploadingCommentFile ? 'Uploading...' : 'Post'}
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {newComment.length}/100 characters
        </div>
      </div>
    </div>
  );
};

export default PinPopup;