import { CalendarView } from '@/components/dashboard/views/CalendarView';
import { useGoogleCalendarStatus } from '@/hooks/useGoogleCalendar';
import { Calendar, Link2, AlertCircle, Loader2 } from 'lucide-react';

export function CalendarPage() {
  const { data: googleStatus, isLoading: isLoadingStatus } = useGoogleCalendarStatus();

  const isConnected = googleStatus?.connected ?? false;

  if (isLoadingStatus) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Connection Banner */}
      {!isConnected && (
        <GoogleCalendarBanner />
      )}

      {/* Calendar View */}
      <div className="flex-1 min-h-0">
        <CalendarView />
      </div>
    </div>
  );
}

function GoogleCalendarBanner() {
  const handleConnect = () => {
    // Open OAuth popup
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `${import.meta.env.VITE_API_URL || ''}/api/auth/google/authorize`,
      'google-auth',
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );

    // Listen for completion message from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'google-auth-success') {
        window.removeEventListener('message', handleMessage);
        // Refresh the page to update calendar status
        window.location.reload();
      }
    };
    window.addEventListener('message', handleMessage);

    // Fallback: check periodically if popup closed
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        // Refresh to check if connection was successful
        window.location.reload();
      }
    }, 1000);
  };

  return (
    <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Calendar className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Connect Google Calendar</h3>
            <p className="text-xs text-slate-400">
              Sync your Google Calendar to see and manage events directly here
            </p>
          </div>
        </div>
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Connect
        </button>
      </div>
    </div>
  );
}

export function GoogleCalendarDisconnectedState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="p-6 bg-slate-800/50 rounded-full mb-6">
        <Calendar className="w-16 h-16 text-slate-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">No Calendar Connected</h2>
      <p className="text-slate-400 max-w-md mb-6">
        Connect your Google Calendar to see your schedule, create events, and stay organized.
      </p>
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <AlertCircle className="w-4 h-4" />
        Click "Connect" above to get started
      </div>
    </div>
  );
}
