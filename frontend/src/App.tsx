import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query/config';
import { AppLayout } from './components/layout/AppLayout';
import { ChatPage } from './pages/ChatPage';
import { AgentsPage } from './pages/AgentsPage';
import { SkillsPage } from './pages/SkillsPage';
import { MCPPage } from './pages/MCPPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LearnPage } from './pages/LearnPage';
import { SettingsPage } from './pages/SettingsPage';
import { SettingsLayout } from './pages/SettingsLayout';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './hooks/useAuth';
import { ChatProvider } from './contexts/ChatContext';
import { Loader2 } from 'lucide-react';

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

          {/* Settings Section with Layout */}
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<SettingsPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="skills" element={<SkillsPage />} />
            <Route path="mcp" element={<MCPPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="learn" element={<LearnPage />} />
          </Route>
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