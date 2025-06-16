import React, { useState } from 'react';
import { User, Mail, Lock, Zap, CheckCircle, X, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuthPageProps {
  onCloseAuth: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onCloseAuth }) => {
  const [isSignUp, setIsSignUp] = useState(true); // Default to sign up for guest users
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Can be email or username
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [optInUpdates, setOptInUpdates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  // Helper function to check if input looks like an email
  const isEmail = (input: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  };

  // Helper function to resolve username to email
  const resolveUsernameToEmail = async (identifier: string): Promise<string | null> => {
    if (isEmail(identifier)) {
      return identifier; // Already an email
    }

    try {
      // Look up the user by username in the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', identifier)
        .single();

      if (error || !data) {
        return null; // Username not found
      }

      // Get the user's email from auth.users table using the profile ID
      // Note: This requires RLS policies that allow reading user data
      // In a production environment, this should be done server-side
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(data.id);
      
      if (userError || !userData.user) {
        return null;
      }

      return userData.user.email || null;
    } catch (err) {
      console.error('Error resolving username to email:', err);
      return null;
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // For sign up, we need a valid email address
        if (!isEmail(loginIdentifier)) {
          throw new Error('Please enter a valid email address for sign up');
        }

        const { error } = await supabase.auth.signUp({
          email: loginIdentifier,
          password,
          options: {
            data: {
              username: username || `user_${Date.now()}`,
              opt_in_updates: optInUpdates,
            },
          },
        });
        
        if (error) throw error;
        
        // Show email confirmation message instead of auto-signing in
        setShowEmailConfirmation(true);
      } else {
        // For sign in, resolve username to email if needed
        let emailToUse = loginIdentifier;
        
        if (!isEmail(loginIdentifier)) {
          // Try to resolve username to email
          const resolvedEmail = await resolveUsernameToEmail(loginIdentifier);
          if (!resolvedEmail) {
            throw new Error('Username not found. Please check your username or use your email address.');
          }
          emailToUse = resolvedEmail;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });
        
        if (error) {
          // Provide more user-friendly error messages
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid username/email or password. Please check your credentials and try again.');
          }
          throw error;
        }
        
        // The App component will handle closing the auth page via onAuthStateChange
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show email confirmation screen
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
        </div>

        <div className="relative w-full max-w-md">
          <div className="bg-gray-900 rounded-3xl shadow-2xl p-8 border border-gray-700 text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-200 mb-4">Check Your Email</h2>
            
            <p className="text-gray-400 mb-6">
              We've sent a confirmation link to <strong className="text-gray-200">{loginIdentifier}</strong>. 
              Please check your email and click the link to verify your account.
            </p>
            
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
              <p className="text-blue-300 text-sm">
                After confirming your email, return to this page and sign in with your credentials.
              </p>
            </div>

            {optInUpdates && (
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 text-green-300">
                  <Bell className="w-4 h-4" />
                  <p className="text-sm">
                    You've opted in to receive community updates!
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowEmailConfirmation(false);
                setIsSignUp(false);
                setLoginIdentifier('');
                setPassword('');
                setUsername('');
                setOptInUpdates(false);
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      </div>

      {/* Close Button - Return to Guest Mode */}
      <button
        onClick={onCloseAuth}
        className="fixed top-6 right-6 z-50 w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all duration-200 shadow-lg"
        title="Return to Guest Mode"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="relative w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full glow-white-circular">
            <img 
              src="/src/assets/Gemini_Generated_Image_5wipt35wipt35wip.png" 
              alt="Fellowship Finder Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 text-shadow-white-md">Fellowship Finder</h1>
          <p className="text-blue-100 text-shadow-white-sm">Connecting Christian communities & sharing the love of YHWH</p>
        </div>

        {/* Auth Form */}
        <div className="bg-gray-900 rounded-3xl shadow-2xl p-8 border border-gray-700">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-200 mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-400">
              {isSignUp ? 'Join the community' : 'Sign in to continue'}
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                {isSignUp ? 'Email' : 'Email or Username'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={isSignUp ? "email" : "text"}
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder={isSignUp ? "Enter your email" : "Enter your email or username"}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
                />
              </div>
              {!isSignUp && (
                <p className="text-xs text-gray-400 mt-1">
                  You can sign in with either your email address or username
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Opt-in checkbox - Only show during sign up */}
            {isSignUp && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optInUpdates}
                    onChange={(e) => setOptInUpdates(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Bell className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-gray-200">
                        Stay in the loop
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Opt-in to receive the latest and greatest from us and get updates on the community, new features, and fellowship opportunities.
                    </p>
                  </div>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-700"></div>
            <span className="px-4 text-gray-400 text-sm">or</span>
            <div className="flex-1 border-t border-gray-700"></div>
          </div>

          {/* Guest Option */}
          <button
            onClick={onCloseAuth}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-800 py-3 rounded-lg font-medium hover:from-yellow-500 hover:to-orange-500 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
          >
            <Zap className="w-5 h-5" />
            <span>Continue as Guest</span>
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            Guest accounts have limited features.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-400">
          <p className="text-sm">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;