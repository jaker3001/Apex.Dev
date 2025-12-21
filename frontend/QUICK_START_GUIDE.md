# Supabase Frontend Quick Start Guide

## Setup

### 1. Install Dependencies

Dependencies are already installed:
```bash
npm install  # @supabase/supabase-js is included
```

### 2. Configure Environment

Create `frontend/.env` from `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_FEATURE_SUPABASE_ENABLED=false  # Set to true when ready
```

### 3. Start Development Server

```bash
npm run dev
```

---

## Common Patterns

### Fetching Data

```tsx
import { useTasksQuery } from '@/hooks/queries/useTasksQuery';

function MyComponent() {
  const { data: tasks, isLoading, error } = useTasksQuery({
    status: 'open',
    is_my_day: true,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {tasks?.map(task => (
        <div key={task.id}>{task.title}</div>
      ))}
    </div>
  );
}
```

### Creating Data

```tsx
import { useCreateTask } from '@/hooks/queries/useTasksQuery';
import { useToast } from '@/stores/uiStore';

function CreateTaskButton() {
  const createTask = useCreateTask();
  const { toast } = useToast();

  const handleCreate = async () => {
    try {
      await createTask.mutateAsync({
        title: 'New task',
        status: 'open',
        priority: 'medium',
      });
      toast.success('Task created!');
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  return (
    <button
      onClick={handleCreate}
      disabled={createTask.isPending}
    >
      {createTask.isPending ? 'Creating...' : 'Create Task'}
    </button>
  );
}
```

### Updating Data

```tsx
import { useUpdateTask } from '@/hooks/queries/useTasksQuery';

function TaskCheckbox({ task }) {
  const updateTask = useUpdateTask();

  const toggleComplete = () => {
    updateTask.mutate({
      id: task.id,
      updates: {
        status: task.status === 'completed' ? 'open' : 'completed',
        completed_at: task.status === 'completed' ? null : new Date().toISOString(),
      },
    });
  };

  return (
    <input
      type="checkbox"
      checked={task.status === 'completed'}
      onChange={toggleComplete}
    />
  );
}
```

### Using Filters

```tsx
import { useFiltersStore } from '@/stores/filtersStore';

function TaskFilters() {
  const { taskFilters, setTaskView, setTaskFilters } = useFiltersStore();

  return (
    <div>
      <button onClick={() => setTaskView('my_day')}>My Day</button>
      <button onClick={() => setTaskView('important')}>Important</button>

      <select
        value={taskFilters.priority || ''}
        onChange={(e) => setTaskFilters({ priority: e.target.value })}
      >
        <option value="">All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
  );
}
```

### Using UI Store

```tsx
import { useUIStore, useToast } from '@/stores/uiStore';

function MyComponent() {
  const { toast } = useToast();
  const openModal = useUIStore(state => state.openModal);
  const closeModal = useUIStore(state => state.closeModal);

  const handleSave = () => {
    // ... save logic
    toast.success('Saved successfully!');
    closeModal();
  };

  return (
    <button onClick={() => openModal('edit-task', { taskId: 123 })}>
      Edit Task
    </button>
  );
}
```

### File Upload

```tsx
import { FileUpload } from '@/components/shared/FileUpload';

function DocumentUploader() {
  const handleUploadComplete = (results) => {
    console.log('Uploaded files:', results);
    // results[0].publicUrl - Use this URL to save to database
  };

  return (
    <FileUpload
      bucket="documents"
      path="user-uploads"
      accept="image/*,.pdf,.doc,.docx"
      maxSize={10} // 10MB
      multiple
      onUploadComplete={handleUploadComplete}
    />
  );
}
```

---

## Feature Flags

Check if a feature is enabled:

```tsx
import { isFeatureEnabled } from '@/lib/featureFlags';

function MyComponent() {
  if (isFeatureEnabled('supabase')) {
    // Use Supabase client
  } else {
    // Use API fallback
  }
}
```

---

## Real-time Subscriptions

