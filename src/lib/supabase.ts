import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise provide placeholder values
// In production, these should be set via environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Debug logging to check environment variables
console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Supabase Anon Key:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING');
console.log('🔧 Supabase client will be created:', !!(supabaseUrl && supabaseAnonKey));

// Create Supabase client only if we have valid credentials
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Pin = {
  id: string;
  username: string;
  lat: number;
  lng: number;
  description: string;
  images: string[];
  pin_color?: string;
  storage_paths?: string[];
  is_authenticated?: boolean;
  is_editor_choice?: boolean;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  // New location fields
  continent?: string;
  country?: string;
  state?: string;
  locality?: string;
};

export type Like = {
  id: string;
  username: string;
  pin_id: string;
  image_index: number;
  created_at: string;
};

export type Comment = {
  id: string;
  username: string;
  pin_id: string;
  text: string;
  media_url?: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  pin_id: string;
  username: string;
  message: string;
  media_url?: string;
  created_at: string;
};

export type ChatMessageLike = {
  id: string;
  message_id: string;
  username: string;
  created_at: string;
};

export type Profile = {
  id: string;
  username: string;
  role: 'user' | 'admin';
  contact_info?: string;
  about_me?: string;
  profile_picture_url?: string;
  banner_url?: string;
  created_at: string;
  updated_at: string;
};

export type PublicProfile = {
  id: string;
  username: string;
  profile_picture_url?: string;
  about_me?: string;
  contact_info?: string;
  created_at: string;
};

export type MarketplaceItem = {
  id: string;
  seller_username: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  storage_paths: string[];
  is_editor_choice?: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type BlogPost = {
  id: string;
  author_username: string;
  title: string;
  content: string;
  excerpt?: string;
  is_editor_choice?: boolean;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  view_count: number;
};

export type BlogPostLike = {
  id: string;
  blog_post_id: string;
  username: string;
  created_at: string;
};

export type BlogPostComment = {
  id: string;
  blog_post_id: string;
  username: string;
  text: string;
  media_url?: string;
  created_at: string;
};

export type Notification = {
  id: string;
  recipient_username: string;
  sender_username: string;
  type: 'like' | 'comment' | 'message';
  entity_type: 'pin' | 'blog_post' | 'marketplace_item' | 'chat_message';
  entity_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export const getCurrentUserProfile = async (): Promise<Profile | null> => {
  if (!supabase) return null;
  
  try {
    console.log('🔍 Checking for authenticated user...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return null;
    }

    console.log('✅ User authenticated, fetching profile for:', user.id);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('❌ Error fetching user profile:', error);
      return null;
    }

    if (!profile) {
      console.log('❌ No profile found for user:', user.id);
      return null;
    }

    console.log('✅ Profile fetched successfully:', profile);
    return profile;
  } catch (err) {
    console.error('💥 Unexpected error in getCurrentUserProfile:', err);
    return null;
  }
};

export const getProfileByUsername = async (username: string): Promise<PublicProfile | null> => {
  if (!supabase) return null;
  
  try {
    // Use the public_profiles view for public access to profile data
    const { data, error } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('username', username);

    if (error) {
      console.error('❌ Error fetching public profile by username:', error);
      return null;
    }

    // Check if we have data and at least one result
    if (data && data.length > 0) {
      return data[0];
    }

    return null;
  } catch (err) {
    console.error('💥 Unexpected error in getProfileByUsername:', err);
    return null;
  }
};

export const updateUserProfile = async (userId: string, profileData: Partial<Profile>): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return !error;
  } catch (err) {
    console.error('Error updating profile:', err);
    return false;
  }
};

export const getUserPins = async (username: string): Promise<Pin[]> => {
  if (!supabase) return [];
  
  const { data: pins } = await supabase
    .from('pins')
    .select('*')
    .eq('username', username)
    .order('created_at', { ascending: false });

  return pins || [];
};

// Tribe colors mapping
export const TRIBE_COLORS = {
  'Reuben': '#FF6B6B',     // Red
  'Simeon': '#4ECDC4',     // Teal
  'Levi': '#45B7D1',       // Blue
  'Judah': '#96CEB4',      // Green
  'Dan': '#FFEAA7',        // Yellow
  'Naphtali': '#DDA0DD',   // Plum
  'Gad': '#98D8C8',        // Mint
  'Asher': '#F7DC6F',      // Gold
  'Issachar': '#BB8FCE',   // Lavender
  'Zebulun': '#85C1E9',    // Sky Blue
  'Joseph': '#F8C471',     // Orange
  'Benjamin': '#82E0AA'    // Light Green
} as const;

