import React, { useState, useEffect } from 'react';
import { X, Shield, Plus, Trash2, AlertCircle, UserX, User } from 'lucide-react';
import { ForbiddenUsername, getForbiddenUsernames, addForbiddenUsername, deleteForbiddenUsername } from '../../lib/supabase';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminUser: boolean;
}

const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose, isAdminUser }) => {
  const [forbiddenWords, setForbiddenWords] = useState<ForbiddenUsername[]>([]);
  const [newForbiddenWord, setNewForbiddenWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingWord, setAddingWord] = useState(false);
  const [deletingWordId, setDeletingWordId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isAdminUser) {
      fetchForbiddenWords();
    } else if (isOpen && !isAdminUser) {
      setError('You do not have administrative privileges to access this panel.');
    }
  }, [isOpen, isAdminUser]);

  const fetchForbiddenWords = async () => {
    setLoading(true);
    setError(null);
    try {
      const words = await getForbiddenUsernames();
      setForbiddenWords(words);
    } catch (err) {
      console.error('Error fetching forbidden words:', err);
      setError('Failed to fetch forbidden words.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddForbiddenWord = async () => {
    if (!newForbiddenWord.trim()) {
      setError('Forbidden word cannot be empty.');
      return;
    }
    setAddingWord(true);
    setError(null);
    try {
      const success = await addForbiddenUsername(newForbiddenWord.trim());
      if (success) {
        setNewForbiddenWord('');
        fetchForbiddenWords();
      } else {
        setError('Failed to add forbidden word. It might already exist.');
      }
    } catch (err) {
      console.error('Error adding forbidden word:', err);
      setError('Failed to add forbidden word.');
    } finally {
      setAddingWord(false);
    }
  };

  const handleDeleteForbiddenWord = async (id: string) => {
    setDeletingWordId(id);
    setError(null);
    try {
      const success = await deleteForbiddenUsername(id);
      if (success) {
        fetchForbiddenWords();
      } else {
        setError('Failed to delete forbidden word.');
      }
    } catch (err) {
      console.error('Error deleting forbidden word:', err);
      setError('Failed to delete forbidden word.');
    } finally {
      setDeletingWordId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddForbiddenWord();
    }
  };

  if (!isOpen) return null;

  if (!isAdminUser) {
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
                  <h2 className="text-xl font-bold text-shadow-white-md">Access Denied</h2>
                  <p className="text-red-100 text-sm text-shadow-white-sm">
                    Administrator privileges required
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
              You do not have the necessary permissions to access the admin panel.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="glass-header p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 glass-white rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-yellow-600 icon-shadow-white-sm" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-shadow-white-md">Admin Panel</h2>
                <p className="text-yellow-100 text-sm text-shadow-white-sm">
                  Manage application settings and content
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <div className="flex items-center space-x-2 text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Forbidden Usernames Section */}
          <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center space-x-2">
              <UserX className="w-5 h-5 text-red-400" />
              <span>Forbidden Usernames</span>
            </h3>
            
            <p className="text-sm text-gray-400 mb-4">
              Manage words that cannot be used in usernames. These words will be blocked during account registration.
            </p>
            
            {/* Add New Forbidden Word */}
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={newForbiddenWord}
                onChange={(e) => setNewForbiddenWord(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add new forbidden word..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
              />
              <button
                onClick={handleAddForbiddenWord}
                disabled={addingWord || !newForbiddenWord.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {addingWord ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Add</span>
              </button>
            </div>

            {/* List of Forbidden Words */}
            {loading ? (
              <div className="text-center py-4 text-gray-400">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>Loading forbidden words...</p>
              </div>
            ) : forbiddenWords.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <UserX className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No forbidden words configured.</p>
                <p className="text-xs mt-1">Add words that should be blocked from usernames.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-gray-400 mb-2">
                  {forbiddenWords.length} forbidden word{forbiddenWords.length !== 1 ? 's' : ''}
                </div>
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                  {forbiddenWords.map((word) => (
                    <li key={word.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                      <div className="flex-1">
                        <span className="text-gray-200 font-medium">{word.word}</span>
                        <p className="text-xs text-gray-400 mt-1">
                          Added {new Date(word.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteForbiddenWord(word.id)}
                        disabled={deletingWordId === word.id}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-full transition-colors disabled:opacity-50"
                        title="Delete forbidden word"
                      >
                        {deletingWordId === word.id ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Other Admin Sections */}
          <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-400" />
              <span>Content Management</span>
            </h3>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Editor's Choice badges can be managed directly from pin, blog, and marketplace views</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Content deletion capabilities available throughout the platform</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>User profile management accessible via user profiles</span>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-200 mb-3">System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Database:</span>
                <span className="ml-2 text-green-400">Connected</span>
              </div>
              <div>
                <span className="text-gray-400">Authentication:</span>
                <span className="ml-2 text-green-400">Active</span>
              </div>
              <div>
                <span className="text-gray-400">Storage:</span>
                <span className="ml-2 text-green-400">Enabled</span>
              </div>
              <div>
                <span className="text-gray-400">Real-time:</span>
                <span className="ml-2 text-green-400">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanelModal;