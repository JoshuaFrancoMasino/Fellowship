import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makeUserAdmin(username: string): Promise<boolean> {
  try {
    console.log(`🔍 Looking for user: ${username}`);
    
    // First, find the user profile by username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (profileError) {
      console.error('❌ Error finding user profile:', profileError.message);
      return false;
    }

    if (!profile) {
      console.error('❌ User not found with username:', username);
      return false;
    }

    console.log(`✅ Found user: ${profile.username} (ID: ${profile.id})`);
    console.log(`📋 Current role: ${profile.role}`);

    // Check if user is already an admin
    if (profile.role === 'admin') {
      console.log('ℹ️  User is already an admin!');
      return true;
    }

    // Update the user's role to admin
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('❌ Error updating user role:', updateError.message);
      return false;
    }

    console.log('🎉 Successfully promoted user to admin!');
    console.log(`👑 ${username} is now an administrator`);
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

async function listAllUsers(): Promise<void> {
  try {
    console.log('\n📋 Listing all users:');
    console.log('─'.repeat(50));
    
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('username, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users:', error.message);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No users found.');
      return;
    }

    profiles.forEach((profile, index) => {
      const roleIcon = profile.role === 'admin' ? '👑' : '👤';
      const date = new Date(profile.created_at).toLocaleDateString();
      console.log(`${index + 1}. ${roleIcon} ${profile.username} (${profile.role}) - Joined: ${date}`);
    });
    
    console.log('─'.repeat(50));
    console.log(`Total users: ${profiles.length}`);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Admin Account Creator');
  console.log('========================\n');

  // First, list all users
  await listAllUsers();

  // Get username from command line arguments
  const username = process.argv[2];

  if (!username) {
    console.log('\n❓ Usage: node scripts/makeAdmin.js <username>');
    console.log('Example: node scripts/makeAdmin.js john_doe');
    console.log('\nPlease provide a username to promote to admin.');
    process.exit(1);
  }

  console.log(`\n🎯 Target user: ${username}`);
  console.log('─'.repeat(30));

  const success = await makeUserAdmin(username);

  if (success) {
    console.log('\n✅ Operation completed successfully!');
    console.log('🔄 The user should now have admin privileges.');
    console.log('💡 They may need to refresh their browser to see the changes.');
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