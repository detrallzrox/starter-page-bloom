import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import type { DateRange as CalendarDateRange } from "react-day-picker";

export type DateFilterType = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface DateFilterProps {
  onFilterChange: (filterType: DateFilterType, dateRange?: DateRange) => void;
  currentFilter: DateFilterType;
  currentRange?: DateRange;
}

export const DateFilter = ({ onFilterChange, currentFilter, currentRange }: DateFilterProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);

  const getFilterLabel = () => {
    switch (currentFilter) {
      case 'today':
        return 'Hoje';
      case 'week':
        return 'Esta Semana';
      case 'month':
        return 'Este Mês';
      case 'year':
        return 'Este Ano';
      case 'custom':
        if (currentRange?.from && currentRange?.to) {
          return `${format(currentRange.from, 'dd/MM/yy', { locale: ptBR })} - ${format(currentRange.to, 'dd/MM/yy', { locale: ptBR })}`;
        }
        return 'Período Personalizado';
      case 'all':
        return 'Tempo Integral';
      default:
        return 'Este Mês';
    }
  };

  const handleQuickFilter = (filterType: DateFilterType) => {
    // Usar horário de Brasília (UTC-3)
    const now = toZonedTime(new Date(), 'America/Sao_Paulo');
    let dateRange: DateRange = {};

    switch (filterType) {
      case 'today':
        // Para "hoje", usar apenas a data atual sem consideração de horário
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateRange = {
          from: todayDate,
          to: todayDate
        };
        break;
      case 'week':
        dateRange = {
          from: startOfWeek(now, { weekStartsOn: 0 }),
          to: endOfWeek(now, { weekStartsOn: 0 })
        };
        break;
      case 'month':
        dateRange = {
          from: startOfMonth(now),
          to: endOfMonth(now)
        };
        break;
      case 'year':
        dateRange = {
          from: startOfYear(now),
          to: endOfYear(now)
        };
        break;
      case 'all':
        dateRange = {};
        break;
    }

    onFilterChange(filterType, dateRange);
    setIsOpen(false);
  };

  const handleCustomRange = () => {
    if (startDate && endDate) {
      const fromDate = new Date(startDate);
      const toDate = new Date(endDate);
      
      if (fromDate <= toDate) {
        onFilterChange('custom', {
          from: startOfDay(fromDate),
          to: endOfDay(toDate)
        });
        setIsCustomRangeOpen(false);
        setIsOpen(false);
      } else {
        toast({
          title: "Erro",
          description: "A data inicial deve ser anterior à data final",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Período incompleto",
        description: "Selecione a data inicial e final do período",
        variant: "destructive",
      });
    }
  };

  const generateFutureOptions = () => {
    // Usar horário de Brasília (UTC-3)
    const now = toZonedTime(new Date(), 'America/Sao_Paulo');
    const options = [];

    // Próximos 6 meses
    for (let i = 1; i <= 6; i++) {
      const futureMonth = addMonths(now, i);
      options.push({
        label: format(futureMonth, 'MMMM yyyy', { locale: ptBR }),
        value: 'future-month',
        dateRange: {
          from: startOfMonth(futureMonth),
          to: endOfMonth(futureMonth)
        }
      });
    }

    // Próximo ano
    const nextYear = addYears(now, 1);
    options.push({
      label: format(nextYear, 'yyyy', { locale: ptBR }),
      value: 'future-year',
      dateRange: {
        from: startOfYear(nextYear),
        to: endOfYear(nextYear)
      }
    });

    return options;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between text-left font-normal"
        >
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getFilterLabel()}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Filtros Rápidos */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Períodos</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={currentFilter === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('today')}
                  className="justify-start"
                >
                  Hoje
                </Button>
                <Button
                  variant={currentFilter === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('week')}
                  className="justify-start"
                >
                  Esta Semana
                </Button>
                <Button
                  variant={currentFilter === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('month')}
                  className="justify-start"
                >
                  Este Mês
                </Button>
                <Button
                  variant={currentFilter === 'year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('year')}
                  className="justify-start"
                >
                  Este Ano
                </Button>
              </div>
            </div>

            {/* Meses Futuros */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Períodos Futuros</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {generateFutureOptions().map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => onFilterChange('custom', option.dateRange)}
                    className="w-full justify-start text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Período Personalizado */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Período Personalizado</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustomRangeOpen(!isCustomRangeOpen)}
                className="w-full justify-start"
              >
                Escolher Período
              </Button>
              
              {isCustomRangeOpen && (
                <div className="space-y-4 p-4 border rounded-lg bg-background">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="start-date" className="text-xs font-medium">Data Inicial</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date" className="text-xs font-medium">Data Final</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleCustomRange}
                    className="w-full"
                    disabled={!startDate || !endDate}
                  >
                    Aplicar Período
                  </Button>
                </div>
              )}
            </div>

            {/* Tempo Integral */}
            <Button
              variant={currentFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickFilter('all')}
              className="w-full justify-start"
            >
              Ver Tempo Integral
            </Button>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};