```tsx
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscriptionManager } from '@/lib/supabase/subscriptions';
import { taskKeys } from '@/lib/react-query/queryKeys';

function TasksWithRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to task changes
    const unsubscribe = subscriptionManager.subscribe(
      'user_tasks',
      (payload) => {
        console.log('Task changed:', payload);
        // Invalidate tasks query to refetch
        queryClient.invalidateQueries({ queryKey: taskKeys.all });
      },
      { event: '*' } // Listen to all events (INSERT, UPDATE, DELETE)
    );

    // Cleanup on unmount
    return unsubscribe;
  }, [queryClient]);

  // ... rest of component
}
```

---

## Direct Supabase Client Usage

For cases not covered by hooks:

```tsx
import { supabase } from '@/lib/supabase/client';

async function customQuery() {
  const { data, error } = await supabase
    .from('user_tasks')
    .select('*, subtasks:user_tasks(count)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data;
}
```

---

## TypeScript Types

All types are fully typed:

```tsx
import type { UserTask, TaskList } from '@/lib/supabase/types';

function processTask(task: UserTask) {
  // task.id - number
  // task.title - string
  // task.status - 'open' | 'in_progress' | 'completed' | 'cancelled'
  // ... full autocomplete support
}
```

---

## Error Handling

```tsx
import { useTasksQuery } from '@/hooks/queries/useTasksQuery';
import { useToast } from '@/stores/uiStore';

function TasksList() {
  const { data, error } = useTasksQuery();
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast.error('Failed to load tasks', error.message);
    }
  }, [error, toast]);

  // ... render component
}
```

---

## Best Practices

### 1. Always use hooks for data fetching
```tsx
// Good
const { data } = useTasksQuery();

// Avoid
const tasks = await supabase.from('user_tasks').select();
```

### 2. Use query keys from the factory
```tsx
// Good
import { taskKeys } from '@/lib/react-query/queryKeys';
queryClient.invalidateQueries({ queryKey: taskKeys.all });

// Avoid
queryClient.invalidateQueries({ queryKey: ['tasks'] });
```

### 3. Handle loading and error states
```tsx
// Good
if (isLoading) return <Spinner />;
if (error) return <Error error={error} />;
return <Data data={data} />;

// Avoid
return <Data data={data} />; // data might be undefined
```

### 4. Use optimistic updates for better UX
The mutations already include optimistic updates, so just use them:
```tsx
const updateTask = useUpdateTask();
// Updates UI immediately, reverts on error
updateTask.mutate({ id, updates });
```

### 5. Persist important state
```tsx
// UI preferences - already persisted in uiStore
const { activeTaskView } = useUIStore();

// Filters - already persisted in filtersStore
const { taskFilters } = useFiltersStore();
```

---

## Debugging

### View React Query DevTools (Optional)

Install React Query DevTools:
```bash
npm install -D @tanstack/react-query-devtools
```

Add to `App.tsx`:
```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Check Feature Flags

Feature flags are logged to console in development mode automatically.

### Monitor Subscriptions

```tsx
import { subscriptionManager } from '@/lib/supabase/subscriptions';

console.log('Active subscriptions:', subscriptionManager.getActiveCount());
```

---

## Migration Path

### Phase 1: Infrastructure (✅ Complete)
- Supabase client setup
- React Query configuration
- State management (Zustand)
- Data hooks (Tasks, Projects)
- Feature flags

### Phase 2: Components (In Progress)
- Auth system
- Task components
- Project components
- Note components

### Phase 3: Real-time (Planned)
- Subscription hooks
- Cross-tab sync
- Optimistic UI

---

## Troubleshooting

### "Supabase environment variables not set"
- Copy `.env.example` to `.env`
- Add your Supabase URL and anon key
- Restart dev server

### "Feature not working"
- Check feature flag: `VITE_FEATURE_SUPABASE_ENABLED=true`
- Ensure database schema matches types in `types.ts`
- Check browser console for errors

### "Query not updating"
- Check that you're invalidating the correct query key
- Verify mutation `onSuccess` calls `invalidateQueries`

### "Type errors"
- Ensure types in `types.ts` match your database schema
- Run `npm run build` to check for TypeScript errors

---

## Further Reading

- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Implementation Summary](../SUPABASE_FRONTEND_IMPLEMENTATION.md)
