The main issue in this file is missing closing brackets. Here's the fixed version with the added closing brackets:

1. Around line 420, there's a missing closing bracket for the guest username display section. The correct closing should be:

```jsx
{isOwnProfile && (!isAuthenticated || isGuestUser) && (
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center space-x-2">
      <Settings className="w-5 h-5" />
      <span>Username</span>
    </h3>
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-gray-200 font-mono text-lg">Guest {username}</p>
      <p className="text-sm text-gray-400 mt-1">
        Guest usernames cannot be changed. Sign up for an account to customize your username.
      </p>
    </div>
  </div>
)}
```

2. The Admin Panel Button section also needs proper closure:

```jsx
{/* Admin Panel Button */}
{isCurrentUserAdmin && (
  <div className="mt-6">
    <button
      onClick={handleOpenAdminPanel}
      className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
    >
      <Shield className="w-4 h-4" />
      <span>Open Admin Panel</span>
    </button>
  </div>
)}
```

These fixes should resolve the syntax errors in the file. The rest of the code appears to be properly structured with matching brackets.