export type TribeName = keyof typeof TRIBE_COLORS;

// Upload image to Supabase Storage - now supports multiple buckets
export const uploadImage = async (file: File, userId: string, bucketName: string = 'pin-images'): Promise<string | null> => {
  if (!supabase) return null;
  
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    return data.path;
  } catch (err) {
    console.error('Failed to upload image:', err);
    return null;
  }
};

// Get public URL for uploaded image - now supports multiple buckets
export const getImageUrl = (path: string, bucketName: string = 'pin-images'): string => {
  if (!supabase) return '';
  
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

// Delete image from storage - now supports multiple buckets
export const deleteImage = async (path: string, bucketName: string = 'pin-images'): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path]);

    return !error;
  } catch (err) {
    console.error('Failed to delete image:', err);
    return false;
  }
};

// Chat message like functions
export const toggleChatMessageLike = async (messageId: string, username: string): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    console.log('❤️ Toggling message like:', { messageId, username });
    
    // Check if like already exists
    const { data: existingLike, error: selectError } = await supabase
      .from('chat_message_likes')
      .select('id')
      .eq('message_id', messageId)
      .eq('username', username)
      .maybeSingle();

    if (selectError) {
      console.error('❌ Error checking existing chat message like:', selectError);
      return false;
    }

    if (existingLike) {
      // Remove like
      console.log('👎 Removing existing like...');
      const { error: deleteError } = await supabase
        .from('chat_message_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('❌ Error deleting chat message like:', deleteError);
        return false;
      }
      
      console.log('✅ Chat message like removed successfully');
      return true;
    } else {
      // Add like
      console.log('👍 Adding new like...');
      const { error: insertError } = await supabase
        .from('chat_message_likes')
        .insert([
          {
            message_id: messageId,
            username: username,
          }
        ]);

      if (insertError) {
        console.error('❌ Error inserting chat message like:', insertError);
        return false;
      }
      
      console.log('✅ Chat message like added successfully');
      return true;
    }
  } catch (err) {
    console.error('💥 Failed to toggle chat message like:', err);
    return false;
  }
};

export const getChatMessageLikeCounts = async (messageIds: string[]): Promise<{ [key: string]: number }> => {
  if (!supabase || messageIds.length === 0) return {};
  
  try {
    console.log('🔢 Fetching chat message like counts for:', messageIds.length, 'messages');
    
    const { data, error } = await supabase
      .from('chat_message_likes')
      .select('message_id')
      .in('message_id', messageIds);

    if (error) {
      console.error('❌ Error fetching chat message like counts:', error);
      return {};
    }

    // Count likes per message
    const likeCounts: { [key: string]: number } = {};
    data?.forEach(like => {
      likeCounts[like.message_id] = (likeCounts[like.message_id] || 0) + 1;
    });

    console.log('✅ Chat message like counts fetched:', likeCounts);
    return likeCounts;
  } catch (err) {
    console.error('💥 Failed to fetch chat message like counts:', err);
    return {};
  }
};

export const getUserChatMessageLikes = async (messageIds: string[], username: string): Promise<{ [key: string]: boolean }> => {
  if (!supabase || messageIds.length === 0) return {};
  
  try {
    console.log('👤 Fetching user chat message likes for:', username, 'on', messageIds.length, 'messages');
    
    const { data, error } = await supabase
      .from('chat_message_likes')
      .select('message_id')
      .in('message_id', messageIds)
      .eq('username', username);

    if (error) {
      console.error('❌ Error fetching user chat message likes:', error);
      return {};
    }

    // Create lookup for user's likes
    const userLikes: { [key: string]: boolean } = {};
    data?.forEach(like => {
      userLikes[like.message_id] = true;
    });

    console.log('✅ User chat message likes fetched:', userLikes);
    return userLikes;
  } catch (err) {
    console.error('💥 Failed to fetch user chat message likes:', err);
    return {};
  }
};

// Marketplace functions
export const getMarketplaceItems = async (): Promise<MarketplaceItem[]> => {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('is_active', true)
      .order('is_editor_choice', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching marketplace items:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch marketplace items:', err);
    return [];
  }
};

