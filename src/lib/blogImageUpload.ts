import { supabase, uploadImage, getImageUrl, getCurrentUserProfile } from './supabase';

// Upload image specifically for blog posts
export const uploadBlogImage = async (file: File): Promise<string | null> => {
  if (!supabase) return null;
  
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select only image files');
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image size must be less than 5MB');
    }

    const profile = await getCurrentUserProfile();
    if (!profile) {
      throw new Error('Please sign in to upload images');
    }

    const path = await uploadImage(file, profile.id, 'blog-images');
    if (!path) {
      throw new Error('Failed to upload image');
    }

    const publicUrl = getImageUrl(path, 'blog-images');
    return publicUrl;
  } catch (error) {
    console.error('Error uploading blog image:', error);
    throw error;
  }
};

// Extract video ID from YouTube/Vimeo URLs
export const extractVideoId = (url: string): { type: 'youtube' | 'vimeo' | null; id: string | null } => {
  // YouTube patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  
  if (youtubeMatch) {
    return { type: 'youtube', id: youtubeMatch[1] };
  }

  // Vimeo patterns
  const vimeoRegex = /(?:vimeo\.com\/)([0-9]+)/;
  const vimeoMatch = url.match(vimeoRegex);
  
  if (vimeoMatch) {
    return { type: 'vimeo', id: vimeoMatch[1] };
  }

  return { type: null, id: null };
};

// Generate video embed HTML
export const generateVideoEmbed = (url: string): string | null => {
  const { type, id } = extractVideoId(url);
  
  if (!type || !id) return null;

  if (type === 'youtube') {
    return `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; margin: 1rem 0;">
      <iframe 
        src="https://www.youtube.com/embed/${id}" 
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    </div>`;
  }

  if (type === 'vimeo') {
    return `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; margin: 1rem 0;">
      <iframe 
        src="https://player.vimeo.com/video/${id}" 
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
        frameborder="0" 
        allow="autoplay; fullscreen; picture-in-picture" 
        allowfullscreen>
      </iframe>
    </div>`;
  }

  return null;
};

// Sanitize HTML content for safe display
export const sanitizeHtml = (html: string): string => {
  // This is a basic sanitization - in production, you'd want to use DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe[^>]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, (match) => {
      // Only allow YouTube and Vimeo iframes
      if (match.includes('youtube.com/embed/') || match.includes('player.vimeo.com/video/')) {
        return match;
      }
      return '';
    });
};

// Convert markdown to HTML (basic implementation)
export const markdownToHtml = (markdown: string): string => {
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]*)\]\(([^)]*)\)/gim, '<a href="$2">$1</a>')
    // Line breaks
    .replace(/\n/gim, '<br>');
};

// Get word count from HTML content
export const getWordCount = (html: string): number => {
  const text = html.replace(/<[^>]*>/g, '');
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Get character count from HTML content
export const getCharacterCount = (html: string): number => {
  const text = html.replace(/<[^>]*>/g, '');
  return text.length;
};