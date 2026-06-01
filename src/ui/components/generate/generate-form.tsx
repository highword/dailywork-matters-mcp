import { useState } from 'react';
import { useNavigate } from 'react-router';
import { format } from 'date-fns';
import { CalendarIcon, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useConfig } from '../../hooks/use-config';
import { cn } from '../../lib/utils';

interface GenerateFormProps {
  onGenerate: (date: string) => void;
  isGenerating: boolean;
}

export function GenerateForm({ onGenerate, isGenerating }: GenerateFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const { data: config } = useConfig();
  const navigate = useNavigate();

  const handleGenerate = () => {
    if (!config) return;
    if (!config.ai?.apiKey) {
      setShowApiKeyDialog(true);
      return;
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    onGenerate(dateStr);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground mb-2 block">
          Date
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[240px] justify-start text-left font-normal',
                !selectedDate && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => date > new Date()}
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground mt-1">Defaults to today</p>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="mt-4"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          'Generate Summary'
        )}
      </Button>

      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              API Key Required
            </DialogTitle>
            <DialogDescription>
              An API key is needed to generate AI-powered summaries. Configure one in Settings to get started.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              Close
            </Button>
            <Button onClick={() => navigate('/settings')}>
              Go to Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
