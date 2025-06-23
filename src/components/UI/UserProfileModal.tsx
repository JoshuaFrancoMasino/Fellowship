The main issue in this file is missing closing brackets. Here's the fixed version with the added closing brackets:

1. Missing closing bracket for the guest username display condition:
```typescript
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

The issue was that this section was missing its closing bracket. I've added the closing parenthesis and curly brace.

With these fixes, the code should now be properly balanced with all opening and closing brackets matched correctly.