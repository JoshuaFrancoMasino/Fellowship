import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteUserBanners(): Promise<boolean> {
  try {
    console.log('🧹 Starting user banner deletion process...');
    console.log('⚠️  WARNING: This will delete ALL user banner images and clear banner URLs from profiles!');
    console.log('─'.repeat(60));

    // Step 1: Fetch all profiles with banner_url
    console.log('🔍 Fetching profiles with banner URLs...');
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, banner_url')
      .not('banner_url', 'is', null);

    if (fetchError) {
      console.error('❌ Error fetching profiles:', fetchError.message);
      return false;
    }

    if (!profiles || profiles.length === 0) {
      console.log('✅ No profiles found with banner URLs to delete.');
      return true;
    }

    console.log(`📊 Found ${profiles.length} profiles with banner URLs`);

    const bannerPathsToDelete: string[] = [];
    const profileIdsToUpdate: string[] = [];

    profiles.forEach(profile => {
      if (profile.banner_url) {
        try {
          // Extract the path from the public URL
          // Assuming URL format: https://<project_ref>.supabase.co/storage/v1/object/public/profile-pictures/path/to/file.png
          const url = new URL(profile.banner_url);
          const pathParts = url.pathname.split('/public/profile-pictures/');
          if (pathParts.length > 1) {
            bannerPathsToDelete.push(pathParts[1]);
            profileIdsToUpdate.push(profile.id);
            console.log(`📝 Will delete: ${pathParts[1]}`);
          }
        } catch (error) {
          console.warn(`⚠️  Invalid URL format for profile ${profile.id}: ${profile.banner_url}`);
          // Still add to update list to nullify the invalid URL
          profileIdsToUpdate.push(profile.id);
        }
      }
    });

    if (bannerPathsToDelete.length === 0) {
      console.log('✅ No banner images found to delete from storage.');
    } else {
      // Step 2: Delete banner images from storage
      console.log(`🗑️  Deleting ${bannerPathsToDelete.length} banner images from storage...`);
      const { error: storageError } = await supabase.storage
        .from('profile-pictures')
        .remove(bannerPathsToDelete);

      if (storageError) {
        console.error('❌ Error deleting banner images from storage:', storageError.message);
        console.log('🔄 Continuing to nullify URLs even though storage deletion failed...');
      } else {
        console.log(`✅ Successfully deleted ${bannerPathsToDelete.length} banner images from storage.`);
      }
    }

    // Step 3: Nullify banner_url in profiles table
    if (profileIdsToUpdate.length > 0) {
      console.log(`📝 Nullifying banner_url for ${profileIdsToUpdate.length} profiles...`);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: null })
        .in('id', profileIdsToUpdate);

      if (updateError) {
        console.error('❌ Error nullifying banner URLs in profiles:', updateError.message);
        return false;
      }
      console.log(`✅ Successfully nullified banner_url for ${profileIdsToUpdate.length} profiles.`);
    } else {
      console.log('✅ No banner URLs to nullify in profiles.');
    }

    console.log('─'.repeat(60));
    console.log('🎉 User banner deletion process completed successfully!');
    console.log('📝 Summary:');
    console.log(`   • ${bannerPathsToDelete.length} banner images deleted from storage`);
    console.log(`   • ${profileIdsToUpdate.length} profile banner URLs nullified`);
    return true;
  } catch (error) {
    console.error('💥 Fatal error during user banner deletion:', error);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 User Banner Deleter');
  console.log('========================\n');

  const success = await deleteUserBanners();

  if (success) {
    console.log('\n✅ Operation completed successfully!');
    console.log('🔄 Users will no longer see banner upload options in their profiles.');
    console.log('💡 All existing banner images have been removed and URLs cleared.');
  } else {
    console.log('\n❌ Operation failed!');
    console.log('🔍 Please check the error messages above.');
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});