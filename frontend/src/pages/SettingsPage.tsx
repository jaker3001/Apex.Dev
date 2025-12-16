import { Settings, Moon, Sun, Key, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your Apex Assistant
          </p>
        </div>

        {/* Appearance */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Appearance</h2>
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Choose light or dark mode</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </Button>
                <Button variant="outline" size="sm">
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* API Configuration */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">API Configuration</h2>
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">API Key Status</p>
                  <p className="text-sm text-muted-foreground">Anthropic API key</p>
                </div>
              </div>
              <span className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded-full">
                Configured
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Working Directory</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {window.location.pathname}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Change
              </Button>
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-lg font-semibold mb-4">About</h2>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Apex Assistant</p>
                <p className="text-sm text-muted-foreground">Version 1.0.0</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              AI assistant for Apex Restoration LLC, built on the Claude Agent SDK.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
