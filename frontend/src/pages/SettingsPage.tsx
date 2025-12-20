import { Settings, Moon, Sun, Key, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">General Settings</h1>
          <p className="text-muted-foreground">
            Configure your Apex Assistant environment
          </p>
        </div>

        {/* Appearance */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-foreground/90">Appearance</h2>
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-white/5">
                  <Moon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Theme Preference</p>
                  <p className="text-sm text-muted-foreground">Customize your interface appearance</p>
                </div>
              </div>
              <div className="flex gap-2 bg-black/20 p-1 rounded-lg">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </Button>
                <Button variant="secondary" size="sm" className="bg-white/10 text-white shadow-sm">
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* API Configuration */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-foreground/90">System Configuration</h2>
          <div className="glass-card rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-white/5">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">API Connection</p>
                  <p className="text-sm text-muted-foreground">Anthropic Claude API status</p>
                </div>
              </div>
              <span className="flex items-center gap-2 text-sm px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full font-medium">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Connected
              </span>
            </div>
            
            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-white/5">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Working Directory</p>
                  <p className="text-sm text-muted-foreground font-mono mt-0.5">
                    {window.location.pathname}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground">
                Manage
              </Button>
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-foreground/90">About</h2>
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-orange-600 shadow-lg shadow-orange-900/20">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">Apex Assistant</p>
                <p className="text-sm text-muted-foreground">Version 2.0.0 (Visual Overhaul)</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              An intelligent restoration management assistant built for Apex Restoration LLC. 
              Powered by the Claude Agent SDK and React 19.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