export const createMarketplaceItem = async (
  title: string,
  description: string,
  price: number,
  images: string[],
  storagePaths: string[]
): Promise<MarketplaceItem | null> => {
  if (!supabase) return null;
  
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('marketplace_items')
      .insert([
        {
          seller_username: profile.username,
          title: title.trim(),
          description: description.trim(),
          price,
          images,
          storage_paths: storagePaths,
          is_active: true,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating marketplace item:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err: any) {
    console.error('Failed to create marketplace item:', err);
    throw err;
  }
};

export const updateMarketplaceItem = async (
  itemId: string,
  updates: Partial<MarketplaceItem>
): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('marketplace_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    return !error;
  } catch (err) {
    console.error('Failed to update marketplace item:', err);
    return false;
  }
};

export const deleteMarketplaceItem = async (itemId: string): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('marketplace_items')
      .delete()
      .eq('id', itemId);

    return !error;
  } catch (err) {
    console.error('Failed to delete marketplace item:', err);
    return false;
  }
};

export const getUserMarketplaceItems = async (username: string): Promise<MarketplaceItem[]> => {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('seller_username', username)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user marketplace items:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch user marketplace items:', err);
    return [];
  }
};

// Blog post functions
export const getBlogPosts = async (publishedOnly: boolean = true): Promise<BlogPost[]> => {
  if (!supabase) return [];
  
  try {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('is_editor_choice', { ascending: false })
      .order('created_at', { ascending: false });

    if (publishedOnly) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching blog posts:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch blog posts:', err);
    return [];
  }
};

export const getUserBlogPosts = async (username: string): Promise<BlogPost[]> => {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('author_username', username)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user blog posts:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch user blog posts:', err);
    return [];
  }
};

export const createBlogPost = async (
  title: string,
  content: string,
  isPublished: boolean = false
): Promise<BlogPost | null> => {
  if (!supabase) return null;
  
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .insert([
        {
          author_username: profile.username,
          title: title.trim(),
          content: content.trim(),
          is_published: isPublished,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating blog post:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err: any) {
    console.error('Failed to create blog post:', err);
    throw err;
  }
};

export const updateBlogPost = async (
  postId: string,
  updates: Partial<BlogPost>
): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('blog_posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    return !error;
  } catch (err) {
    console.error('Failed to update blog post:', err);
    return false;
  }
};

export const deleteBlogPost = async (postId: string): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', postId);

    return !error;
  } catch (err) {
    console.error('Failed to delete blog post:', err);
    return false;
  }
};

export const getBlogPost = async (postId: string): Promise<BlogPost | null> => {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) {
      console.error('Error fetching blog post:', error);
      return null;
    }

    // Increment view count
    if (data) {
      await supabase
        .from('blog_posts')
        .update({ view_count: data.view_count + 1 })
        .eq('id', postId);
    }

    return data;
  } catch (err) {
    console.error('Failed to fetch blog post:', err);
    return null;
  }
};

// Blog post like functions
export const toggleBlogPostLike = async (blogPostId: string, username: string): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    let wasLiked = false;
    
    // Check if like already exists
    const { data: existingLike, error: selectError } = await supabase
      .from('blog_post_likes')
      .select('id')
      .eq('blog_post_id', blogPostId)
      .eq('username', username)
      .maybeSingle();

    if (selectError) {
      console.error('Error checking existing blog post like:', selectError);
      return false;
    }

    if (existingLike) {
      // Remove like
      const { error: deleteError } = await supabase
        .from('blog_post_likes')
        .delete()
        .eq('id', existingLike.id);

      wasLiked = false;
      if (deleteError) return false;
    } else {
      // Add like
      const { error: insertError } = await supabase
        .from('blog_post_likes')
        .insert([
          {
            blog_post_id: blogPostId,
            username: username,
          }
        ]);

      wasLiked = true;
      if (insertError) return false;
      
      // Create notification for blog post author if this is a new like
      const { data: blogPost } = await supabase
        .from('blog_posts')
        .select('author_username, title')
        .eq('id', blogPostId)
        .single();
      
      if (blogPost && blogPost.author_username !== username) {
        await createNotification(
          blogPost.author_username,
          username,
          'like',
          'blog_post',
          blogPostId,
          `${username} liked your blog post "${blogPost.title}"`
        );
      }
    }
    
    return true;
  } catch (err) {
    console.error('Failed to toggle blog post like:', err);
    return false;
  }
};

export const getBlogPostLikeCounts = async (blogPostIds: string[]): Promise<{ [key: string]: number }> => {
  if (!supabase || blogPostIds.length === 0) return {};
  
  try {
    const { data, error } = await supabase
      .from('blog_post_likes')
      .select('blog_post_id')
      .in('blog_post_id', blogPostIds);

    if (error) {
      console.error('Error fetching blog post like counts:', error);
      return {};
    }

    // Count likes per blog post
    const likeCounts: { [key: string]: number } = {};
    data?.forEach(like => {
      likeCounts[like.blog_post_id] = (likeCounts[like.blog_post_id] || 0) + 1;
    });

    return likeCounts;
  } catch (err) {
    console.error('Failed to fetch blog post like counts:', err);
    return {};
  }
};

