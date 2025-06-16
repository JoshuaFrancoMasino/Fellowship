import React, { useState, useEffect } from 'react';
import { X, BookOpen, Search, Plus, Calendar, User, Eye, Edit, Trash2, Filter } from 'lucide-react';
import { BlogPost, getBlogPosts, getUserBlogPosts, deleteBlogPost, getCurrentUserProfile, getProfileByUsername } from '../../lib/supabase';
import CreateBlogPostModal from './CreateBlogPostModal';

interface BlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  isAuthenticated: boolean;
  onOpenUserProfile: (username: string) => void;
}

const BlogModal: React.FC<BlogModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAuthenticated,
  onOpenUserProfile,
}) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'my-posts'>('all');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [postToEdit, setPostToEdit] = useState<BlogPost | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [profilePictureCache, setProfilePictureCache] = useState<{ [key: string]: string | null }>({});

  // Check if username is a guest user (7-digit number)
  const isGuestUser = (username: string) => username.match(/^\d{7}$/);

  useEffect(() => {
    if (isOpen) {
      fetchPosts();
      checkAdminStatus();
    }
  }, [isOpen, filterBy, currentUser, isAuthenticated]);

  useEffect(() => {
    if (posts.length > 0) {
      fetchProfilePictures();
    }
  }, [posts]);

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

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.author_username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
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
      onOpenUserProfile(username);
    }
  };

  if (!isOpen) return null;

  // Post detail view
  if (selectedPost) {
    const authorProfilePicture = profilePictureCache[selectedPost.author_username];

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
                  <X className="w-5 h-5 icon-shadow-white-sm" />
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
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 icon-shadow-white-sm" />
              </button>
            </div>
          </div>

          {/* Post Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
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
            ) : filteredPosts.length === 0 ? (
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
                {filteredPosts.map((post) => {
                  const authorProfilePicture = profilePictureCache[post.author_username];

                  return (
                    <div
                      key={post.id}
                      className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:bg-gray-700 transition-all duration-200 group cursor-pointer"
                      onClick={() => setSelectedPost(post)}
                    >
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
                              <Eye className="w-3 h-3" />
                              <span>{post.view_count}</span>
                            </div>
                            {!post.is_published && (
                              <span className="px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded-full">
                                Draft
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-blue-400 group-hover:text-blue-300 transition-colors">
                            Read more →
                          </span>
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
              Showing {filteredPosts.length} of {posts.length} posts
              {filterBy === 'my-posts' && (
                <span className="ml-2 text-blue-400">• Your posts</span>
              )}
              {isAdminUser && (
                <span className="ml-2 text-red-400">• Admin privileges enabled</span>
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