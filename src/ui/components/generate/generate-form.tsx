import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../../lib/utils';

interface GenerateFormProps {
  onGenerate: (date: string) => void;
  isGenerating: boolean;
}

export function GenerateForm({ onGenerate, isGenerating }: GenerateFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleGenerate = () => {
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
    </div>
  );
}