export const getUserBlogPostLikes = async (blogPostIds: string[], username: string): Promise<{ [key: string]: boolean }> => {
  if (!supabase || blogPostIds.length === 0) return {};
  
  try {
    const { data, error } = await supabase
      .from('blog_post_likes')
      .select('blog_post_id')
      .in('blog_post_id', blogPostIds)
      .eq('username', username);

    if (error) {
      console.error('Error fetching user blog post likes:', error);
      return {};
    }

    // Create lookup for user's likes
    const userLikes: { [key: string]: boolean } = {};
    data?.forEach(like => {
      userLikes[like.blog_post_id] = true;
    });

    return userLikes;
  } catch (err) {
    console.error('Failed to fetch user blog post likes:', err);
    return {};
  }
};

// Blog post comment functions
export const getBlogPostComments = async (blogPostId: string): Promise<BlogPostComment[]> => {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('blog_post_comments')
      .select('*')
      .eq('blog_post_id', blogPostId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching blog post comments:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch blog post comments:', err);
    return [];
  }
};

export const createBlogPostComment = async (
  blogPostId: string,
  username: string,
  text: string,
  mediaUrl?: string
): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('blog_post_comments')
      .insert([
        {
          blog_post_id: blogPostId,
          username: username.trim(),
          text: text.trim(),
          media_url: mediaUrl || null,
        }
      ]);

    if (error) {
      console.error('Error creating blog post comment:', error);
      return false;
    }

    // Create notification for the blog post author
    const { data: blogPost } = await supabase
      .from('blog_posts')
      .select('author_username, title')
      .eq('id', blogPostId)
      .single();
    
    if (blogPost && blogPost.author_username !== username) {
      await createNotification(
        blogPost.author_username,
        username,
        'comment',
        'blog_post',
        blogPostId,
        `${username} commented on your blog post "${blogPost.title}"`
      );
    }

    return true;
  } catch (err) {
    console.error('Failed to create blog post comment:', err);
    return false;
  }
};

export const deleteBlogPostComment = async (commentId: string): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('blog_post_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting blog post comment:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to delete blog post comment:', err);
    return false;
  }
};

// Pin update function
export const updatePin = async (
  pinId: string,
  updates: Partial<Pin>
): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('pins')
      .update(updates)
      .eq('id', pinId);

    return !error;
  } catch (err) {
    console.error('Failed to update pin:', err);
    return false;
  }
};

// Notification functions
export const createNotification = async (
  recipientUsername: string,
  senderUsername: string,
  type: 'like' | 'comment' | 'message',
  entityType: 'pin' | 'blog_post' | 'marketplace_item' | 'chat_message',
  entityId: string,
  message: string
): Promise<boolean> => {
  if (!supabase || recipientUsername === senderUsername) return false;
  
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([
        {
          recipient_username: recipientUsername,
          sender_username: senderUsername,
          type,
          entity_type: entityType,
          entity_id: entityId,
          message,
        }
      ]);

    return !error;
  } catch (err) {
    console.error('Failed to create notification:', err);
    return false;
  }
};

export const getNotificationsForUser = async (username: string, isRead?: boolean): Promise<Notification[]> => {
  if (!supabase) return [];
  
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_username', username)
      .order('created_at', { ascending: false });

    if (isRead !== undefined) {
      query = query.eq('is_read', isRead);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    return [];
  }
};

export const getUnreadNotificationCount = async (username: string): Promise<number> => {
  if (!supabase) return 0;
  
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_username', username)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread notification count:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Failed to fetch unread notification count:', err);
    return 0;
  }
};

export const getUnreadNotificationCountByType = async (username: string, entityType?: string): Promise<number> => {
  if (!supabase) return 0;
  
  try {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_username', username)
      .eq('is_read', false);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error fetching unread notification count by type:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Failed to fetch unread notification count by type:', err);
    return 0;
  }
};
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    return !error;
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
    return false;
  }
};

export const markAllNotificationsAsRead = async (username: string): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_username', username)
      .eq('is_read', false);

    return !error;
  } catch (err) {
    console.error('Failed to mark all notifications as read:', err);
    return false;
  }
};

export const deleteNotification = async (notificationId: string): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    return !error;
  } catch (err) {
    console.error('Failed to delete notification:', err);
    return false;
  }
};