import React, { useState, useEffect } from 'react';
import { X, BookOpen, Save, Eye, EyeOff, AlertCircle, Link, Video, Code, Type } from 'lucide-react';
import { createBlogPost, updateBlogPost, BlogPost } from '../../lib/supabase';

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
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const isEditMode = !!initialPost;

  useEffect(() => {
    if (initialPost) {
      // Editing mode - populate form with existing data
      setTitle(initialPost.title);
      setContent(initialPost.content);
      setIsPublished(initialPost.is_published);
    } else {
      // Creating mode - reset form
      setTitle('');
      setContent('');
      setIsPublished(false);
    }
    setSubmitError(null);
    setShowPreview(false);
  }, [initialPost]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setIsPublished(false);
    setSubmitError(null);
    setShowPreview(false);
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
        await updateBlogPost(initialPost.id, {
          title: title.trim(),
          content: content.trim(),
          is_published: isPublished,
        });
      } else {
        // Create new post
        await createBlogPost(title.trim(), content.trim(), isPublished);
      }
      
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} blog post:`, error);
      setSubmitError(error.message || `Failed to ${isEditMode ? 'update' : 'create'} blog post. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const insertTemplate = (template: string) => {
    const textarea = document.getElementById('content-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + template + content.substring(end);
      setContent(newContent);
      
      // Set cursor position after the inserted template
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + template.length, start + template.length);
      }, 0);
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
                    Sign in to create blog posts
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
              You need to be signed in to create and publish blog posts.
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
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="glass-header p-6 text-white flex-shrink-0">
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
                  {isEditMode ? 'Update your blog post' : 'Share your thoughts with rich content'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {showPreview ? <Type className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showPreview ? 'Edit' : 'Preview'}</span>
              </button>
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Editor Side */}
          <div className={`${showPreview ? 'hidden lg:flex' : 'flex'} flex-col flex-1 p-6 overflow-y-auto`}>
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

            {/* Rich Content Toolbar */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Content * (HTML supported)
              </label>
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <button
                  type="button"
                  onClick={() => insertTemplate('<h2>Heading</h2>\n')}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm transition-colors flex items-center space-x-1"
                >
                  <Type className="w-3 h-3" />
                  <span>Heading</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertTemplate('<a href="https://example.com" target="_blank">Link Text</a>')}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm transition-colors flex items-center space-x-1"
                >
                  <Link className="w-3 h-3" />
                  <span>Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertTemplate('<iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe>\n')}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm transition-colors flex items-center space-x-1"
                >
                  <Video className="w-3 h-3" />
                  <span>YouTube</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertTemplate('<img src="https://example.com/image.jpg" alt="Description" style="max-width: 100%; height: auto;" />\n')}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm transition-colors flex items-center space-x-1"
                >
                  <Code className="w-3 h-3" />
                  <span>Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertTemplate('<blockquote style="border-left: 4px solid #3B82F6; padding-left: 16px; margin: 16px 0; font-style: italic;">Quote text here</blockquote>\n')}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm transition-colors"
                >
                  Quote
                </button>
              </div>
            </div>

            {/* Content Textarea */}
            <div className="mb-6 flex-1">
              <textarea
                id="content-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your blog post content here... You can use HTML tags for rich formatting:

Examples:
• <h2>Section Heading</h2>
• <p>Paragraph text with <strong>bold</strong> and <em>italic</em></p>
• <a href='https://example.com'>Link text</a>
• <img src='image-url' alt='description' />
• <iframe src='youtube-embed-url'></iframe>
• <blockquote>Quote text</blockquote>
• <ul><li>List item</li></ul>"
                maxLength={10000}
                rows={20}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-200 placeholder:text-gray-400 leading-relaxed font-mono text-sm"
              />
              <div className="text-xs text-gray-400 mt-1">
                {content.length}/10,000 characters
              </div>
            </div>

            {/* Publication Status */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-200 mb-3">
                Publication Status
              </label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
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
                  type="button"
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
                disabled={!title.trim() || !content.trim() || isSubmitting}
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

          {/* Preview Side */}
          {showPreview && (
            <div className="flex-1 p-6 bg-gray-800 border-l border-gray-700 overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Preview</h3>
                <div className="bg-gray-900 rounded-lg p-6">
                  {title && (
                    <h1 className="text-3xl font-bold text-gray-200 mb-6">{title}</h1>
                  )}
                  <div 
                    className="prose prose-invert prose-blue max-w-none prose-headings:text-gray-200 prose-p:text-gray-300 prose-a:text-blue-400 prose-strong:text-gray-200 prose-em:text-gray-300 prose-blockquote:border-blue-500 prose-blockquote:text-gray-300 prose-img:rounded-lg prose-video:rounded-lg"
                    dangerouslySetInnerHTML={{ __html: content || '<p class="text-gray-500 italic">Start writing to see preview...</p>' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateBlogPostModal;