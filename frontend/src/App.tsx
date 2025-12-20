import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { ChatPage } from './pages/ChatPage';
import { AgentsPage } from './pages/AgentsPage';
import { SkillsPage } from './pages/SkillsPage';
import { MCPPage } from './pages/MCPPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LearnPage } from './pages/LearnPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './hooks/useAuth';
import { ChatProvider } from './contexts/ChatContext';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => window.location.reload()} />;
  }

  // Show the app if authenticated
  return (
    <ChatProvider>
      <Routes>
        <Route path="/" element={<AppLayout />}>
        {/* Dashboard Section - Default */}
        <Route index element={<DashboardPage />} />

        {/* Chat Section */}
        <Route path="chat" element={<ChatPage />} />

        {/* Jobs Section */}
        <Route path="jobs" element={<ProjectsPage />} />
        <Route path="jobs/:id" element={<ProjectDetailPage />} />

        {/* Settings/Admin Section */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/agents" element={<AgentsPage />} />
        <Route path="settings/skills" element={<SkillsPage />} />
        <Route path="settings/mcp" element={<MCPPage />} />
        <Route path="settings/analytics" element={<AnalyticsPage />} />
        <Route path="settings/learn" element={<LearnPage />} />
      </Route>
      </Routes>
    </ChatProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthenticatedApp />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
