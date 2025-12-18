import { Bell, AtSign, Clock, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { useNotifications, useMarkNotificationRead, type Notification } from '@/hooks/useHub';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  mention: AtSign,
  assignment: CheckCircle,
  reminder: Clock,
  alert: AlertTriangle,
  system: Bell,
};

const typeColors: Record<string, string> = {
  mention: 'text-blue-400',
  assignment: 'text-green-400',
  reminder: 'text-amber-400',
  alert: 'text-red-400',
  system: 'text-slate-400',
};

export function NotificationsCard() {
  const { data, isLoading } = useNotifications({ limit: 5 });
  const markRead = useMarkNotificationRead();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.is_read) {
      markRead.mutate(notif.id);
    }
    // TODO: Navigate to source if applicable
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-rose-400" />
          <h3 className="font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No notifications</p>
            <p className="text-slate-500 text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <NotificationRow
                key={notif.id}
                notification={notif}
                onClick={() => handleNotificationClick(notif)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationRow({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const Icon = typeIcons[notification.type] || Bell;
  const colorClass = typeColors[notification.type] || 'text-slate-400';

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer',
        notification.is_read
          ? 'hover:bg-slate-700/50'
          : 'bg-slate-700/30 hover:bg-slate-700/50'
      )}
    >
      <div className={cn('mt-0.5', colorClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm truncate',
            notification.is_read ? 'text-slate-400' : 'text-white font-medium'
          )}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-slate-500 truncate">{notification.message}</p>
        )}
        <p className="text-xs text-slate-600 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 bg-rose-500 rounded-full flex-shrink-0 mt-2" />
      )}
    </div>
  );
}
