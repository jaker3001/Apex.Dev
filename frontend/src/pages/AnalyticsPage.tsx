import { BarChart3, TrendingUp, Clock, CheckCircle, Zap, Bot, Puzzle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Mock data for demo
const STATS = {
  totalTasks: 247,
  successRate: 94,
  avgTime: 12.4,
  todayTasks: 18,
};

const CATEGORY_DATA = [
  { name: 'Documentation', count: 67, percentage: 27 },
  { name: 'Code Review', count: 54, percentage: 22 },
  { name: 'Email Drafting', count: 48, percentage: 19 },
  { name: 'Research', count: 41, percentage: 17 },
  { name: 'File Management', count: 37, percentage: 15 },
];

const AUTOMATION_OPPORTUNITIES = [
  {
    id: '1',
    pattern: 'Summarizing meeting notes',
    frequency: 23,
    recommendation: 'Create a "Meeting Summarizer" skill',
    type: 'skill',
    potential: 'high',
  },
  {
    id: '2',
    pattern: 'Reviewing estimates for missing line items',
    frequency: 18,
    recommendation: 'Create an "Estimate Checker" agent',
    type: 'agent',
    potential: 'high',
  },
  {
    id: '3',
    pattern: 'Drafting adjuster follow-up emails',
    frequency: 15,
    recommendation: 'Create an "Adjuster Email" skill with templates',
    type: 'skill',
    potential: 'medium',
  },
];

const RECENT_TASKS = [
  { id: '1', description: 'Reviewed estimate #4521', time: '2 min ago', status: 'success' },
  { id: '2', description: 'Drafted email to State Farm adjuster', time: '15 min ago', status: 'success' },
  { id: '3', description: 'Searched for drying standards', time: '1 hour ago', status: 'success' },
  { id: '4', description: 'Created job folder structure', time: '2 hours ago', status: 'success' },
  { id: '5', description: 'Failed to fetch pricing data', time: '3 hours ago', status: 'failed' },
];

export function AnalyticsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Task metrics and automation opportunities
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-transparent">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Total Tasks</span>
            </div>
            <p className="text-2xl font-bold">{STATS.totalTasks}</p>
            <p className="text-xs text-green-600">+12% from last week</p>
          </div>
          <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-transparent">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Success Rate</span>
            </div>
            <p className="text-2xl font-bold">{STATS.successRate}%</p>
            <p className="text-xs text-blue-600">+2% from last week</p>
          </div>
          <div className="p-4 border rounded-lg bg-gradient-to-br from-orange-50 to-transparent">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Avg. Time</span>
            </div>
            <p className="text-2xl font-bold">{STATS.avgTime}s</p>
            <p className="text-xs text-orange-600">-1.2s from last week</p>
          </div>
          <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-transparent">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Today</span>
            </div>
            <p className="text-2xl font-bold">{STATS.todayTasks}</p>
            <p className="text-xs text-purple-600">5 more than yesterday</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Category Breakdown */}
          <div className="lg:col-span-2 border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Tasks by Category</h2>
            <div className="space-y-4">
              {CATEGORY_DATA.map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cat.name}</span>
                    <span className="text-muted-foreground">{cat.count} tasks</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {RECENT_TASKS.map((task) => (
                <div key={task.id} className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 mt-2 rounded-full ${
                      task.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{task.description}</p>
                    <p className="text-xs text-muted-foreground">{task.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Automation Opportunities */}
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Automation Opportunities</h2>
              <p className="text-sm text-muted-foreground">
                Patterns we've detected that could be automated
              </p>
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AUTOMATION_OPPORTUNITIES.map((opp) => (
              <div
                key={opp.id}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  {opp.type === 'skill' ? (
                    <Puzzle className="h-4 w-4 text-purple-500" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary" />
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      opp.potential === 'high'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {opp.potential} potential
                  </span>
                </div>

                <p className="font-medium text-sm mb-1">{opp.pattern}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Detected {opp.frequency} times
                </p>

                <div className="flex items-center gap-2 text-xs text-primary">
                  <Zap className="h-3 w-3" />
                  <span>{opp.recommendation}</span>
                </div>

                <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
                  Create {opp.type === 'skill' ? 'Skill' : 'Agent'}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
