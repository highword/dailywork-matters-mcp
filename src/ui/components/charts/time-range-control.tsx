import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { cn } from '../../lib/utils';

interface TimeRangeControlProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const presets = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

function getPresetRange(days: number) {
  const to = format(new Date(), 'yyyy-MM-dd');
  const from = format(subDays(new Date(), days), 'yyyy-MM-dd');
  return { from, to };
}

function detectActivePreset(from: string, to: string): string | null {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (to !== today) return null;
  for (const preset of presets) {
    const expected = format(subDays(new Date(), preset.days), 'yyyy-MM-dd');
    if (from === expected) return preset.label;
  }
  return null;
}

export function TimeRangeControl({ from, to, onChange }: TimeRangeControlProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const activePreset = detectActivePreset(from, to);

  const handlePreset = (days: number) => {
    const range = getPresetRange(days);
    onChange(range.from, range.to);
    setShowCustom(false);
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onChange(customFrom, customTo);
      setShowCustom(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.02em]">
        Period
      </span>
      <div className="flex items-center border border-border">
        {presets.map(({ label, days }) => (
          <button
            key={label}
            type="button"
            onClick={() => handlePreset(days)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out',
              'hover:bg-muted',
              activePreset === label
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out',
            'hover:bg-muted border-l border-border',
            showCustom && !activePreset
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground',
          )}
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-2 py-1 text-xs border border-border bg-background text-foreground font-mono"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-2 py-1 text-xs border border-border bg-background text-foreground font-mono"
          />
          <button
            type="button"
            onClick={handleCustomApply}
            className="px-2 py-1 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors duration-150"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
