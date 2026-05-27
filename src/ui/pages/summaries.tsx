import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useSummaryDates } from '../hooks/use-summaries';
import { DateList } from '../components/summaries/date-list';
import { SummaryDetail } from '../components/summaries/summary-detail';
import { Button } from '../components/ui/button';

export function Component() {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useSummaryDates();

  // Auto-select most recent date if none selected
  useEffect(() => {
    if (!date && data?.dates?.length) {
      navigate(`/summaries/${data.dates[0]}`, { replace: true });
    }
  }, [date, data, navigate]);

  return (
    <div className="flex h-full">
      {/* Left panel: date list - hidden on mobile when date is selected */}
      <div className={`w-[280px] min-w-[280px] border-r border-border flex flex-col max-md:w-full max-md:min-w-0 ${date ? 'max-md:hidden' : ''}`}>
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-semibold">Summaries</h1>
        </div>
        <DateList
          dates={data?.dates ?? []}
          selectedDate={date}
          onSelect={(d) => navigate(`/summaries/${d}`)}
          isLoading={isLoading}
        />
      </div>
      {/* Right panel: summary detail - hidden on mobile when no date selected */}
      <div className={`flex-1 overflow-auto ${!date ? 'max-md:hidden' : ''}`}>
        {date && (
          <div className="md:hidden p-4 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/summaries')}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        )}
        <SummaryDetail date={date} />
      </div>
    </div>
  );
}
