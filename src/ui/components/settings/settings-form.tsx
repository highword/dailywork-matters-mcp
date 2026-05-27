import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useConfig, useUpdateConfig } from '../../hooks/use-config';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Eye, EyeOff } from 'lucide-react';

interface FormConfig {
  outputDir: string;
  language: string;
  claudeSessionsDir: string;
  gitRepoScanDirs: string[];
  gitRepoManual: string[];
  gitIdentities: string[];
  ai: {
    apiKey: string | null;
    windowModel: string;
    mergeModel: string;
  };
  outputFormats: ('markdown' | 'html')[];
  httpPort: number;
  scheduleTime: string | null;
  dbPath: string;
  maxTasksPerSummary: number;
  showFileList: boolean;
  showTokenStats: boolean;
}

const DEFAULT_CONFIG: FormConfig = {
  outputDir: '~/dailywork-matters/summaries',
  language: 'en',
  claudeSessionsDir: '~/.claude/projects',
  gitRepoScanDirs: [],
  gitRepoManual: [],
  gitIdentities: [],
  ai: {
    apiKey: null,
    windowModel: 'claude-haiku-4-5-20251001',
    mergeModel: 'claude-sonnet-4-6-20250514',
  },
  outputFormats: ['markdown'],
  httpPort: 37888,
  scheduleTime: null,
  dbPath: '~/.dailywork-matters/db.sqlite',
  maxTasksPerSummary: 20,
  showFileList: true,
  showTokenStats: true,
};

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
}

export function SettingsForm() {
  const { data, isLoading } = useConfig();
  const updateConfig = useUpdateConfig();
  const [formState, setFormState] = useState<FormConfig>(DEFAULT_CONFIG);
  const [showApiKey, setShowApiKey] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Initialize form state from loaded config
  useEffect(() => {
    if (data) {
      setFormState(data as FormConfig);
    }
  }, [data]);

  const isDirty = useMemo(() => {
    if (!data) return false;
    return !deepEqual(formState, data);
  }, [formState, data]);

  const handleSave = () => {
    updateConfig.mutate(formState, {
      onSuccess: () => {
        toast.success('Settings saved.');
      },
      onError: (error) => {
        toast.error(`Failed to save settings: ${error.message}`);
      },
    });
  };

  const handleReset = () => {
    updateConfig.mutate(DEFAULT_CONFIG, {
      onSuccess: () => {
        setFormState(DEFAULT_CONFIG);
        setResetDialogOpen(false);
        toast.success('Settings reset to defaults.');
      },
      onError: (error) => {
        toast.error(`Failed to save settings: ${error.message}`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-48 bg-muted" />
        <div className="h-10 w-full bg-muted" />
        <div className="h-10 w-full bg-muted" />
        <div className="h-10 w-full bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* AI Configuration */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">
          AI Configuration
        </h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                value={formState.ai.apiKey ?? ''}
                onChange={(e) =>
                  setFormState((s) => ({
                    ...s,
                    ai: { ...s.ai, apiKey: e.target.value || null },
                  }))
                }
                placeholder="sk-ant-..."
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowApiKey(!showApiKey)}
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="window-model">Window Model</Label>
            <Input
              id="window-model"
              value={formState.ai.windowModel}
              onChange={(e) =>
                setFormState((s) => ({
                  ...s,
                  ai: { ...s.ai, windowModel: e.target.value },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="merge-model">Merge Model</Label>
            <Input
              id="merge-model"
              value={formState.ai.mergeModel}
              onChange={(e) =>
                setFormState((s) => ({
                  ...s,
                  ai: { ...s.ai, mergeModel: e.target.value },
                }))
              }
            />
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">
          Data Sources
        </h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="claude-sessions-dir">Claude Sessions Directory</Label>
            <Input
              id="claude-sessions-dir"
              value={formState.claudeSessionsDir}
              onChange={(e) =>
                setFormState((s) => ({ ...s, claudeSessionsDir: e.target.value }))
              }
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="git-scan-dirs">Git Repo Scan Directories</Label>
            <textarea
              id="git-scan-dirs"
              className="flex min-h-[80px] w-full border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              value={formState.gitRepoScanDirs.join('\n')}
              onChange={(e) =>
                setFormState((s) => ({
                  ...s,
                  gitRepoScanDirs: e.target.value.split('\n').filter((l) => l.trim()),
                }))
              }
              placeholder="One directory per line"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="git-identities">Git Identities</Label>
            <textarea
              id="git-identities"
              className="flex min-h-[60px] w-full border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              value={formState.gitIdentities.join('\n')}
              onChange={(e) =>
                setFormState((s) => ({
                  ...s,
                  gitIdentities: e.target.value.split('\n').filter((l) => l.trim()),
                }))
              }
              placeholder="One email/name per line"
            />
          </div>
        </div>
      </section>

      {/* Output */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">
          Output
        </h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="output-dir">Output Directory</Label>
            <Input
              id="output-dir"
              value={formState.outputDir}
              onChange={(e) =>
                setFormState((s) => ({ ...s, outputDir: e.target.value }))
              }
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="language">Language</Label>
            <Select
              id="language"
              value={formState.language}
              onChange={(e) =>
                setFormState((s) => ({ ...s, language: e.target.value }))
              }
            >
              <option value="en">English</option>
              <option value="zh">Chinese</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max-tasks">Max Tasks per Summary</Label>
            <Input
              id="max-tasks"
              type="number"
              min={1}
              max={100}
              value={formState.maxTasksPerSummary}
              onChange={(e) =>
                setFormState((s) => ({
                  ...s,
                  maxTasksPerSummary: Number.parseInt(e.target.value, 10) || 20,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Output Formats</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 border border-input accent-accent"
                  checked={formState.outputFormats.includes('markdown')}
                  onChange={(e) => {
                    setFormState((s) => {
                      const formats = e.target.checked
                        ? [...s.outputFormats, 'markdown' as const]
                        : s.outputFormats.filter((f) => f !== 'markdown');
                      return { ...s, outputFormats: formats };
                    });
                  }}
                />
                Markdown
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 border border-input accent-accent"
                  checked={formState.outputFormats.includes('html')}
                  onChange={(e) => {
                    setFormState((s) => {
                      const formats = e.target.checked
                        ? [...s.outputFormats, 'html' as const]
                        : s.outputFormats.filter((f) => f !== 'html');
                      return { ...s, outputFormats: formats };
                    });
                  }}
                />
                HTML
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Display */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">
          Display
        </h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 border border-input accent-accent"
              checked={formState.showFileList}
              onChange={(e) =>
                setFormState((s) => ({ ...s, showFileList: e.target.checked }))
              }
            />
            Show File List
          </label>
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 border border-input accent-accent"
              checked={formState.showTokenStats}
              onChange={(e) =>
                setFormState((s) => ({ ...s, showTokenStats: e.target.checked }))
              }
            />
            Show Token Stats
          </label>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={!isDirty || updateConfig.isPending}
        >
          {updateConfig.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button
          variant="destructive"
          onClick={() => setResetDialogOpen(true)}
        >
          Reset to Defaults
        </Button>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to Defaults</DialogTitle>
            <DialogDescription>
              This will reset all settings to their default values. Your summaries will not be affected. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
