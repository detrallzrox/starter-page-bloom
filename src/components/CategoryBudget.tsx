import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Calculator, Calendar, TrendingDown, TrendingUp, Target, PieChart, X, Edit, RotateCcw, Search } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { useAccountContext } from "@/hooks/useAccountContext";
import { useToast } from "@/components/ui/use-toast";
import { format, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { CategoryBudgetDateFilter, type DateFilterType, type DateRange } from "./CategoryBudgetDateFilter";
import { AdBanner } from "./AdBanner";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CategoryBudget {
  id: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  budget_amount: number;
  period_start: string;
  period_end: string;
  period_type: string;
  auto_renew?: boolean;
}

interface BudgetAnalysis {
  category_id: string;
  category_name: string;
  category_icon: string;
  budget_amount: number;
  spent_amount: number;
  remaining: number;
  percentage_used: number;
  status: 'under' | 'near' | 'over';
}

export const CategoryBudget = () => {
  const { isPremium } = useCurrentAccountPremium();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [filterType, setFilterType] = useState<DateFilterType>('month');
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      from: startOfMonth(now),
      to: endOfMonth(now)
    };
  });
  const queryClient = useQueryClient();
  
  const [newBudget, setNewBudget] = useState({
    category_id: '',
    budget_amount: '',
    period_type: 'monthly',
    auto_renew: false
  });

  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    category_id: '',
    budget_amount: '',
    period_type: 'monthly',
    auto_renew: false
  });

  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const { categories, transactions } = useTransactions();
  const { toast } = useToast();

  const expenseCategories = categories.filter(cat => cat.type === 'expense');
  const userId = currentAccount?.id || user?.id;

  const calculatePeriodRange = (periodType: string, baseDate: Date = new Date()) => {
    switch (periodType) {
      case 'daily':
        return { start: startOfDay(baseDate), end: endOfDay(baseDate) };
      case 'weekly':
        return { start: startOfWeek(baseDate), end: endOfWeek(baseDate) };
      case 'monthly':
        return { start: startOfMonth(baseDate), end: endOfMonth(baseDate) };
      case 'semiannual':
        const month = baseDate.getMonth();
        const year = baseDate.getFullYear();
        const semesterStart = month < 6 ? new Date(year, 0, 1) : new Date(year, 6, 1);
        const semesterEnd = month < 6 ? new Date(year, 5, 30) : new Date(year, 11, 31);
        return { start: startOfDay(semesterStart), end: endOfDay(semesterEnd) };
      case 'annual':
        return { start: startOfYear(baseDate), end: endOfYear(baseDate) };
      default:
        return { start: startOfMonth(baseDate), end: endOfMonth(baseDate) };
    }
  };

  // Query para carregar orçamentos do Supabase
  const { data: allBudgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['category-budgets', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Buscar todos os orçamentos do usuário uma única vez
      const { data, error } = await supabase
        .from('category_budgets')
        .select('*, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enriquecer com dados da categoria
      return (data || []).map(budget => ({
        ...budget,
        category_name: categories.find(c => c.id === budget.category_id)?.name || 'Categoria',
        category_icon: categories.find(c => c.id === budget.category_id)?.icon || '📂'
      }));
    },
    enabled: !!userId && !!isOpen,
  });

  // Filtrar orçamentos baseado no tipo de período e filtro de data selecionado
  const budgets = useMemo(() => {
    if (!allBudgets.length) return [];
    
    // Se "Ver em Tempo Integral", mostrar todos
    if (filterType === 'all') {
      return allBudgets;
    }

    // Mapear filtros de data para tipos de período de orçamento (correspondência exata)
    const filterToPeriodType: Record<DateFilterType, string[]> = {
      'today': ['daily'],
      'week': ['weekly'], 
      'month': ['monthly'],
      'semiannual': ['semiannual'],
      'year': ['annual'],
      'custom': [], // Para custom, permitir qualquer tipo
      'all': [] // Já tratado acima
    };

    const allowedPeriodTypes = filterToPeriodType[filterType] || [];

    // Para filtro personalizado, verificar se é semestral (6 meses) e permitir qualquer tipo
    if (filterType === 'custom' && dateRange.from && dateRange.to) {
      const diffInMonths = Math.abs(
        (dateRange.to.getFullYear() - dateRange.from.getFullYear()) * 12 + 
        (dateRange.to.getMonth() - dateRange.from.getMonth())
      );
      
      // Se for aproximadamente 6 meses, também incluir orçamentos semestrais
      if (diffInMonths >= 5 && diffInMonths <= 7) {
        return allBudgets.filter(budget => 
          budget.period_type === 'semiannual' || allowedPeriodTypes.length === 0
        );
      }
      
      // Para outros filtros personalizados, mostrar todos os tipos
      return allBudgets;
    }

    // Filtrar apenas orçamentos que correspondem exatamente ao tipo de período selecionado
    return allBudgets.filter(budget => 
      allowedPeriodTypes.includes(budget.period_type)
    );
  }, [allBudgets, filterType, dateRange]);

  // Mutation para salvar orçamento
  const saveBudgetMutation = useMutation({
    mutationFn: async (budgetData: {
      category_id: string;
      budget_amount: number;
      period_start: string;
      period_end: string;
      period_type: string;
      auto_renew: boolean;
    }) => {
      const { data, error } = await supabase
        .from('category_budgets')
        .upsert({
          user_id: userId,
          ...budgetData
        }, {
          onConflict: 'user_id,category_id,period_start,period_end'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-budgets', userId] });
      toast({
        title: "Orçamento salvo!",
        description: "Orçamento definido com sucesso",
      });
      setNewBudget({ category_id: '', budget_amount: '', period_type: 'monthly', auto_renew: false });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar orçamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar orçamento
  const deleteBudgetMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      const { error } = await supabase
        .from('category_budgets')
        .delete()
        .eq('id', budgetId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-budgets', userId] });
      toast({
        title: "Orçamento removido",
        description: "Orçamento excluído com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover orçamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveBudget = () => {
    if (!newBudget.category_id || !newBudget.budget_amount || !userId) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione uma categoria e defina um valor",
        variant: "destructive",
      });
      return;
    }

    const budgetAmount = parseFloat(newBudget.budget_amount.replace(',', '.'));
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor válido maior que zero",
        variant: "destructive",
      });
      return;
    }

    const periodRange = calculatePeriodRange(newBudget.period_type, dateRange.from || new Date());

    saveBudgetMutation.mutate({
      category_id: newBudget.category_id,
      budget_amount: budgetAmount,
      period_start: format(periodRange.start, 'yyyy-MM-dd'),
      period_end: format(periodRange.end, 'yyyy-MM-dd'),
      period_type: newBudget.period_type,
      auto_renew: newBudget.auto_renew,
    });
  };

  const deleteBudget = (budgetId: string) => {
    deleteBudgetMutation.mutate(budgetId);
  };

  const editBudget = (budget: CategoryBudget) => {
    setEditingBudget(budget);
    setEditFormData({
      category_id: budget.category_id,
      budget_amount: budget.budget_amount.toString(),
      period_type: budget.period_type,
      auto_renew: budget.auto_renew || false
    });
    setEditModalOpen(true);
  };

  const saveEditBudget = () => {
    if (!editFormData.category_id || !editFormData.budget_amount || !userId || !editingBudget) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione uma categoria e defina um valor",
        variant: "destructive",
      });
      return;
    }

    const budgetAmount = parseFloat(editFormData.budget_amount.replace(',', '.'));
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor válido maior que zero",
        variant: "destructive",
      });
      return;
    }

    const periodRange = calculatePeriodRange(editFormData.period_type, dateRange.from || new Date());

    // Update mutation for edit
    const updateMutation = async () => {
      const { data, error } = await supabase
        .from('category_budgets')
        .update({
          category_id: editFormData.category_id,
          budget_amount: budgetAmount,
          period_start: format(periodRange.start, 'yyyy-MM-dd'),
          period_end: format(periodRange.end, 'yyyy-MM-dd'),
          period_type: editFormData.period_type,
          auto_renew: editFormData.auto_renew,
        })
        .eq('id', editingBudget.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    };

    updateMutation()
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['category-budgets', userId] });
        toast({
          title: "Orçamento atualizado!",
          description: "Orçamento atualizado com sucesso",
        });
        setEditModalOpen(false);
        setEditingBudget(null);
        setEditFormData({ category_id: '', budget_amount: '', period_type: 'monthly', auto_renew: false });
      })
      .catch((error) => {
        toast({
          title: "Erro ao atualizar orçamento",
          description: error.message,
          variant: "destructive",
        });
      });
  };


  // Analisar gastos vs orçamento
  const analyzeBudgets = (): BudgetAnalysis[] => {
    return budgets.map(budget => {
      // Para cada orçamento, calcular o período correto baseado no seu tipo
      const currentPeriod = calculatePeriodRange(budget.period_type, new Date());
      
      // Filtrar transações da categoria no período correto do orçamento
      const categoryTransactions = transactions.filter(transaction => {
        if (transaction.category_id !== budget.category_id || transaction.type !== 'expense') {
          return false;
        }
        
        // Parse correto da data da transação forçando horário 00:00:00
        const transactionDate = new Date(transaction.date + 'T00:00:00');
        
        // Verificar se a transação foi criada após a criação do orçamento
        const transactionCreatedAt = new Date(transaction.created_at);
        const budgetCreatedAt = new Date(budget.created_at);
        
        if (transactionCreatedAt < budgetCreatedAt) {
          return false;
        }
        
        // Usar o período específico do orçamento normalizado para comparação correta
        return isWithinInterval(transactionDate, { 
          start: startOfDay(currentPeriod.start), 
          end: endOfDay(currentPeriod.end) 
        });
      });

      const spentAmount = categoryTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      const remaining = budget.budget_amount - spentAmount;
      const percentageUsed = (spentAmount / budget.budget_amount) * 100;
      
      let status: 'under' | 'near' | 'over' = 'under';
      if (percentageUsed >= 100) status = 'over';
      else if (percentageUsed >= 80) status = 'near';

      return {
        category_id: budget.category_id,
        category_name: budget.category_name,
        category_icon: budget.category_icon,
        budget_amount: budget.budget_amount,
        spent_amount: spentAmount,
        remaining,
        percentage_used: Math.min(percentageUsed, 100),
        status
      };
    });
  };

  const budgetAnalysis = analyzeBudgets();
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.budget_amount, 0);
  const totalSpent = budgetAnalysis.reduce((sum, analysis) => sum + analysis.spent_amount, 0);
  const totalRemaining = totalBudget - totalSpent;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over': return 'destructive';
      case 'near': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'over': return 'Excedido';
      case 'near': return 'Próximo do limite';
      default: return 'Dentro do orçamento';
    }
  };

  const getPeriodTypeLabel = (periodType: string) => {
    switch (periodType) {
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'monthly': return 'Mensal';
      case 'semiannual': return 'Semestral';
      case 'annual': return 'Anual';
      default: return 'Mensal';
    }
  };

  // Listener para eventos customizados de abertura de modal
  useEffect(() => {
    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener('open-category-budget-modal', handleOpenModal);
    return () => window.removeEventListener('open-category-budget-modal', handleOpenModal);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-col h-16 sm:h-20 space-y-1 sm:space-y-2 bg-gradient-to-br from-brand-purple/5 to-purple-600/15 border-brand-purple/20 hover:border-brand-purple/40 hover:bg-gradient-to-br hover:from-brand-purple/10 hover:to-purple-600/20 hover:shadow-glow transition-all duration-300 transform hover:scale-105 group">
          <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-brand-purple group-hover:scale-110 transition-transform duration-300" />
          <span className="text-xs sm:text-sm text-brand-purple font-medium">Orçamento</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden p-0 border-0 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl shadow-2xl mx-2 sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/3 to-blue-500/5" />
        <div className="relative z-10 overflow-y-auto max-h-[90vh]">
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border/50 bg-gradient-to-r from-background/90 to-background/70 backdrop-blur-sm">
            
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground z-10"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {/* Decorative gradient bar */}
            <div className="absolute -top-4 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 rounded-t-lg"></div>
            
            {/* Icon with glow effect */}
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg animate-glow-pulse">
              <Target className="h-8 w-8 text-white" />
            </div>
            
            <div className="text-center">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Orçamento por Categoria
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Controle inteligente dos seus gastos por categoria
              </p>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 p-4 sm:p-6">
          {/* Filtro de período redesenhado */}
          <div className="bg-gradient-to-r from-indigo-50 to-cyan-50 dark:from-indigo-950/20 dark:to-cyan-950/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-indigo-200/30 dark:border-indigo-800/30">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-indigo-700 dark:text-indigo-300">Filtro de Período</h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">Selecione o período para análise</p>
              </div>
            </div>
            <CategoryBudgetDateFilter
              onFilterChange={(newFilterType, newDateRange) => {
                setFilterType(newFilterType);
                if (newDateRange) {
                  setDateRange(newDateRange);
                }
              }}
              currentFilter={filterType}
              currentRange={dateRange}
            />
          </div>

          {/* Resumo geral redesenhado */}
          {budgets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {/* Orçamento Total */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-emerald-200/30 dark:border-emerald-800/30 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md">
                    <Target className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300">Orçamento Total</p>
                    <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
                      R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Planejado para o período</p>
                  </div>
                </div>
              </div>
              
              {/* Total Gasto */}
              <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-red-200/30 dark:border-red-800/30 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md">
                    <TrendingDown className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300">Total Gasto</p>
                    <p className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400 truncate">
                      R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70">
                      {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}% do orçamento` : 'Sem orçamento'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Disponível */}
              <div className={`col-span-1 sm:col-span-2 lg:col-span-1 bg-gradient-to-br ${totalRemaining >= 0 ? 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20' : 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20'} rounded-xl sm:rounded-2xl p-4 sm:p-6 border ${totalRemaining >= 0 ? 'border-blue-200/30 dark:border-blue-800/30' : 'border-orange-200/30 dark:border-orange-800/30'} hover:shadow-lg transition-all duration-300`}>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br ${totalRemaining >= 0 ? 'from-blue-500 to-cyan-600' : 'from-orange-500 to-amber-600'} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md`}>
                    <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs sm:text-sm font-medium ${totalRemaining >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                      {totalRemaining >= 0 ? 'Disponível' : 'Excedido'}
                    </p>
                    <p className={`text-lg sm:text-2xl font-bold ${totalRemaining >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'} truncate`}>
                      R$ {Math.abs(totalRemaining).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className={`text-xs ${totalRemaining >= 0 ? 'text-blue-600/70 dark:text-blue-400/70' : 'text-orange-600/70 dark:text-orange-400/70'}`}>
                      {totalRemaining >= 0 ? 'Restante no orçamento' : 'Acima do planejado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 h-11 sm:h-10">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
              <TabsTrigger value="manage" className="text-xs sm:text-sm">Gerenciar Orçamentos</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3 sm:space-y-4">
              {budgetAnalysis.length === 0 ? (
                <Card>
                  <CardContent className="pt-4 sm:pt-6 text-center">
                    <PieChart className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">Nenhum orçamento definido para este período</p>
                    <Button 
                      variant="outline" 
                      className="text-xs sm:text-sm"
                      onClick={() => setActiveTab("manage")}
                    >
                      Criar Primeiro Orçamento
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {budgetAnalysis.map((analysis) => (
                    <Card key={analysis.category_id}>
                      <CardContent className="pt-4 sm:pt-6">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <span className="text-lg sm:text-2xl flex-shrink-0">{analysis.category_icon}</span>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-sm sm:text-base truncate">{analysis.category_name}</h3>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                R$ {analysis.spent_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de{' '}
                                R$ {analysis.budget_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getPeriodTypeLabel(budgets.find(b => b.category_id === analysis.category_id)?.period_type || 'monthly')}
                              </p>
                            </div>
                          </div>
                          <Badge variant={getStatusColor(analysis.status)} className="text-xs flex-shrink-0 ml-2">
                            {getStatusText(analysis.status)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span>Progresso</span>
                            <span>{analysis.percentage_used.toFixed(1)}%</span>
                          </div>
                          <Progress 
                            value={analysis.percentage_used} 
                            className="h-2"
                          />
                          <div className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm text-muted-foreground gap-1 sm:gap-0">
                            <span>
                              Restante: R$ {analysis.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            {analysis.status === 'over' && (
                              <span className="text-destructive">
                                Excesso: R$ {Math.abs(analysis.remaining).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manage" className="space-y-4">
              {/* Formulário para adicionar/editar orçamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Definir Orçamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select value={newBudget.category_id} onValueChange={(value) => setNewBudget(prev => ({ ...prev, category_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.icon} {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tipo de Período</Label>
                      <Select value={newBudget.period_type} onValueChange={(value) => setNewBudget(prev => ({ ...prev, period_type: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">📅 Diário</SelectItem>
                          <SelectItem value="weekly">📊 Semanal</SelectItem>
                          <SelectItem value="monthly">📆 Mensal</SelectItem>
                          <SelectItem value="semiannual">📋 Semestral</SelectItem>
                          <SelectItem value="annual">📈 Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Valor do Orçamento (R$)</Label>
                      <Input
                        value={newBudget.budget_amount}
                        onChange={(e) => setNewBudget(prev => ({ ...prev, budget_amount: e.target.value }))}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-renew"
                      checked={newBudget.auto_renew}
                      onCheckedChange={(checked) => setNewBudget(prev => ({ ...prev, auto_renew: checked }))}
                    />
                    <Label htmlFor="auto-renew" className="text-sm flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Renovar automaticamente após o período
                    </Label>
                  </div>
                  
                  <Button 
                    onClick={saveBudget} 
                    className="w-full"
                    disabled={saveBudgetMutation.isPending}
                  >
                    {saveBudgetMutation.isPending ? 'Salvando...' : 'Salvar Orçamento'}
                  </Button>
                </CardContent>
              </Card>

              {/* Lista de orçamentos existentes */}
              {budgets.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <CardTitle className="text-sm">Orçamentos Definidos</CardTitle>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Buscar orçamentos..."
                          className="pl-10 pr-10 h-9 w-full sm:w-64 border border-border/50 focus:border-brand-purple transition-colors"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {budgets
                        .filter(budget => 
                          budget.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getPeriodTypeLabel(budget.period_type).toLowerCase().includes(searchTerm.toLowerCase()) ||
                          budget.budget_amount.toString().includes(searchTerm)
                        )
                        .map((budget) => (
                        <div key={budget.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{budget.category_icon}</span>
                            <div>
                                <p className="font-medium flex items-center gap-2">
                                  {budget.category_name}
                                  {budget.auto_renew && (
                                    <Badge variant="secondary" className="text-xs">
                                      <RotateCcw className="h-3 w-3 mr-1" />
                                      Auto
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  R$ {budget.budget_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - {getPeriodTypeLabel(budget.period_type)}
                                </p>
                              </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editBudget(budget)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteBudget(budget.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
            {/* Banner de Anúncios - apenas para contas gratuitas */}
            {!isPremium && <AdBanner refreshInterval={45} />}
          </div>
        </div>
      </DialogContent>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Orçamento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select 
                value={editFormData.category_id} 
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Período</Label>
              <Select 
                value={editFormData.period_type} 
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, period_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">📅 Diário</SelectItem>
                  <SelectItem value="weekly">📊 Semanal</SelectItem>
                  <SelectItem value="monthly">📆 Mensal</SelectItem>
                  <SelectItem value="semiannual">📋 Semestral</SelectItem>
                  <SelectItem value="annual">📈 Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Valor do Orçamento (R$)</Label>
              <Input
                value={editFormData.budget_amount}
                onChange={(e) => setEditFormData(prev => ({ ...prev, budget_amount: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-auto-renew"
                checked={editFormData.auto_renew}
                onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, auto_renew: checked }))}
              />
              <Label htmlFor="edit-auto-renew" className="text-sm flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Renovar automaticamente após o período
              </Label>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={saveEditBudget}
                className="flex-1"
              >
                Salvar Alterações
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEditModalOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};