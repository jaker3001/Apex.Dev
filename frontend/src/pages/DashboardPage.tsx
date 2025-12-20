import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Cloud, CheckCircle2 } from 'lucide-react';

// Widget Container Component
function Widget({ children, className, title, action }: { children: React.ReactNode, className?: string, title?: string, action?: React.ReactNode }) {
  return (
    <div className={cn("glass-card rounded-2xl p-5 flex flex-col relative overflow-hidden group transition-all duration-300 hover:border-white/10", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4 z-10">
          {title && <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>}
          {action}
        </div>
      )}
      <div className="flex-1 z-10 relative">
        {children}
      </div>
      {/* Subtle gradient glow effect */}
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
    </div>
  );
}

// Mock Data Components
function MyDayWidget() {
  const tasks = [
    { id: 1, title: 'Review Job #1045 photos', completed: false, time: '10:00 AM' },
    { id: 2, title: 'Call insurance adjuster (State Farm)', completed: false, time: '11:30 AM' },
    { id: 3, title: 'Submit equipment list for #1042', completed: true, time: '1:00 PM' },
    { id: 4, title: 'Weekly team sync', completed: false, time: '3:00 PM' },
  ];

  return (
    <Widget title="My Day" className="col-span-1 md:col-span-2 row-span-2" action={<button className="text-xs text-primary hover:underline">View All</button>}>
      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-3 group/task cursor-pointer">
            <button className={cn(
              "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
              task.completed ? "bg-green-500 border-green-500" : "border-muted-foreground group-hover/task:border-primary"
            )}>
              {task.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
            </button>
            <div className={cn("flex-1 flex justify-between items-center pb-2 border-b border-white/5", task.completed && "opacity-50 line-through")}>
              <span className="text-sm font-medium">{task.title}</span>
              <span className="text-xs text-muted-foreground">{task.time}</span>
            </div>
          </div>
        ))}
        <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mt-2">
          <div className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center">
            <span className="text-xs">+</span>
          </div>
          Add a task
        </button>
      </div>
    </Widget>
  );
}

function WeatherWidget() {
  return (
    <Widget className="col-span-1 row-span-1 bg-gradient-to-br from-blue-500/10 to-blue-600/5">
      <div className="flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase">Denver, CO</span>
            <div className="text-3xl font-bold mt-1">24°</div>
          </div>
          <Cloud className="h-8 w-8 text-blue-400" />
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          H: 32° L: 18° • Snow showers expected
        </div>
      </div>
    </Widget>
  );
}

function CalendarWidget() {
  return (
    <Widget title="Schedule" className="col-span-1 row-span-1">
      <div className="space-y-3">
         <div className="flex gap-3 items-start">
            <div className="flex flex-col items-center min-w-[30px]">
                <span className="text-xs text-muted-foreground">10:00</span>
            </div>
            <div className="bg-primary/10 border-l-2 border-primary pl-2 py-1 rounded-r text-xs w-full">
                <div className="font-semibold text-primary">Site Visit: Smith Residence</div>
                <div className="text-muted-foreground">123 Maple Dr.</div>
            </div>
         </div>
         <div className="flex gap-3 items-start opacity-50">
            <div className="flex flex-col items-center min-w-[30px]">
                <span className="text-xs text-muted-foreground">14:00</span>
            </div>
            <div className="bg-white/5 border-l-2 border-white/20 pl-2 py-1 rounded-r text-xs w-full">
                <div className="font-semibold">Internal Review</div>
                <div className="text-muted-foreground">Office</div>
            </div>
         </div>
      </div>
    </Widget>
  );
}

function ProjectStatusWidget() {
    return (
        <Widget title="Project Velocity" className="col-span-1 md:col-span-2 row-span-1">
            <div className="flex items-end gap-2 h-24 w-full px-2">
                {[40, 65, 30, 80, 55, 90, 45].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary/20 rounded-t-sm relative group hover:bg-primary/40 transition-colors" style={{ height: `${h}%` }}>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs bg-black px-1 rounded transition-opacity">{h}%</div>
                    </div>
                ))}
            </div>
             <div className="flex justify-between mt-2 text-[10px] text-muted-foreground px-2">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
        </Widget>
    )
}

export function DashboardPage() {
  const [activeView, setActiveView] = useState(0);
  const views = ['My Hub', 'Social', 'News'];

  return (
    <div className="h-full w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col">
      {/* View Indicators (Swipe Navigation) */}
      {/* Only visible on mobile really, but good for structure */}
      
      <div className="flex-1 overflow-y-auto min-h-0 pb-20"> {/* pb-20 for FAB space */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[minmax(180px,auto)]">
          {/* Top Row */}
          <div className="col-span-1 md:col-span-3">
             <h1 className="text-3xl font-bold mb-1">Good Morning, Jake</h1>
             <p className="text-muted-foreground">Here's what's on your plate for today.</p>
          </div>
          <div className="col-span-1 flex justify-end items-center">
             <div className="text-right">
                <div className="text-2xl font-bold">10:42 AM</div>
                <div className="text-sm text-muted-foreground">Saturday, Dec 20</div>
             </div>
          </div>

          {/* Widgets Grid */}
          <MyDayWidget />
          <WeatherWidget />
          <CalendarWidget />
          <ProjectStatusWidget />
          
           {/* Quick Stats */}
           <Widget className="col-span-1 row-span-1 flex items-center justify-center">
              <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">12</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Active Jobs</div>
              </div>
           </Widget>
           <Widget className="col-span-1 row-span-1 flex items-center justify-center">
              <div className="text-center">
                  <div className="text-3xl font-bold text-orange-500">3</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Pending Est</div>
              </div>
           </Widget>

        </div>
      </div>
      
      {/* Page Indicators */}
      <div className="flex justify-center gap-2 mt-4 pb-2">
        {views.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveView(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              activeView === i ? "w-8 bg-white" : "w-1.5 bg-white/20 hover:bg-white/40"
            )}
          />
        ))}
      </div>
    </div>
  );
}