import React from 'react';
import { X, MapPin, MessageSquare, ShoppingBag, BookOpen, User, Camera, Palette, Globe, Heart, MessageCircle, Cross, UserPlus } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="glass-header p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full glow-white-circular">
                <img 
                  src="/src/assets/Gemini_Generated_Image_5wipt35wipt35wip.png" 
                  alt="Fellowship Finder Logo"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-shadow-white-md">Welcome to Fellowship Finder</h2>
                <p className="text-blue-100 text-sm text-shadow-white-sm">
                  Connecting Christian communities & sharing the love of YHWH
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6 icon-shadow-white-sm" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pb-8 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Introduction */}
          <div className="mb-8 text-center">
            <h3 className="text-2xl font-bold text-gray-200 mb-4">
              A Social Mapping Platform for Christian Communities
            </h3>
            <p className="text-gray-300 leading-relaxed max-w-3xl mx-auto">
              Fellowship Finder is designed to help Christian communities connect, share, and grow together. 
              Whether you're looking for fellowship, sharing your faith journey, or building meaningful connections, 
              our platform provides the tools you need to strengthen your community bonds.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Interactive Map */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-200">Interactive Map</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>Create location-based pins to share experiences</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>Upload photos and choose custom pin colors</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>Discover community activities and events</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>Filter by location and explore across the earth</span>
                </li>
              </ul>
            </div>

            {/* Community Blog */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-200">Community Blog</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                  <span>Share your faith journey and testimonies</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                  <span>Write devotionals and spiritual insights</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                  <span>Engage with others through comments and likes</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                  <span>Save drafts and publish when ready</span>
                </li>
              </ul>
            </div>

            {/* Marketplace */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-green-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-200">Community Marketplace</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Buy and sell items within the community</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Support fellow believers' businesses</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Direct messaging with sellers</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Upload multiple photos and descriptions</span>
                </li>
              </ul>
            </div>

            {/* Direct Messaging */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-200">Direct Messaging</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>Private conversations with community members</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>Real-time messaging system</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>Like and react to messages</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>Manage conversation history</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Signed-Up User Benefits */}
          <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700 rounded-xl p-6 mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <UserPlus className="w-6 h-6 text-blue-400" />
              <h4 className="text-xl font-semibold text-blue-300">Enhanced Features for Registered Users</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-blue-200">
                  <Camera className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Upload and manage profile pictures</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-200">
                  <Palette className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Choose custom pin colors from 12 tribes</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-200">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Add personal bio and contact information</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-200">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Access to direct messaging system</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-blue-200">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Create and publish blog posts</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-200">
                  <ShoppingBag className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">List items in the marketplace</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-200">
                  <Heart className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Like and comment on all content</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-200">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Persistent identity across sessions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Editor's Choice Feature */}
          <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-yellow-600/20 rounded-full flex items-center justify-center">
                <Cross className="w-5 h-5 text-yellow-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-200">Editor's Choice</h4>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Look for the special <Cross className="w-4 h-4 text-yellow-400 inline mx-1" /> badge on exceptional content! 
              Editor's Choice items are carefully selected to highlight the most inspiring, helpful, or noteworthy 
              contributions from our community. These featured pins, blog posts, and marketplace items represent 
              the best of what Fellowship Finder has to offer.
            </p>
          </div>

          {/* Contact Information */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-700 border border-gray-600 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-200 mb-4 text-center">
              Need Help or Want to Get Featured?
            </h4>
            <div className="text-center space-y-3">
              <p className="text-gray-300 text-sm leading-relaxed">
                If you would like to promote your post, marketplace item, or pin, connect with the developer, 
                share feedback, or have any account-related issues, please email:
              </p>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                <a 
                  href="mailto:drbased@protonmail.com"
                  className="text-blue-400 hover:text-blue-300 font-mono text-lg transition-colors"
                >
                  drbased@protonmail.com
                </a>
              </div>
              <p className="text-gray-400 text-xs">
                We're here to help you make the most of your Fellowship Finder experience!
              </p>
            </div>
          </div>
        </div>

        {/* Developer Link */}
        <div className="px-6 pb-6">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
            <a 
              href="https://drbased.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 font-mono text-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Globe className="w-5 h-5" />
              <span>Visit drbased.net</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;