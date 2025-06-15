import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function wipeAllData(): Promise<boolean> {
  try {
    console.log('🧹 Starting data wipe process...');
    console.log('⚠️  WARNING: This will delete ALL user-generated data!');
    console.log('─'.repeat(60));

    // Step 1: Delete likes (references pins)
    console.log('🗑️  Deleting likes...');
    const { error: likesError, count: likesCount } = await supabase
      .from('likes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (likesError) {
      console.error('❌ Error deleting likes:', likesError.message);
      return false;
    }
    console.log(`✅ Deleted ${likesCount || 0} likes`);

    // Step 2: Delete comments (references pins)
    console.log('🗑️  Deleting comments...');
    const { error: commentsError, count: commentsCount } = await supabase
      .from('comments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (commentsError) {
      console.error('❌ Error deleting comments:', commentsError.message);
      return false;
    }
    console.log(`✅ Deleted ${commentsCount || 0} comments`);

    // Step 3: Delete chat messages (references pins)
    console.log('🗑️  Deleting chat messages...');
    const { error: chatError, count: chatCount } = await supabase
      .from('chat_messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (chatError) {
      console.error('❌ Error deleting chat messages:', chatError.message);
      return false;
    }
    console.log(`✅ Deleted ${chatCount || 0} chat messages`);

    // Step 4: Delete pins
    console.log('🗑️  Deleting pins...');
    const { error: pinsError, count: pinsCount } = await supabase
      .from('pins')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (pinsError) {
      console.error('❌ Error deleting pins:', pinsError.message);
      return false;
    }
    console.log(`✅ Deleted ${pinsCount || 0} pins`);

    // Step 5: Delete marketplace items
    console.log('🗑️  Deleting marketplace items...');
    const { error: marketplaceError, count: marketplaceCount } = await supabase
      .from('marketplace_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (marketplaceError) {
      console.error('❌ Error deleting marketplace items:', marketplaceError.message);
      return false;
    }
    console.log(`✅ Deleted ${marketplaceCount || 0} marketplace items`);

    // Step 6: Delete blog posts
    console.log('🗑️  Deleting blog posts...');
    const { error: blogError, count: blogCount } = await supabase
      .from('blog_posts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (blogError) {
      console.error('❌ Error deleting blog posts:', blogError.message);
      return false;
    }
    console.log(`✅ Deleted ${blogCount || 0} blog posts`);

    // Step 7: Delete profiles (this will not delete auth.users entries)
    console.log('🗑️  Deleting user profiles...');
    const { error: profilesError, count: profilesCount } = await supabase
      .from('profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (profilesError) {
      console.error('❌ Error deleting profiles:', profilesError.message);
      return false;
    }
    console.log(`✅ Deleted ${profilesCount || 0} user profiles`);

    // Step 8: Clean up storage buckets (optional)
    console.log('🗑️  Cleaning up storage buckets...');
    
    try {
      // List and delete files from pin-images bucket
      const { data: pinImages } = await supabase.storage
        .from('pin-images')
        .list();

      if (pinImages && pinImages.length > 0) {
        const pinImagePaths = pinImages.map(file => file.name);
        const { error: pinImagesDeleteError } = await supabase.storage
          .from('pin-images')
          .remove(pinImagePaths);

        if (pinImagesDeleteError) {
          console.warn('⚠️  Warning: Could not delete some pin images:', pinImagesDeleteError.message);
        } else {
          console.log(`✅ Deleted ${pinImagePaths.length} pin images from storage`);
        }
      }

      // List and delete files from marketplace-images bucket
      const { data: marketplaceImages } = await supabase.storage
        .from('marketplace-images')
        .list();

      if (marketplaceImages && marketplaceImages.length > 0) {
        const marketplaceImagePaths = marketplaceImages.map(file => file.name);
        const { error: marketplaceImagesDeleteError } = await supabase.storage
          .from('marketplace-images')
          .remove(marketplaceImagePaths);

        if (marketplaceImagesDeleteError) {
          console.warn('⚠️  Warning: Could not delete some marketplace images:', marketplaceImagesDeleteError.message);
        } else {
          console.log(`✅ Deleted ${marketplaceImagePaths.length} marketplace images from storage`);
        }
      }
    } catch (storageError) {
      console.warn('⚠️  Warning: Could not clean up storage buckets:', storageError);
    }

    console.log('─'.repeat(60));
    console.log('🎉 Data wipe completed successfully!');
    console.log('📝 Note: User accounts in auth.users table were NOT deleted.');
    console.log('   To delete those, use the Supabase dashboard or CLI.');
    console.log('🔄 The application is now in a fresh state.');

    return true;
  } catch (error) {
    console.error('💥 Fatal error during data wipe:', error);
    return false;
  }
}

async function confirmAndWipe(): Promise<void> {
  console.log('🚨 DATA WIPE CONFIRMATION');
  console.log('========================');
  console.log('');
  console.log('This script will permanently delete ALL user-generated data:');
  console.log('• All pins and their images');
  console.log('• All likes and comments');
  console.log('• All chat messages');
  console.log('• All marketplace items');
  console.log('• All blog posts');
  console.log('• All user profiles');
  console.log('• All uploaded images in storage');
  console.log('');
  console.log('⚠️  THIS ACTION CANNOT BE UNDONE!');
  console.log('');

  // In a real environment, you might want to add a confirmation prompt
  // For now, we'll proceed directly since this is a development environment
  
  const success = await wipeAllData();

  if (success) {
    console.log('');
    console.log('✅ Data wipe operation completed successfully!');
    console.log('🔄 Your Fellowship Finder application is now in a fresh state.');
    process.exit(0);
  } else {
    console.log('');
    console.log('❌ Data wipe operation failed!');
    console.log('🔍 Please check the error messages above.');
    process.exit(1);
  }
}

// Run the script
confirmAndWipe().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});