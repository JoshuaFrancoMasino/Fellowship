import React, { useState, useEffect } from 'react';
import { X, BookOpen, Search, Plus, Calendar, User, Eye, Edit, Trash2, Filter, Cross, Heart, ArrowLeft, MessageCircle, Send, Image, Upload } from 'lucide-react';
import { BlogPost, getBlogPosts, getUserBlogPosts, deleteBlogPost, getCurrentUserProfile, getProfileByUsername, updateBlogPost, toggleBlogPostLike, getBlogPostLikeCounts, getUserBlogPostLikes, getBlogPostComments, createBlogPostComment, deleteBlogPostComment, BlogPostComment, uploadImage, getImageUrl } from '../../lib/supabase';
import CreateBlogPostModal from './CreateBlogPostModal';

interface BlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  isAuthenticated: boolean;
  onOpenUserProfile: (username: string) => void;
  initialPost?: BlogPost | null;
}

const BlogModal: React.FC<BlogModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAuthenticated,
  onOpenUserProfile,
  initialPost = null,
}) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'my-posts'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [postToEdit, setPostToEdit] = useState<BlogPost | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [profilePictureCache, setProfilePictureCache] = useState<{ [key: string]: string | null }>({});
  const [togglingEditorChoice, setTogglingEditorChoice] = useState<string | null>(null);
  const [blogPostLikeCounts, setBlogPostLikeCounts] = useState<{ [key: string]: number }>({});
  const [userBlogPostLikes, setUserBlogPostLikes] = useState<{ [key: string]: boolean }>({});
  const [togglingLike, setTogglingLike] = useState<string | null>(null);

  // Comment-related state
  const [comments, setComments] = useState<BlogPostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);
  const [selectedCommentFile, setSelectedCommentFile] = useState<File | null>(null);
  const [isUploadingCommentFile, setIsUploadingCommentFile] = useState(false);
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  // Check if username is a guest user (7-digit number)
  const isGuestUser = (username: string) => username.match(/^\d{7}$/);

  useEffect(() => {
    if (isOpen) {
      fetchPosts();
      checkAdminStatus();

      // If initialPost is provided, set it as selected
      if (initialPost) {
        setSelectedPost(initialPost);
      }
    }
  }, [isOpen, filterBy, currentUser, isAuthenticated, initialPost]);

  useEffect(() => {
    if (posts.length > 0) {
      fetchProfilePictures();
      fetchBlogPostLikeCounts();
      if (currentUser) {
        fetchUserBlogPostLikes();
      }
    }
  }, [posts, currentUser]);

  // Fetch comments when a post is selected
  useEffect(() => {
    if (selectedPost) {
      fetchComments();
    } else {
      setComments([]);
      setNewComment('');
    }
  }, [selectedPost]);

  const fetchProfilePictures = async () => {
    const usernames = [...new Set(posts.map(post => post.author_username))];
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

  const fetchComments = async () => {
    if (!selectedPost) return;

    setLoadingComments(true);
    try {
      const blogComments = await getBlogPostComments(selectedPost.id);
      setComments(blogComments);

      // Fetch profile pictures for comment authors
      const commentUsernames = [...new Set(blogComments.map(comment => comment.username))];
      const commentCache: { [key: string]: string | null } = { ...profilePictureCache };

      for (const username of commentUsernames) {
        if (!isGuestUser(username) && !(username in commentCache)) {
          try {
            const profile = await getProfileByUsername(username);
            commentCache[username] = profile?.profile_picture_url || null;
          } catch (error) {
            console.error(`Error fetching profile picture for ${username}:`, error);
            commentCache[username] = null;
          }
        } else if (isGuestUser(username) && !(username in commentCache)) {
          commentCache[username] = null;
        }
      }

      setProfilePictureCache(commentCache);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if ((!newComment.trim() && !selectedCommentFile) || !selectedPost || !currentUser) return;

    setSubmittingComment(true);
    let mediaUrl: string | undefined;

    try {
      // Upload file if selected
      if (selectedCommentFile && isAuthenticated) {
        setIsUploadingCommentFile(true);
        const profile = await getCurrentUserProfile();
        if (profile) {
          const path = await uploadImage(selectedCommentFile, profile.id, 'chat-and-comment-media');
          if (path) {
            mediaUrl = getImageUrl(path, 'chat-and-comment-media');
          }
        }
        setIsUploadingCommentFile(false);
      }

      const success = await createBlogPostComment(
        selectedPost.id, 
        currentUser, 
        newComment.trim() || '', 
        mediaUrl
      );
      
      if (success) {
        setNewComment('');
        setSelectedCommentFile(null);
        await fetchComments(); // Refresh comments
      } else {
        alert('Failed to post comment. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
      setIsUploadingCommentFile(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setDeletingComment(commentId);
    try {
      const success = await deleteBlogPostComment(commentId);
      
      if (success) {
        await fetchComments(); // Refresh comments
      } else {
        alert('Failed to delete comment. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setDeletingComment(null);
    }
  };

  const canDeleteComment = (comment: BlogPostComment) => {
    return comment.username === currentUser || isAdminUser;
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

  const fetchBlogPostLikeCounts = async () => {
    const postIds = posts.map(post => post.id);
    const likeCounts = await getBlogPostLikeCounts(postIds);
    setBlogPostLikeCounts(likeCounts);
  };

  const fetchUserBlogPostLikes = async () => {
    const postIds = posts.map(post => post.id);
    const userLikes = await getUserBlogPostLikes(postIds, currentUser);
    setUserBlogPostLikes(userLikes);
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

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let blogPosts: BlogPost[] = [];
      
      if (filterBy === 'my-posts' && isAuthenticated) {
        blogPosts = await getUserBlogPosts(currentUser);
      } else {
        blogPosts = await getBlogPosts(true); // Only published posts for public view
      }
      
      setPosts(blogPosts);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEditorChoice = async (postId: string, currentStatus: boolean) => {
    if (!isAdminUser) return;

    setTogglingEditorChoice(postId);

    try {
      const success = await updateBlogPost(postId, {
        is_editor_choice: !currentStatus
      });

      if (success) {
        // Update the local posts data
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post.id === postId
              ? { ...post, is_editor_choice: !currentStatus }
              : post
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

  const handleToggleLike = async (postId: string) => {
    if (!currentUser) {
      alert('Please sign in or set a username to like posts');
      return;
    }

    setTogglingLike(postId);

    try {
      const success = await toggleBlogPostLike(postId, currentUser);

      if (success) {
        // Optimistically update the UI
        const currentLikeCount = blogPostLikeCounts[postId] || 0;
        const userHasLiked = userBlogPostLikes[postId] || false;

        if (userHasLiked) {
          // User is removing their like
          setBlogPostLikeCounts(prev => ({
            ...prev,
            [postId]: Math.max(0, currentLikeCount - 1)
          }));
          setUserBlogPostLikes(prev => ({
            ...prev,
            [postId]: false
          }));
        } else {
          // User is adding a like
          setBlogPostLikeCounts(prev => ({
            ...prev,
            [postId]: currentLikeCount + 1
          }));
          setUserBlogPostLikes(prev => ({
            ...prev,
            [postId]: true
          }));
        }
      } else {
        alert('Failed to update like status');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to update like status');
    } finally {
      setTogglingLike(null);
    }
  };

  const handleEditPost = (post: BlogPost) => {
    setSelectedPost(null); // Close the detailed post view
    setPostToEdit(post);
    setIsCreatePostOpen(true);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteBlogPost(postId);
      fetchPosts(); // Refresh the list
      if (selectedPost?.id === postId) {
        setSelectedPost(null); // Close the post detail view if it's the deleted post
      }
    } catch (error) {
      console.error('Error deleting blog post:', error);
      alert('Failed to delete blog post. Please try again.');
    }
  };

  const filteredAndSortedPosts = posts
    .filter(post =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author_username.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // First, always sort by editor's choice status
      if (a.is_editor_choice && !b.is_editor_choice) return -1;
      if (!a.is_editor_choice && b.is_editor_choice) return 1;
      
      // Then sort by the selected criteria
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'most-liked') {
        const aLikes = blogPostLikeCounts[a.id] || 0;
        const bLikes = blogPostLikeCounts[b.id] || 0;
        // Sort by likes descending, then by newest if likes are equal
        if (bLikes === aLikes) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return bLikes - aLikes;
      }
      return 0;
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCommentDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    // Strip HTML tags for preview
    const textContent = content.replace(/<[^>]*>/g, '');
    if (textContent.length <= maxLength) return textContent;
    return textContent.substring(0, maxLength) + '...';
  };

  const canDeletePost = (post: BlogPost) => {
    return post.author_username === currentUser || isAdminUser;
  };

  const canEditPost = (post: BlogPost) => {
    return post.author_username === currentUser || isAdminUser;
  };

  const handleUserProfileClick = (username: string) => {
    // Only allow profile clicks for non-guest users
    if (!isGuestUser(username)) {
      onClose(); // Close the blog modal first
      onOpenUserProfile(username); // Then open the user profile
    }
  };

  if (!isOpen) return null;

  // Post detail view
  if (selectedPost) {
    const authorProfilePicture = profilePictureCache[selectedPost.author_username];
    const postLikeCount = blogPostLikeCounts[selectedPost.id] || 0;
    const userHasLiked = userBlogPostLikes[selectedPost.id] || false;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="glass-header p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 icon-shadow-white-sm" />
                </button>
                <div className="flex items-center space-x-3">
                  {isGuestUser(selectedPost.author_username) ? (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUserProfileClick(selectedPost.author_username)}
                      className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center hover:scale-105 transition-transform overflow-hidden"
                    >
                      {authorProfilePicture ? (
                        <img
                          src={authorProfilePicture}
                          alt={`${selectedPost.author_username}'s profile`}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                    </button>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-shadow-white-md line-clamp-1">
                      {selectedPost.title}
                    </h2>
                    <div className="flex items-center space-x-2 text-blue-100 text-sm text-shadow-white-sm">
                      <span>by</span>
                      {isGuestUser(selectedPost.author_username) ? (
                        <span>Guest {selectedPost.author_username}</span>
                      ) : (
                        <button
                          onClick={() => handleUserProfileClick(selectedPost.author_username)}
                          className="hover:underline transition-all"
                        >
                          {selectedPost.author_username}
                        </button>
                      )}
                      <span>•</span>
                      <span>{formatDate(selectedPost.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Like Button */}
                <button
                  onClick={() => handleToggleLike(selectedPost.id)}
                  disabled={togglingLike === selectedPost.id}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    userHasLiked
                      ? 'bg-red-600/20 border border-red-500/50 text-red-300'
                      : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                  } ${togglingLike === selectedPost.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {togglingLike === selectedPost.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Heart
                      className={`w-4 h-4 ${userHasLiked ? 'fill-current' : ''}`}
                    />
                  )}
                  <span className="text-sm font-medium">{postLikeCount}</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 icon-shadow-white-sm" />
                </button>
              </div>
            </div>
          </div>

          {/* Post Content and Comments */}
          <div className="flex-1 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Post Content */}
            <div className="p-6 border-b border-gray-700">
              <div className="prose prose-invert max-w-none">
                <div 
                  className="text-gray-200 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                />
              </div>
              
              {/* Post Stats */}
              <div className="mt-8 pt-6 border-t border-gray-700">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span>{postLikeCount} likes</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{comments.length} comments</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{selectedPost.view_count} views</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Published {formatDate(selectedPost.created_at)}</span>
                    </div>
                  </div>
                  {(canEditPost(selectedPost) || canDeletePost(selectedPost)) && (
                    <div className="flex items-center space-x-2">
                      {canEditPost(selectedPost) && (
                        <button
                          onClick={() => handleEditPost(selectedPost)}
                          className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          title={isAdminUser && selectedPost.author_username !== currentUser ? "Edit post (Admin)" : "Edit your post"}
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                      {canDeletePost(selectedPost) && (
                        <button
                          onClick={() => handleDeletePost(selectedPost.id)}
                          className="flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          title={isAdminUser && selectedPost.author_username !== currentUser ? "Delete post (Admin)" : "Delete your post"}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-200 flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5" />
                  <span>Comments ({comments.length})</span>
                </h3>
              </div>

              {/* Add Comment Form */}
              {currentUser && (
                <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-start space-x-3">
                    {/* Current User Avatar */}
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {profilePictureCache[currentUser] ? (
                        <img
                          src={profilePictureCache[currentUser]!}
                          alt="Your profile"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                    </div>

                {/* Selected File Preview */}
                {selectedCommentFile && (
                  <div className="mb-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Image className="w-5 h-5 text-blue-400" />
                        <span className="text-sm text-gray-200 truncate">
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
                        <X className="w-4 h-4 text-red-400 hover:text-white" />
                      </button>
                    </div>
                  </div>
                )}

                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                      placeholder={selectedCommentFile ? "Add a caption (optional)..." : "Write a comment..."}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400 resize-none"
                      />
                      <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center justify-between mt-3">
                          {newComment.length}/1000 characters
                        </div>
                        <button
                      <div className="flex items-center space-x-2">
                        {/* File Upload Button */}
                        <button
                          onClick={() => commentFileInputRef.current?.click()}
                          disabled={!isAuthenticated || isUploadingCommentFile}
                          className="p-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 rounded-lg transition-colors"
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

                        {/* Submit Button */}
                        <button
                          onClick={handleSubmitComment}
                          disabled={(!newComment.trim() && !selectedCommentFile) || submittingComment || isUploadingCommentFile}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                          {submittingComment || isUploadingCommentFile ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          <span>
                            {isUploadingCommentFile ? 'Uploading...' : submittingComment ? 'Posting...' : 'Post Comment'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments List */}
              {loadingComments ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-400">Loading comments...</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No comments yet</p>
                  <p className="text-sm">Be the first to share your thoughts!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => {
                    const commentProfilePicture = profilePictureCache[comment.username];
                    const canDelete = canDeleteComment(comment);
                    const isDeleting = deletingComment === comment.id;

                    return (
                      <div key={comment.id} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          {/* Commenter Avatar */}
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {isGuestUser(comment.username) ? (
                              <User className="w-4 h-4 text-white" />
                            ) : (
                              <>
                                {commentProfilePicture ? (
                                  <img
                                    src={commentProfilePicture}
                                    alt={`${comment.username}'s profile`}
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                ) : (
                                  <User className="w-4 h-4 text-white" />
                                )}
                              </>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Comment Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {isGuestUser(comment.username) ? (
                                  <span className="font-medium text-gray-200">
                                    Guest {comment.username}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleUserProfileClick(comment.username)}
                                    className="font-medium text-gray-200 hover:text-blue-400 transition-colors"
                                  >
                                    {comment.username}
                                  </button>
                                )}
                                <span className="text-xs text-gray-400">
                                  {formatCommentDate(comment.created_at)}
                                </span>
                              </div>

                              {/* Delete Button */}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={isDeleting}
                                  className="p-1 hover:bg-red-600 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                  title={isAdminUser && comment.username !== currentUser ? "Delete comment (Admin)" : "Delete your comment"}
                                >
                                  {isDeleting ? (
                                    <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Trash2 className="w-3 h-3 text-red-400 hover:text-white" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Comment Text */}
                            <div className="space-y-2">
                              {/* Media content */}
                              {comment.media_url && (
                                <div>
                                  <img
                                    src={comment.media_url}
                                    alt="Comment media"
                                    className="max-w-full h-auto rounded-lg"
                                    style={{ maxHeight: '200px' }}
                                  />
                                </div>
                              )}
                              
                              {/* Text content */}
                              {comment.text && (
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                                  {comment.text}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="glass-header p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 glass-white rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600 icon-shadow-white-sm" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-shadow-white-md">Community Blog</h2>
                  <p className="text-blue-100 text-sm text-shadow-white-sm">
                    Read and share stories from the community
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isAuthenticated && (
                  <button
                    onClick={() => setIsCreatePostOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Write Post</span>
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
                  placeholder="Search posts..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'most-liked')}
                  className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="most-liked">Most Liked</option>
                </select>
              </div>

              {/* Filter */}
              {isAuthenticated && (
                <div className="flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as 'all' | 'my-posts')}
                    className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200"
                  >
                    <option value="all">All Posts</option>
                    <option value="my-posts">My Posts</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Posts Grid */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredAndSortedPosts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">
                  {searchTerm ? 'No posts found' : filterBy === 'my-posts' ? 'No posts created yet' : 'No blog posts yet'}
                </p>
                <p className="text-sm">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : filterBy === 'my-posts'
                      ? 'Create your first blog post!'
                      : isAuthenticated 
                        ? 'Be the first to write a blog post!' 
                        : 'Sign in to start writing blog posts'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedPosts.map((post) => {
                  const authorProfilePicture = profilePictureCache[post.author_username];
                  const postLikeCount = blogPostLikeCounts[post.id] || 0;
                  const userHasLiked = userBlogPostLikes[post.id] || false;

                  return (
                    <div
                      key={post.id}
                      className={`bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:bg-gray-700 transition-all duration-200 group cursor-pointer ${
                        post.is_editor_choice ? 'editor-choice-border' : ''
                      }`}
                      onClick={() => setSelectedPost(post)}
                    >
                      {/* Editor's Choice Badge */}
                      {post.is_editor_choice && (
                        <div className="relative">
                          <div className="absolute top-2 right-2 z-10">
                            <span className="editor-choice-badge px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                              <Cross className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="p-6">
                        {/* Post Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            {isGuestUser(post.author_username) ? (
                              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <User className="w-3 h-3 text-white" />
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUserProfileClick(post.author_username);
                                }}
                                className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center hover:scale-105 transition-transform overflow-hidden"
                              >
                                {authorProfilePicture ? (
                                  <img
                                    src={authorProfilePicture}
                                    alt={`${post.author_username}'s profile`}
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                ) : (
                                  <User className="w-3 h-3 text-white" />
                                )}
                              </button>
                            )}
                            {isGuestUser(post.author_username) ? (
                              <span className="text-sm text-gray-400">Guest {post.author_username}</span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUserProfileClick(post.author_username);
                                }}
                                className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
                              >
                                {post.author_username}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(post.created_at)}</span>
                            </div>
                            {/* Admin Editor's Choice Toggle */}
                            {isAdminUser && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleEditorChoice(post.id, !!post.is_editor_choice);
                                  }}
                                  disabled={togglingEditorChoice === post.id}
                                  className={`p-1 rounded-full transition-colors ${
                                    post.is_editor_choice
                                      ? 'text-yellow-400 hover:text-yellow-300 bg-yellow-900/20'
                                      : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-900/20'
                                  }`}
                                  title={post.is_editor_choice ? "Remove from Editor's Choice" : "Set as Editor's Choice"}
                                >
                                  {togglingEditorChoice === post.id ? (
                                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Cross className={`w-3 h-3 ${post.is_editor_choice ? 'fill-current' : ''}`} />
                                  )}
                                </button>
                              </div>
                            )}
                            {(canEditPost(post) || canDeletePost(post)) && (
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canEditPost(post) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditPost(post);
                                    }}
                                    className="p-1 hover:bg-blue-600 rounded-full transition-colors"
                                    title={isAdminUser && post.author_username !== currentUser ? "Edit post (Admin)" : "Edit your post"}
                                  >
                                    <Edit className="w-3 h-3 text-blue-400 hover:text-white" />
                                  </button>
                                )}
                                {canDeletePost(post) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePost(post.id);
                                    }}
                                    className="p-1 hover:bg-red-600 rounded-full transition-colors"
                                    title={isAdminUser && post.author_username !== currentUser ? "Delete post (Admin)" : "Delete your post"}
                                  >
                                    <Trash2 className="w-3 h-3 text-red-400 hover:text-white" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-semibold text-gray-200 mb-3 line-clamp-2 group-hover:text-gray-100 transition-colors">
                          {post.title}
                        </h3>

                        {/* Excerpt */}
                        <p className="text-sm text-gray-300 line-clamp-3 mb-4">
                          {post.excerpt || truncateContent(post.content)}
                        </p>

                        {/* Post Stats */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Heart className="w-3 h-3" />
                              <span>{postLikeCount}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Eye className="w-3 h-3" />
                              <span>{post.view_count}</span>
                            </div>
                            {!post.is_published && (
                              <span className="px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded-full">
                                Draft
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Like Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleLike(post.id);
                              }}
                              disabled={togglingLike === post.id}
                              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-all duration-200 ${
                                userHasLiked
                                  ? 'bg-red-600/20 border border-red-500/50 text-red-300'
                                  : 'bg-gray-700 border border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-red-300'
                              } ${togglingLike === post.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {togglingLike === post.id ? (
                                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Heart
                                  className={`w-3 h-3 ${userHasLiked ? 'fill-current' : ''}`}
                                />
                              )}
                            </button>
                            <span className="text-xs text-blue-400 group-hover:text-blue-300 transition-colors">
                              Read more →
                            </span>
                          </div>
                        </div>
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
              Showing {filteredAndSortedPosts.length} of {posts.length} posts
              {filterBy === 'my-posts' && (
                <span className="ml-2 text-blue-400">• Your posts</span>
              )}
              {sortBy === 'most-liked' && (
                <span className="ml-2 text-red-400">• Sorted by most liked</span>
              )}
              {isAdminUser && (
                <span className="ml-2 text-yellow-400">• Admin: Click ✞ to set Editor's Choice</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Blog Post Modal */}
      <CreateBlogPostModal
        isOpen={isCreatePostOpen}
        onClose={() => {
          setIsCreatePostOpen(false);
          setPostToEdit(null);
        }}
        onSuccess={() => {
          setIsCreatePostOpen(false);
          setPostToEdit(null);
          fetchPosts();
        }}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        initialPost={postToEdit}
      />
    </>
  );
};

export default BlogModal;