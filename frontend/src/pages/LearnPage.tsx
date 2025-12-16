import { useState } from 'react';
import {
  BookOpen,
  MessageSquare,
  Bot,
  Puzzle,
  Server,
  BarChart3,
  Lightbulb,
  ChevronRight,
  Search,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  articles: {
    id: string;
    title: string;
    description: string;
    readTime: string;
  }[];
}

const DOCUMENTATION: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <BookOpen className="h-5 w-5 text-primary" />,
    articles: [
      {
        id: 'welcome',
        title: 'Welcome to Apex Assistant',
        description: 'Overview of features and what you can accomplish',
        readTime: '3 min',
      },
      {
        id: 'first-conversation',
        title: 'Your First Conversation',
        description: 'Learn the basics of chatting with the assistant',
        readTime: '5 min',
      },
      {
        id: 'quick-start',
        title: 'Quick Start Guide',
        description: 'Get up and running in 10 minutes',
        readTime: '10 min',
      },
    ],
  },
  {
    id: 'features',
    title: 'Features',
    icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
    articles: [
      {
        id: 'chat-interface',
        title: 'Chat Interface',
        description: 'Streaming responses, tool usage, file attachments',
        readTime: '4 min',
      },
      {
        id: 'agents-overview',
        title: 'Understanding Agents',
        description: 'What agents are and when to use them',
        readTime: '6 min',
      },
      {
        id: 'skills-overview',
        title: 'Understanding Skills',
        description: 'Reusable capabilities with clear inputs/outputs',
        readTime: '5 min',
      },
      {
        id: 'mcp-servers',
        title: 'MCP Servers',
        description: 'Connecting external tools and services',
        readTime: '7 min',
      },
      {
        id: 'analytics',
        title: 'Analytics & Insights',
        description: 'Track metrics and find automation opportunities',
        readTime: '4 min',
      },
    ],
  },
  {
    id: 'agents',
    title: 'Working with Agents',
    icon: <Bot className="h-5 w-5 text-green-500" />,
    articles: [
      {
        id: 'creating-agents-ai',
        title: 'Creating Agents (AI-Assisted)',
        description: 'Let the assistant build agents for you',
        readTime: '5 min',
      },
      {
        id: 'creating-agents-manual',
        title: 'Creating Agents (Manual)',
        description: 'Step-by-step wizard for full control',
        readTime: '8 min',
      },
      {
        id: 'agent-capabilities',
        title: 'Agent Capabilities & Tools',
        description: 'Understanding what tools agents can use',
        readTime: '6 min',
      },
      {
        id: 'agent-best-practices',
        title: 'Agent Best Practices',
        description: 'Design patterns for effective agents',
        readTime: '7 min',
      },
    ],
  },
  {
    id: 'skills',
    title: 'Working with Skills',
    icon: <Puzzle className="h-5 w-5 text-purple-500" />,
    articles: [
      {
        id: 'skills-vs-agents',
        title: 'Skills vs Agents',
        description: 'When to use each type of automation',
        readTime: '4 min',
      },
      {
        id: 'creating-skills',
        title: 'Creating Skills',
        description: 'Build reusable capabilities step by step',
        readTime: '6 min',
      },
      {
        id: 'skill-templates',
        title: 'Skill Templates',
        description: 'Start from pre-built templates',
        readTime: '3 min',
      },
    ],
  },
  {
    id: 'mcp',
    title: 'MCP Configuration',
    icon: <Server className="h-5 w-5 text-orange-500" />,
    articles: [
      {
        id: 'what-is-mcp',
        title: 'What is MCP?',
        description: 'Model Context Protocol explained',
        readTime: '5 min',
      },
      {
        id: 'adding-servers',
        title: 'Adding MCP Servers',
        description: 'Connect new tools to your assistant',
        readTime: '6 min',
      },
      {
        id: 'server-types',
        title: 'Server Types (stdio/sse/http)',
        description: 'Understanding different connection types',
        readTime: '5 min',
      },
      {
        id: 'troubleshooting-mcp',
        title: 'Troubleshooting Connections',
        description: 'Common issues and solutions',
        readTime: '4 min',
      },
    ],
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
    articles: [
      {
        id: 'effective-prompts',
        title: 'Writing Effective Prompts',
        description: 'Get better results from your conversations',
        readTime: '6 min',
      },
      {
        id: 'designing-agents',
        title: 'Designing Agents',
        description: 'Create agents that work well for your needs',
        readTime: '7 min',
      },
      {
        id: 'security-considerations',
        title: 'Security Considerations',
        description: 'Keep your data and systems safe',
        readTime: '5 min',
      },
    ],
  },
];

export function LearnPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = searchQuery
    ? DOCUMENTATION.map((section) => ({
        ...section,
        articles: section.articles.filter(
          (article) =>
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((section) => section.articles.length > 0)
    : DOCUMENTATION;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Documentation</h1>
          <p className="text-muted-foreground">
            Learn how to use Apex Assistant effectively
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documentation..."
            className="w-full pl-10 pr-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Quick Links */}
        {!searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <button className="p-4 text-left border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors group">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-semibold">Quick Start</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Get up and running in 10 minutes
              </p>
              <span className="text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Read guide <ChevronRight className="h-3 w-3" />
              </span>
            </button>

            <button className="p-4 text-left border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors group">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Create Your First Agent</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Build a specialized assistant
              </p>
              <span className="text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Start tutorial <ChevronRight className="h-3 w-3" />
              </span>
            </button>

            <button className="p-4 text-left border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors group">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">Best Practices</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Tips for getting the most out of Apex
              </p>
              <span className="text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more <ChevronRight className="h-3 w-3" />
              </span>
            </button>
          </div>
        )}

        {/* Documentation Sections */}
        <div className="space-y-8">
          {filteredDocs.map((section) => (
            <div key={section.id}>
              <div className="flex items-center gap-2 mb-4">
                {section.icon}
                <h2 className="text-lg font-semibold">{section.title}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.articles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => console.log('Open article:', article.id)}
                    className="p-4 text-left border rounded-lg hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {article.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {article.description}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground ml-4">
                        {article.readTime}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State for Search */}
        {searchQuery && filteredDocs.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground mb-4">
              Try searching for something else
            </p>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Clear search
            </Button>
          </div>
        )}

        {/* Video Tutorials Section */}
        {!searchQuery && (
          <div className="mt-12 border rounded-lg p-6 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center gap-2 mb-4">
              <ExternalLink className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Video Tutorials</h2>
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                Coming Soon
              </span>
            </div>
            <p className="text-muted-foreground mb-4">
              Step-by-step video guides for visual learners. We're working on creating
              comprehensive video tutorials for each feature.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Getting Started', 'Building Agents', 'MCP Setup'].map((title) => (
                <div
                  key={title}
                  className="p-4 border border-dashed rounded-lg text-center text-muted-foreground"
                >
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs">Coming soon</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        {!searchQuery && (
          <div className="mt-8 p-4 border rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Was this helpful?</p>
                <p className="text-sm text-muted-foreground">
                  Let us know how we can improve the documentation
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Yes
              </Button>
              <Button variant="outline" size="sm">
                No
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
