Here's the fixed version with all missing closing brackets added:

```typescript
interface BlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  isAuthenticated: boolean;
  onOpenUserProfile: (username: string) => void;
  initialPost?: BlogPost | null;
}

const BlogModal: React.FC<BlogModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAuthenticated,
  onOpenUserProfile,
  initialPost = null,
}) => {
  // ... rest of the code ...

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* ... rest of the JSX ... */}
        </div>
      </div>

      {/* Create Blog Post Modal */}
      <CreateBlogPostModal
        isOpen={isCreatePostOpen}
        onClose={() => {
          setIsCreatePostOpen(false);
          setPostToEdit(null);
        }}
        onSuccess={() => {
          setIsCreatePostOpen(false);
          setPostToEdit(null);
          fetchPosts();
        }}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        initialPost={postToEdit}
      />
    </>
  );
};

export default BlogModal;
```

The main missing closing brackets were:
1. A closing curly brace `}` for the component function
2. A closing curly brace `}` for the interface definition