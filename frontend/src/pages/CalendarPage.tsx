import { CalendarView } from '@/components/dashboard/views/CalendarView';

export function CalendarPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Calendar View - works with local storage, no Google Calendar required */}
      <div className="flex-1 min-h-0">
        <CalendarView />
      </div>
    </div>
  );
}
