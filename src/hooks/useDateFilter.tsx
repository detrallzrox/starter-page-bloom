import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

export type DateFilterType = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

export interface DateRange {
  from?: Date;
  to?: Date;
}

export const useDateFilter = () => {
  const [filterType, setFilterType] = useState<DateFilterType>('month');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Usar horário de Brasília (UTC-3)
    const now = toZonedTime(new Date(), 'America/Sao_Paulo');
    return {
      from: startOfMonth(now),
      to: endOfMonth(now)
    };
  });

  const handleFilterChange = (newFilterType: DateFilterType, newDateRange?: DateRange) => {
    setFilterType(newFilterType);
    if (newDateRange !== undefined) {
      setDateRange(newDateRange);
    }
  };

  const isDateInRange = useMemo(() => {
    if (filterType === 'all' || !dateRange.from || !dateRange.to) {
      return () => true;
    }

    return (date: Date) => {
      return date >= dateRange.from! && date <= dateRange.to!;
    };
  }, [filterType, dateRange]);

  const filterTransactions = useMemo(() => {
    return (transactions: any[]) => {
      if (filterType === 'all') {
        return transactions;
      }

      if (!dateRange.from || !dateRange.to) {
        return transactions;
      }

      return transactions.filter(transaction => {
        // Pegar apenas a data da transação (formato YYYY-MM-DD)
        const transactionDateStr = transaction.date;
        
        // Obter data atual em Brasília para comparação
        const hoje = toZonedTime(new Date(), 'America/Sao_Paulo');
        const hojeStr = format(hoje, 'yyyy-MM-dd');
        
        // Para filtro "hoje", comparar diretamente as strings de data
        if (filterType === 'today') {
          return transactionDateStr === hojeStr;
        }
        
        // Para outros filtros, usar a lógica de range
        const [year, month, day] = transactionDateStr.split('-').map(Number);
        const transactionDate = new Date(year, month - 1, day);
        
        const rangeFrom = toZonedTime(dateRange.from!, 'America/Sao_Paulo');
        const rangeTo = toZonedTime(dateRange.to!, 'America/Sao_Paulo');
        
        // Comparar usando apenas ano, mês e dia para garantir precisão
        const transactionYear = transactionDate.getFullYear();
        const transactionMonth = transactionDate.getMonth();
        const transactionDay = transactionDate.getDate();
        
        const rangeFromYear = rangeFrom.getFullYear();
        const rangeFromMonth = rangeFrom.getMonth();
        const rangeFromDay = rangeFrom.getDate();
        
        const rangeToYear = rangeTo.getFullYear();
        const rangeToMonth = rangeTo.getMonth();
        const rangeToDay = rangeTo.getDate();
        
        // Criar representações numéricas das datas para comparação exata
        const transactionDateNum = transactionYear * 10000 + transactionMonth * 100 + transactionDay;
        const rangeFromDateNum = rangeFromYear * 10000 + rangeFromMonth * 100 + rangeFromDay;
        const rangeToDateNum = rangeToYear * 10000 + rangeToMonth * 100 + rangeToDay;
        
        // Comparar apenas as datas (ignorando completamente o horário)
        return transactionDateNum >= rangeFromDateNum && transactionDateNum <= rangeToDateNum;
      });
    };
  }, [filterType, dateRange]);

  return {
    filterType,
    dateRange,
    handleFilterChange,
    filterTransactions,
    isDateInRange
  };
};