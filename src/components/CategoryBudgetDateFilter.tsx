import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import type { DateRange as CalendarDateRange } from "react-day-picker";

export type DateFilterType = 'today' | 'week' | 'month' | 'semiannual' | 'year' | 'custom' | 'all';

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface CategoryBudgetDateFilterProps {
  onFilterChange: (filterType: DateFilterType, dateRange?: DateRange) => void;
  currentFilter: DateFilterType;
  currentRange?: DateRange;
}

export const CategoryBudgetDateFilter = ({ onFilterChange, currentFilter, currentRange }: CategoryBudgetDateFilterProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<CalendarDateRange | undefined>(() => {
    if (currentRange?.from && currentRange?.to) {
      return { from: currentRange.from, to: currentRange.to };
    }
    return undefined;
  });

  const getFilterLabel = () => {
    switch (currentFilter) {
      case 'today':
        return 'Hoje';
      case 'week':
        return 'Esta Semana';
      case 'month':
        return 'Este Mês';
      case 'semiannual':
        return 'Este Semestre';
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
      case 'semiannual':
        // Período semestral - 6 meses
        const month = now.getMonth();
        const year = now.getFullYear();
        const semesterStart = month < 6 ? new Date(year, 0, 1) : new Date(year, 6, 1);
        const semesterEnd = month < 6 ? new Date(year, 5, 30) : new Date(year, 11, 31);
        dateRange = {
          from: semesterStart,
          to: semesterEnd
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

  const handleCustomDateSelect = (range: CalendarDateRange | undefined) => {
    console.log('Selecionando data range:', range);
    setCustomDateRange(range);
    
    // NÃO aplicar o filtro automaticamente - apenas atualizar o estado
    // O usuário deve clicar no botão "Aplicar" para confirmar o período
  };

  const applyCustomRange = () => {
    if (customDateRange?.from && customDateRange?.to) {
      console.log('Aplicando range completo:', { from: customDateRange.from, to: customDateRange.to });
      const dateRange: DateRange = {
        from: customDateRange.from,
        to: customDateRange.to
      };
      onFilterChange('custom', dateRange);
      setIsOpen(false);
    } else {
      toast({
        title: "Período incompleto",
        description: "Selecione a data inicial e final do período",
        variant: "destructive",
      });
    }
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
                  variant={currentFilter === 'semiannual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('semiannual')}
                  className="justify-start"
                >
                  Este Semestre
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

            <Separator />

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