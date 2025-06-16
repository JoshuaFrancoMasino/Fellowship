import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, BookOpen, Save, Eye, EyeOff, AlertCircle, Upload, Video, Type, Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Quote, Link, Palette, FileText, RotateCcw, RotateCw, Maximize, Minimize } from 'lucide-react';
import { createBlogPost, updateBlogPost, BlogPost } from '../../lib/supabase';
import { uploadBlogImage, generateVideoEmbed, extractVideoId, getWordCount, getCharacterCount, markdownToHtml } from '../../lib/blogImageUpload';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  
  const quillRef = useRef<ReactQuill>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isEditMode = !!initialPost;

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!title.trim() || !content.trim() || !isAuthenticated || isSubmitting) return;

    setAutoSaveStatus('saving');
    try {
      if (isEditMode && initialPost) {
        await updateBlogPost(initialPost.id, {
          title: title.trim(),
          content: content.trim(),
          is_published: isPublished,
        });
      }
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus(null), 2000);
    } catch (error) {
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus(null), 3000);
    }
  }, [title, content, isPublished, isAuthenticated, isSubmitting, isEditMode, initialPost]);

  // Trigger auto-save on content changes
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [title, content, autoSave]);

  useEffect(() => {
    if (initialPost) {
      setTitle(initialPost.title);
      setContent(initialPost.content);
      setIsPublished(initialPost.is_published);
    } else {
      setTitle('');
      setContent('');
      setIsPublished(false);
    }
    setSubmitError(null);
    setShowPreview(false);
    setIsFullscreen(false);
    setIsMarkdownMode(false);
  }, [initialPost]);

  // Quill modules configuration
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: handleImageUpload,
        video: handleVideoEmbed,
      }
    },
    clipboard: {
      matchVisual: false,
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ];

  function handleImageUpload() {
    fileInputRef.current?.click();
  }

  function handleVideoEmbed() {
    setShowVideoInput(true);
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await uploadBlogImage(file);
      if (imageUrl && quillRef.current) {
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection();
        if (range) {
          quill.insertEmbed(range.index, 'image', imageUrl);
        }
      }
    } catch (error: any) {
      setSubmitError(error.message);
    }

    // Reset file input
    event.target.value = '';
  };

  const handleVideoUrlSubmit = () => {
    if (!videoUrl.trim()) return;

    const videoEmbed = generateVideoEmbed(videoUrl);
    if (videoEmbed && quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection();
      if (range) {
        quill.clipboard.dangerouslyPasteHTML(range.index, videoEmbed);
      }
    } else {
      setSubmitError('Invalid video URL. Please use YouTube or Vimeo URLs.');
    }

    setVideoUrl('');
    setShowVideoInput(false);
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setIsPublished(false);
    setSubmitError(null);
    setShowPreview(false);
    setIsFullscreen(false);
    setIsMarkdownMode(false);
    setAutoSaveStatus(null);
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
      const finalContent = isMarkdownMode ? markdownToHtml(content) : content;

      if (isEditMode && initialPost) {
        await updateBlogPost(initialPost.id, {
          title: title.trim(),
          content: finalContent.trim(),
          is_published: isPublished,
        });
      } else {
        await createBlogPost(title.trim(), finalContent.trim(), isPublished);
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

  const toggleMarkdownMode = () => {
    if (isMarkdownMode) {
      // Convert markdown to HTML
      setContent(markdownToHtml(content));
    } else {
      // Convert HTML to plain text (simplified)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      setContent(tempDiv.textContent || tempDiv.innerText || '');
    }
    setIsMarkdownMode(!isMarkdownMode);
  };

  const wordCount = getWordCount(content);
  const charCount = getCharacterCount(content);

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
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isFullscreen ? 'p-0' : ''}`}>
      <div className={`bg-gray-900 rounded-2xl shadow-2xl overflow-hidden ${isFullscreen ? 'w-screen h-screen rounded-none' : 'w-full max-w-6xl max-h-[95vh]'}`}>
        {/* Header */}
        <div className="glass-header p-4 text-white border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 glass-white rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600 icon-shadow-white-sm" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-shadow-white-md">
                  {isEditMode ? 'Edit Blog Post' : 'Create Blog Post'}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-blue-100">
                  <span>{wordCount} words</span>
                  <span>{charCount} characters</span>
                  {autoSaveStatus && (
                    <span className={`flex items-center space-x-1 ${
                      autoSaveStatus === 'saved' ? 'text-green-300' :
                      autoSaveStatus === 'saving' ? 'text-yellow-300' :
                      'text-red-300'
                    }`}>
                      {autoSaveStatus === 'saving' && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>}
                      <span>{autoSaveStatus === 'saved' ? 'Saved' : autoSaveStatus === 'saving' ? 'Saving...' : 'Error saving'}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Mode Toggle */}
              <button
                onClick={toggleMarkdownMode}
                className={`p-2 rounded-lg transition-colors ${
                  isMarkdownMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title="Toggle Markdown Mode"
              >
                <Type className="w-4 h-4" />
              </button>
              
              {/* Preview Toggle */}
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`p-2 rounded-lg transition-colors ${
                  showPreview ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title="Toggle Preview"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              
              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
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
        <div className={`flex flex-col ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'max-h-[calc(95vh-80px)]'}`}>
          {/* Error Message */}
          {submitError && (
            <div className="m-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <div className="flex items-center space-x-2 text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{submitError}</p>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="p-4 border-b border-gray-700">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your blog post title..."
              maxLength={200}
              className="w-full px-0 py-2 bg-transparent border-none focus:outline-none text-2xl font-bold text-gray-200 placeholder:text-gray-500 resize-none"
              style={{ fontFamily: 'inherit' }}
            />
            <div className="text-xs text-gray-400 mt-1">
              {title.length}/200 characters
            </div>
          </div>

          {/* Content Editor */}
          <div className="flex-1 flex">
            {/* Editor Side */}
            <div className={`${showPreview ? 'w-1/2 border-r border-gray-700' : 'w-full'} flex flex-col`}>
              {!isMarkdownMode ? (
                <div className="flex-1 bg-white">
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    modules={modules}
                    formats={formats}
                    placeholder="Start writing your blog post..."
                    style={{ height: '100%' }}
                    className="h-full"
                  />
                </div>
              ) : (
                <div className="flex-1 p-4">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write in Markdown..."
                    className="w-full h-full bg-gray-800 border border-gray-700 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400 resize-none font-mono text-sm"
                  />
                </div>
              )}
            </div>

            {/* Preview Side */}
            {showPreview && (
              <div className="w-1/2 overflow-y-auto bg-gray-800">
                <div className="p-6">
                  <h1 className="text-3xl font-bold text-gray-200 mb-6">{title || 'Blog Post Title'}</h1>
                  <div 
                    className="prose prose-invert max-w-none prose-headings:text-gray-200 prose-p:text-gray-300 prose-a:text-blue-400 prose-strong:text-gray-200 prose-code:text-gray-300 prose-pre:bg-gray-900"
                    dangerouslySetInnerHTML={{ 
                      __html: isMarkdownMode ? markdownToHtml(content) : content 
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Video Input Modal */}
          {showVideoInput && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="bg-gray-800 rounded-lg p-6 w-96">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">Embed Video</h3>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Enter YouTube or Vimeo URL"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200 placeholder:text-gray-400 mb-4"
                />
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowVideoInput(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVideoUrlSubmit}
                    disabled={!videoUrl.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Embed
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 bg-gray-900">
            <div className="flex items-center justify-between">
              {/* Publication Status */}
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
                  <span>Draft</span>
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
                  <span>Publish</span>
                </button>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!title.trim() || !content.trim() || isSubmitting}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSubmitting 
                      ? (isEditMode ? 'Updating...' : 'Publishing...') 
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

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default CreateBlogPostModal;