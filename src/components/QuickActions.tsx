import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Camera, Mic, Download, PiggyBank, HelpCircle, ChevronUp, ChevronDown, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { CameraOCR } from "./CameraOCR";
import { VoiceRecognition } from "./VoiceRecognition";
import { CategoryManager } from "./CategoryManager";
import { BillReminders } from "./BillReminders";
import { Subscriptions } from "./Subscriptions";
import { InstallmentPurchases } from "./InstallmentPurchases";
import { ExportData } from "./ExportData";
import { CategoryBudget } from "./CategoryBudget";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { useAccountContext } from "@/hooks/useAccountContext";
import { soundEffects } from "@/utils/soundEffects";
import { AdBanner } from "@/components/AdBanner";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";
import { useFeatureUsageLimits } from "@/hooks/useFeatureUsageLimits";
import { PremiumOverlay } from "./PremiumOverlay";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  categories?: {
    name: string;
  };
  payment_method?: string;
  notes?: string;
}

interface DateRange {
  from?: Date;
  to?: Date;
}

interface QuickActionsProps {
  filteredTransactions?: Transaction[];
  dateRange?: DateRange;
  filterType?: string;
  chartData?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  monthlyData?: Array<{
    month: string;
    expenses: number;
    income: number;
    investedBalance: number;
    debtBalance: number;
  }>;
  currentBalance?: number;
  investmentBalance?: number;
  debtBalance?: number;
}

export const QuickActions = ({ 
  filteredTransactions = [], 
  dateRange, 
  filterType = 'all',
  chartData = [],
  monthlyData = [],
  currentBalance = 0,
  investmentBalance = 0,
  debtBalance = 0
}: QuickActionsProps) => {
  const { isPremium } = useCurrentAccountPremium();
  const { canUse } = useFeatureUsageLimits();
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isInvestmentDialogOpen, setIsInvestmentDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [showHowToUse, setShowHowToUse] = useState(false);

  const [incomeData, setIncomeData] = useState({
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: '',
  });

  const [expenseData, setExpenseData] = useState({
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: '',
  });

  const [investmentData, setInvestmentData] = useState({
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: '',
  });
  
  const { categories, addTransaction } = useTransactions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentAccount } = useAccountContext();

  const incomeCategories = categories.filter(cat => cat.type === 'income');
  const expenseCategories = categories.filter(cat => cat.type === 'expense');
  const investmentCategories = categories.filter(cat => cat.type === 'savings');

  const handleAddIncome = async () => {
    if (!incomeData.amount || !incomeData.description || !incomeData.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(incomeData.amount.replace(',', '.'));
    if (isNaN(amount)) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor numérico válido",
        variant: "destructive",
      });
      return;
    }

    await addTransaction({
      amount,
      description: incomeData.description,
      category_id: incomeData.category,
      type: 'income',
      date: incomeData.date,
      payment_method: incomeData.payment_method || undefined,
      notes: incomeData.notes || undefined,
    });

    soundEffects.success();
    setIncomeData({ 
      amount: '', 
      description: '', 
      category: '', 
      date: new Date().toISOString().split('T')[0],
      payment_method: '',
      notes: '',
    });
    setIsIncomeDialogOpen(false);

    toast({
      title: "Receita adicionada!",
      description: "Transação registrada com sucesso",
    });
  };

  const handleAddExpense = async () => {
    if (!expenseData.amount || !expenseData.description || !expenseData.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(expenseData.amount.replace(',', '.'));
    if (isNaN(amount)) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor numérico válido",
        variant: "destructive",
      });
      return;
    }

    await addTransaction({
      amount,
      description: expenseData.description,
      category_id: expenseData.category,
      type: 'expense',
      date: expenseData.date,
      payment_method: expenseData.payment_method || undefined,
      notes: expenseData.notes || undefined,
    });

    soundEffects.success();
    setExpenseData({ 
      amount: '', 
      description: '', 
      category: '', 
      date: new Date().toISOString().split('T')[0],
      payment_method: '',
      notes: '',
    });
    setIsExpenseDialogOpen(false);

    toast({
      title: "Despesa adicionada!",
      description: "Transação registrada com sucesso",
    });
  };

  const handleAddInvestment = async () => {
    if (!investmentData.amount || !investmentData.description || !investmentData.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(investmentData.amount.replace(',', '.'));
    if (isNaN(amount)) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor numérico válido",
        variant: "destructive",
      });
      return;
    }

    await addTransaction({
      amount,
      description: investmentData.description,
      category_id: investmentData.category,
      type: 'savings',
      date: investmentData.date,
      payment_method: investmentData.payment_method || undefined,
      notes: investmentData.notes || undefined,
    });

    soundEffects.success();
    setInvestmentData({ 
      amount: '', 
      description: '', 
      category: '', 
      date: new Date().toISOString().split('T')[0],
      payment_method: '',
      notes: '',
    });
    setIsInvestmentDialogOpen(false);

    toast({
      title: "Investimento adicionado!",
      description: "Transação registrada com sucesso",
    });
  };


  const handleTransactionAdd = async (transaction: {
    amount: number;
    description: string;
    category_id: string;
    type: 'expense' | 'income';
  }) => {
    await addTransaction(transaction);
    
    // Força atualizações adicionais para garantir sincronização completa
    setTimeout(async () => {
      console.log('🔄 QuickActions: Additional balance update after transaction...');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions', currentAccount?.id] }),
        queryClient.invalidateQueries({ queryKey: ['installments', currentAccount?.id] }),
        queryClient.refetchQueries({ queryKey: ['transactions', currentAccount?.id] })
      ]);
    }, 200);
  };

  return (
    <Card className="bg-gradient-card hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-base sm:text-lg font-semibold">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-col h-16 sm:h-20 space-y-1 sm:space-y-2 bg-gradient-to-br from-success/5 to-success/15 border-success/20 hover:border-success/40 hover:bg-gradient-to-br hover:from-success/10 hover:to-success/20 hover:shadow-glow transition-all duration-300 transform hover:scale-105 group">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xs sm:text-sm text-success font-medium">Receita</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden p-0 border-0 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl shadow-2xl mx-2 sm:mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/3 to-blue-500/5" />
            <div className="relative z-10 overflow-y-auto max-h-[90vh]">
              <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border/50 bg-gradient-to-r from-background/90 to-background/70 backdrop-blur-sm">
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsIncomeDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {/* Decorative gradient bar */}
                <div className="absolute -top-4 left-0 right-0 h-1 bg-gradient-income rounded-t-lg"></div>
                
                {/* Icon with glow effect */}
                <div className="w-16 h-16 mx-auto bg-gradient-income rounded-2xl flex items-center justify-center shadow-income animate-glow-pulse">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                
                <div className="text-center">
                  <DialogTitle className="text-2xl font-bold bg-gradient-income bg-clip-text text-transparent">
                    Adicionar Receita
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Registre uma nova entrada financeira
                  </p>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 p-4 sm:p-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="income-amount" className="text-sm font-semibold text-foreground">
                      Valor (R$) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="income-amount"
                        value={incomeData.amount}
                        onChange={(e) => setIncomeData(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0,00"
                        className="pl-8 h-12 text-lg font-medium border-2 bg-white/70 backdrop-blur-sm focus:shadow-income transition-all duration-300"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="income-description" className="text-sm font-semibold text-foreground">
                      Descrição <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="income-description"
                      value={incomeData.description}
                      onChange={(e) => setIncomeData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ex: Salário, Freelance, Dividendos..."
                      className="h-12 border-2 bg-white/70 backdrop-blur-sm focus:shadow-income transition-all duration-300"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="income-category" className="text-sm font-semibold text-foreground">
                      Categoria <span className="text-red-500">*</span>
                    </Label>
                    <Select value={incomeData.category} onValueChange={(value) => setIncomeData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger className="h-12 border-2 bg-white/70 backdrop-blur-sm focus:shadow-income transition-all duration-300">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-md border-2">
                        {incomeCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id} className="text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{category.icon}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="income-date" className="text-sm font-semibold text-foreground">Data</Label>
                      <Input
                        id="income-date"
                        type="date"
                        value={incomeData.date}
                        onChange={(e) => setIncomeData(prev => ({ ...prev, date: e.target.value }))}
                        className="h-11 border-2 bg-white/70 backdrop-blur-sm transition-all duration-300"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="income-payment-method" className="text-sm font-semibold text-foreground">Método</Label>
                      <Input
                        id="income-payment-method"
                        value={incomeData.payment_method}
                        onChange={(e) => setIncomeData(prev => ({ ...prev, payment_method: e.target.value }))}
                        placeholder="Pix, TED, Dinheiro"
                        className="h-11 border-2 bg-white/70 backdrop-blur-sm transition-all duration-300"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="income-notes" className="text-sm font-semibold text-foreground">Observações</Label>
                    <Textarea
                      id="income-notes"
                      value={incomeData.notes}
                      onChange={(e) => setIncomeData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Observações adicionais..."
                      rows={3}
                      className="border-2 bg-white/70 backdrop-blur-sm resize-none transition-all duration-300"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleAddIncome} 
                    className="flex-1 h-12 text-base font-semibold bg-gradient-income hover:shadow-income transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Adicionar Receita
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsIncomeDialogOpen(false)}
                    className="flex-1 h-12 text-base font-semibold"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
              
              {/* Banner de Anúncios - apenas para contas gratuitas */}
              {!isPremium && <AdBanner refreshInterval={45} />}
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-col h-16 sm:h-20 space-y-1 sm:space-y-2 bg-gradient-to-br from-destructive/5 to-destructive/15 border-destructive/20 hover:border-destructive/40 hover:bg-gradient-to-br hover:from-destructive/10 hover:to-destructive/20 hover:shadow-glow transition-all duration-300 transform hover:scale-105 group">
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-destructive group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xs sm:text-sm text-destructive font-medium">Despesa</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden p-0 border-0 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl shadow-2xl mx-2 sm:mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/3 to-blue-500/5" />
            <div className="relative z-10 overflow-y-auto max-h-[90vh]">
              <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border/50 bg-gradient-to-r from-background/90 to-background/70 backdrop-blur-sm">
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsExpenseDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {/* Decorative gradient bar */}
                <div className="absolute -top-4 left-0 right-0 h-1 bg-gradient-expense rounded-t-lg"></div>
                
                {/* Icon with glow effect */}
                <div className="w-16 h-16 mx-auto bg-gradient-expense rounded-2xl flex items-center justify-center shadow-expense animate-glow-pulse">
                  <TrendingDown className="h-8 w-8 text-white" />
                </div>
                
                <div className="text-center">
                  <DialogTitle className="text-2xl font-bold bg-gradient-expense bg-clip-text text-transparent">
                    Adicionar Despesa
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Registre uma nova saída financeira
                  </p>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 p-4 sm:p-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense-amount" className="text-sm font-semibold text-foreground">
                      Valor (R$) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="expense-amount"
                        value={expenseData.amount}
                        onChange={(e) => setExpenseData(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0,00"
                        className="pl-8 h-12 text-lg font-medium border-2 bg-white/70 backdrop-blur-sm focus:shadow-expense transition-all duration-300"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expense-description" className="text-sm font-semibold text-foreground">
                      Descrição <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="expense-description"
                      value={expenseData.description}
                      onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ex: Supermercado, Gasolina, Conta de luz..."
                      className="h-12 border-2 bg-white/70 backdrop-blur-sm focus:shadow-expense transition-all duration-300"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expense-category" className="text-sm font-semibold text-foreground">
                      Categoria <span className="text-red-500">*</span>
                    </Label>
                    <Select value={expenseData.category} onValueChange={(value) => setExpenseData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger className="h-12 border-2 bg-white/70 backdrop-blur-sm focus:shadow-expense transition-all duration-300">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-md border-2">
                        {expenseCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id} className="text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{category.icon}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="expense-date" className="text-sm font-semibold text-foreground">Data</Label>
                      <Input
                        id="expense-date"
                        type="date"
                        value={expenseData.date}
                        onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
                        className="h-11 border-2 bg-white/70 backdrop-blur-sm transition-all duration-300"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="expense-payment-method" className="text-sm font-semibold text-foreground">Método</Label>
                      <Input
                        id="expense-payment-method"
                        value={expenseData.payment_method}
                        onChange={(e) => setExpenseData(prev => ({ ...prev, payment_method: e.target.value }))}
                        placeholder="Pix, Débito, Dinheiro"
                        className="h-11 border-2 bg-white/70 backdrop-blur-sm transition-all duration-300"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expense-notes" className="text-sm font-semibold text-foreground">Observações</Label>
                    <Textarea
                      id="expense-notes"
                      value={expenseData.notes}
                      onChange={(e) => setExpenseData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Observações adicionais..."
                      rows={3}
                      className="border-2 bg-white/70 backdrop-blur-sm resize-none transition-all duration-300"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleAddExpense} 
                    className="flex-1 h-12 text-base font-semibold bg-gradient-expense hover:shadow-expense transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <TrendingDown className="h-5 w-5 mr-2" />
                    Adicionar Despesa
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsExpenseDialogOpen(false)}
                    className="flex-1 h-12 text-base font-semibold"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
              
              {/* Banner de Anúncios - apenas para contas gratuitas */}
              {!isPremium && <AdBanner refreshInterval={45} />}
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isInvestmentDialogOpen} onOpenChange={setIsInvestmentDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-col h-16 sm:h-20 space-y-1 sm:space-y-2 bg-gradient-to-br from-blue-500/5 to-blue-600/15 border-blue-500/20 hover:border-blue-500/40 hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-blue-600/20 hover:shadow-glow transition-all duration-300 transform hover:scale-105 group">
              <PiggyBank className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xs sm:text-sm text-blue-500 font-medium">Investimentos</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden p-0 border-0 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl shadow-2xl mx-2 sm:mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/3 to-blue-500/5" />
            <div className="relative z-10 overflow-y-auto max-h-[90vh]">
              <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border/50 bg-gradient-to-r from-background/90 to-background/70 backdrop-blur-sm">
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsInvestmentDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {/* Decorative gradient bar */}
                <div className="absolute -top-4 left-0 right-0 h-1 bg-gradient-investment rounded-t-lg"></div>
                
                {/* Icon with glow effect */}
                <div className="w-16 h-16 mx-auto bg-gradient-investment rounded-2xl flex items-center justify-center shadow-investment animate-glow-pulse">
                  <PiggyBank className="h-8 w-8 text-white" />
                </div>
                
                <div className="text-center">
                  <DialogTitle className="text-2xl font-bold bg-gradient-investment bg-clip-text text-transparent">
                    Adicionar Investimento
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Registre uma nova aplicação financeira
                  </p>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 p-4 sm:p-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="investment-amount" className="text-sm font-semibold text-foreground">
                      Valor (R$) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="investment-amount"
                        value={investmentData.amount}
                        onChange={(e) => setInvestmentData(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0,00"
                        className="pl-8 h-12 text-lg font-medium border-2 bg-white/70 backdrop-blur-sm focus:shadow-investment transition-all duration-300"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="investment-description" className="text-sm font-semibold text-foreground">
                      Descrição <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="investment-description"
                      value={investmentData.description}
                      onChange={(e) => setInvestmentData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ex: Poupança, Ações, Tesouro Direto..."
                      className="h-12 border-2 bg-white/70 backdrop-blur-sm focus:shadow-investment transition-all duration-300"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="investment-category" className="text-sm font-semibold text-foreground">
                      Categoria <span className="text-red-500">*</span>
                    </Label>
                    <Select value={investmentData.category} onValueChange={(value) => setInvestmentData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger className="h-12 border-2 bg-white/70 backdrop-blur-sm focus:shadow-investment transition-all duration-300">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-md border-2">
                        {investmentCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id} className="text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{category.icon}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="investment-date" className="text-sm font-semibold text-foreground">Data</Label>
                      <Input
                        id="investment-date"
                        type="date"
                        value={investmentData.date}
                        onChange={(e) => setInvestmentData(prev => ({ ...prev, date: e.target.value }))}
                        className="h-11 border-2 bg-white/70 backdrop-blur-sm transition-all duration-300"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="investment-payment-method" className="text-sm font-semibold text-foreground">Método</Label>
                      <Input
                        id="investment-payment-method"
                        value={investmentData.payment_method}
                        onChange={(e) => setInvestmentData(prev => ({ ...prev, payment_method: e.target.value }))}
                        placeholder="PIX, TED..."
                        className="h-11 border-2 bg-white/70 backdrop-blur-sm transition-all duration-300"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="investment-notes" className="text-sm font-semibold text-foreground">Observações</Label>
                    <Textarea
                      id="investment-notes"
                      value={investmentData.notes}
                      onChange={(e) => setInvestmentData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Observações adicionais sobre o investimento..."
                      rows={3}
                      className="border-2 bg-white/70 backdrop-blur-sm resize-none transition-all duration-300"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleAddInvestment} 
                    className="flex-1 h-12 text-base font-semibold bg-gradient-investment hover:shadow-investment transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <PiggyBank className="h-5 w-5 mr-2" />
                    Adicionar Investimento
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsInvestmentDialogOpen(false)}
                    className="flex-1 h-12 text-base font-semibold"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
              
              {/* Banner de Anúncios - apenas para contas gratuitas */}
              {!isPremium && <AdBanner refreshInterval={45} />}
            </div>
          </DialogContent>
        </Dialog>
        
        <InstallmentPurchases />
        
        <CategoryManager />
        
        <CameraOCR onTransactionAdd={handleTransactionAdd} />
        
        <VoiceRecognition onTransactionAdd={handleTransactionAdd} />

        <BillReminders />

        <Subscriptions />
        
        <CategoryBudget />
        
        <PremiumOverlay isBlocked={!isPremium && !canUse('export')} customIcon={Download}>
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="flex-col h-16 sm:h-20 space-y-1 sm:space-y-2 bg-gradient-to-br from-brand-purple/5 to-purple-600/15 border-brand-purple/20 hover:border-brand-purple/40 hover:bg-gradient-to-br hover:from-brand-purple/10 hover:to-purple-600/20 hover:shadow-glow transition-all duration-300 transform hover:scale-105 group"
                disabled={filteredTransactions.length === 0}
                title={filteredTransactions.length === 0 ? "Use os filtros de data acima para selecionar transações" : "Exportar transações filtradas"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (filteredTransactions.length === 0) {
                    toast({
                      title: "Nenhuma transação encontrada",
                      description: "Use os filtros de data acima para selecionar o período desejado",
                      variant: "destructive",
                    });
                    return;
                  }
                  setIsExportDialogOpen(true);
                }}
              >
                <Download className="h-4 w-4 sm:h-5 sm:w-5 text-brand-purple group-hover:scale-110 transition-transform duration-300" />
                <span className="text-xs sm:text-sm text-center px-1 text-brand-purple font-medium">
                  {`Exportar${filteredTransactions.length > 0 ? ` (${filteredTransactions.length})` : ''}`}
                </span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-2 sm:space-y-3 relative">
              <DialogTitle className="text-lg sm:text-xl">Exportar Dados</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setIsExportDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <ExportData 
              transactions={filteredTransactions}
              dateRange={dateRange || {}}
              filterType={filterType}
              currentBalance={currentBalance}
              investmentBalance={investmentBalance}
              debtBalance={debtBalance}
            />
          </DialogContent>
        </Dialog>
        </PremiumOverlay>

        <Dialog open={showHowToUse} onOpenChange={setShowHowToUse}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-col h-16 sm:h-20 space-y-1 sm:space-y-2 bg-gradient-to-br from-brand-purple/5 to-purple-600/15 border-brand-purple/20 hover:border-brand-purple/40 hover:bg-gradient-to-br hover:from-brand-purple/10 hover:to-purple-600/20 hover:shadow-glow transition-all duration-300 transform hover:scale-105 group">
              <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-brand-purple group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xs sm:text-sm text-center px-1 text-brand-purple font-medium">Como usar</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-3xl mx-auto my-2 sm:my-auto max-h-[95vh] sm:max-h-[90vh] overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 border-2 border-gradient shadow-2xl p-0 flex flex-col">
            <DialogHeader className="space-y-3 sm:space-y-4 p-4 sm:p-6 pb-4 sm:pb-6 border-b border-border/50 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                onClick={() => setShowHowToUse(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                  <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Como usar o Finaudy
                  </DialogTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Domine cada funcionalidade do aplicativo com nosso guia completo
                  </p>
                </div>
              </div>
            </DialogHeader>
            
            <div className="overflow-y-auto flex-1 pr-2 -mr-2 px-4 sm:px-6">{/* ScrollArea do conteúdo principal */}
              <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
                {/* Grid de seções principais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {[
                    {
                      title: "Saldo Atual",
                      icon: "💰",
                      description: "Configure seu saldo inicial e mantenha-o atualizado",
                      color: "from-green-500 to-emerald-500"
                    },
                    {
                      title: "Receitas",
                      icon: "📈",
                      description: "Registre todas as suas entradas de dinheiro",
                      color: "from-blue-500 to-cyan-500"
                    },
                    {
                      title: "Despesas",
                      icon: "💸",
                      description: "Controle todos os seus gastos diários",
                      color: "from-red-500 to-pink-500"
                    },
                    {
                      title: "Investimentos",
                      icon: "📊",
                      description: "Acompanhe suas aplicações financeiras",
                      color: "from-purple-500 to-violet-500"
                    }
                  ].map((item, index) => (
                    <div key={index} className="group relative bg-background/80 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                      <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-5 rounded-xl transition-opacity duration-300`}></div>
                      <div className="relative">
                        <div className="text-xl sm:text-2xl mb-2 sm:mb-3">{item.icon}</div>
                        <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">{item.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Seção de funcionalidades avançadas */}
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-4 sm:p-6 border border-purple-200/20">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                    <span className="text-lg sm:text-xl">🚀</span>
                    Funcionalidades Avançadas
                  </h3>
                  
                  <Accordion type="single" collapsible className="w-full space-y-2 sm:space-y-3">
                    <AccordionItem value="categorias" className="border border-border/30 rounded-lg px-3 sm:px-4">
                      <AccordionTrigger className="text-left font-medium hover:no-underline py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-base sm:text-lg">🏷️</span>
                          <span className="text-sm sm:text-base">Categorias Inteligentes</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-xs sm:text-sm text-muted-foreground pt-2 pb-3 sm:pb-4 border-t border-border/20">
                          <p className="mb-2">Organize suas transações de forma intuitiva:</p>
                          <ul className="list-disc list-inside space-y-1 ml-3 sm:ml-4">
                            <li>Crie categorias personalizadas</li>
                            <li>Atribuição automática baseada em histórico</li>
                            <li>Relatórios detalhados por categoria</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="foto" className="border border-border/30 rounded-lg px-3 sm:px-4">
                      <AccordionTrigger className="text-left font-medium hover:no-underline py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-base sm:text-lg">📷</span>
                          <span className="text-sm sm:text-base">Scanner de Recibos</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-xs sm:text-sm text-muted-foreground pt-2 pb-3 sm:pb-4 border-t border-border/20">
                          <p className="mb-2">Tecnologia OCR avançada:</p>
                          <ul className="list-disc list-inside space-y-1 ml-3 sm:ml-4">
                            <li>Envie qualquer recibo ou nota fiscal</li>
                            <li>Extração automática de valores e dados</li>
                            <li>Categorização inteligente instantânea</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="gravar-audio" className="border border-border/30 rounded-lg px-3 sm:px-4">
                      <AccordionTrigger className="text-left font-medium hover:no-underline py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-base sm:text-lg">🎤</span>
                          <span className="text-sm sm:text-base">Comando de Voz Inteligente</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-4 pb-3 sm:pb-4 border-t border-border/20">
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-3 sm:p-4">
                            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                              🤖 <strong>IA Avançada:</strong> Simplesmente fale naturalmente e nossa IA processará automaticamente suas transações!
                            </p>
                          </div>
                          
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="despesas" className="border border-border/20 rounded-lg">
                              <AccordionTrigger className="text-left font-medium px-3 sm:px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-red-500 text-sm sm:text-base">💸</span>
                                  <span className="text-sm sm:text-base">Despesas</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                                  <div className="bg-background/50 rounded-lg p-3">
                                    <p className="font-medium text-xs sm:text-sm mb-2 text-muted-foreground">💡 Exemplos práticos:</p>
                                    <div className="grid grid-cols-1 gap-2">
                                      {[
                                        '"Comprei um lanche de 15 reais"',
                                        '"Gastei 50 reais no supermercado"',
                                        '"Paguei 200 reais de conta de luz"',
                                        '"Comprei gasolina por 80 reais"',
                                        '"Gastei 25 reais no Uber"',
                                        '"Paguei 30 reais na farmácia"'
                                      ].map((example, idx) => (
                                        <div key={idx} className="bg-muted/30 rounded-md p-2 text-xs font-mono">
                                          {example}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="receitas" className="border border-border/20 rounded-lg">
                              <AccordionTrigger className="text-left font-medium px-3 sm:px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-green-500 text-sm sm:text-base">📈</span>
                                  <span className="text-sm sm:text-base">Receitas</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                                  <div className="bg-background/50 rounded-lg p-3">
                                    <p className="font-medium text-xs sm:text-sm mb-2 text-muted-foreground">💡 Exemplos práticos:</p>
                                    <div className="grid grid-cols-1 gap-2">
                                      {[
                                        '"Recebi 1500 reais de salário"',
                                        '"Ganhei 300 reais de freelance"',
                                        '"Vendi meu celular por 800 reais"',
                                        '"Recebi 100 reais da minha mãe"',
                                        '"Ganhei 500 reais da minha vó"'
                                      ].map((example, idx) => (
                                        <div key={idx} className="bg-muted/30 rounded-md p-2 text-xs font-mono">
                                          {example}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="cartao" className="border border-border/20 rounded-lg">
                              <AccordionTrigger className="text-left font-medium px-3 sm:px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-500 text-sm sm:text-base">💳</span>
                                  <span className="text-sm sm:text-base">Cartão de Crédito</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                                  <div className="bg-background/50 rounded-lg p-3">
                                    <p className="font-medium text-xs sm:text-sm mb-2 text-muted-foreground">💡 Exemplos práticos:</p>
                                    <div className="grid grid-cols-1 gap-2">
                                      {[
                                        '"Comprei no cartão uma TV por 1200 reais"',
                                        '"Gastei 400 reais parcelado em 3 vezes"',
                                        '"Paguei no cartão 150 reais de roupas"',
                                        '"Comprei um sofa por 150 reais parcelado em 3 vezes e o primeiro pagamento é dia 18"'
                                      ].map((example, idx) => (
                                        <div key={idx} className="bg-muted/30 rounded-md p-2 text-xs font-mono">
                                          {example}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="cartao-debito" className="border border-border/20 rounded-lg">
                              <AccordionTrigger className="text-left font-medium px-3 sm:px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-green-500 text-sm sm:text-base">💳</span>
                                  <span className="text-sm sm:text-base">Cartão de Débito</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                                  <div className="bg-background/50 rounded-lg p-3">
                                    <p className="font-medium text-xs sm:text-sm mb-2 text-muted-foreground">💡 Exemplos práticos:</p>
                                    <div className="grid grid-cols-1 gap-2">
                                      {[
                                        '"Comprei uma TV por 1200 reais no Débito"',
                                        '"Gastei 100 reais com um liquidificador"',
                                        '"Comprei um sofá por 600 reais"'
                                      ].map((example, idx) => (
                                        <div key={idx} className="bg-muted/30 rounded-md p-2 text-xs font-mono">
                                          {example}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                      ⚠️ <strong>Importante:</strong> Não mencione a palavra "cartão" para ser reconhecida como débito.
                                    </p>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="investimentos-audio" className="border border-border/20 rounded-lg">
                              <AccordionTrigger className="text-left font-medium px-3 sm:px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-purple-500 text-sm sm:text-base">📊</span>
                                  <span className="text-sm sm:text-base">Investimentos</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                                  <div className="bg-background/50 rounded-lg p-3">
                                    <p className="font-medium text-xs sm:text-sm mb-2 text-muted-foreground">💡 Exemplos práticos:</p>
                                    <div className="grid grid-cols-1 gap-2">
                                      {[
                                        '"Investi 1000 reais em ações"',
                                        '"Apliquei 500 reais na poupança"',
                                        '"Fiz um investimento de 2000 reais em renda fixa"',
                                        '"Coloquei 300 reais na reserva de emergência"',
                                        '"Investi 800 reais em fundos imobiliários"',
                                        '"Apliquei 1500 reais no Tesouro Direto"'
                                      ].map((example, idx) => (
                                        <div key={idx} className="bg-muted/30 rounded-md p-2 text-xs font-mono">
                                          {example}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>


                            <AccordionItem value="dicas-reconhecimento" className="border border-border/20 rounded-lg">
                              <AccordionTrigger className="text-left font-medium px-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-emerald-500">💡</span>
                                  <span>Dicas Para Melhor Reconhecimento</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="px-4 pb-4 space-y-3">
                                  <div className="bg-background/50 rounded-lg p-3">
                                    <div className="space-y-3">
                                      <div>
                                        <p className="font-medium text-sm text-emerald-600 dark:text-emerald-400">🎯 Seja específico com valores:</p>
                                        <p className="text-xs text-muted-foreground ml-4">"15 reais, 40 reais..."</p>
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm text-emerald-600 dark:text-emerald-400">💬 Use linguagem natural:</p>
                                        <p className="text-xs text-muted-foreground ml-4">"Comprei pão na padaria, comprei uma televisão, etc.."</p>
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm text-emerald-600 dark:text-emerald-400">📂 Mencione categoria quando possível:</p>
                                        <p className="text-xs text-muted-foreground ml-4">"Gastei com alimentação, lazer, etc..."</p>
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm text-emerald-600 dark:text-emerald-400">👨‍👩‍👧‍👦 Para família, mencione o parentesco:</p>
                                        <p className="text-xs text-muted-foreground ml-4">"recebi da minha vó, ganhei 'X' valor do meu pai, etc..."</p>
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm text-emerald-600 dark:text-emerald-400">💳 Para cartão de crédito, seja explícito:</p>
                                        <p className="text-xs text-muted-foreground ml-4">"comprei no cartão", "parcelado" ou "em X vezes"</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="lembretes" className="border border-border/30 rounded-lg px-4">
                      <AccordionTrigger className="text-left font-medium hover:no-underline">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">🔔</span>
                          <span>Lembretes Inteligentes</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-sm text-muted-foreground pt-2 pb-4 border-t border-border/20">
                          <p className="mb-2">Nunca mais esqueça de pagamentos importantes:</p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Configure lembretes para contas recorrentes</li>
                            <li>Notificações push personalizadas</li>
                            <li>Histórico completo de pagamentos</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="assinaturas" className="border border-border/30 rounded-lg px-4">
                      <AccordionTrigger className="text-left font-medium hover:no-underline">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">🔄</span>
                          <span>Gestão de Assinaturas</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-sm text-muted-foreground pt-2 pb-4 border-t border-border/20">
                          <p className="mb-2">Controle total sobre gastos recorrentes:</p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Monitore todas suas assinaturas em um só lugar</li>
                            <li>Alertas para renovações automáticas</li>
                            <li>Análise de custo-benefício por serviço</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="cartao-credito" className="border border-border/30 rounded-lg px-4">
                      <AccordionTrigger className="text-left font-medium hover:no-underline">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">💳</span>
                          <span>Controle de Cartão</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-sm text-muted-foreground pt-2 pb-4 border-t border-border/20">
                          <p className="mb-2">Gestão completa do seu cartão de crédito:</p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Acompanhe compras feitas no cartão em tempo real</li>
                            <li>Controle de parcelamentos automático</li>
                            <li>Previsão de fatura futura</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="orcamentos" className="border border-border/30 rounded-lg px-4">
                      <AccordionTrigger className="text-left font-medium hover:no-underline">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">💰</span>
                          <span>Controle de Orçamentos</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-sm text-muted-foreground pt-2 pb-4 border-t border-border/20">
                          <p className="mb-2">Controle total sobre seus orçamentos:</p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Monitore todas suas orçamentos em um só lugar</li>
                            <li>Alertas para orçamentos excedidos</li>
                            <li>Análise de gastos por orçamento</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                {/* Dicas finais */}
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-6 border border-amber-200/20">
                  <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-xl">💡</span>
                    Dicas para Máximo Aproveitamento
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="font-medium">🎯 Seja Consistente</p>
                      <p className="text-muted-foreground">Registre todas as transações para ter uma visão completa das suas finanças</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">📊 Use Categorias</p>
                      <p className="text-muted-foreground">Organize seus gastos por categoria para identificar padrões</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">🔍 Analise Relatórios</p>
                      <p className="text-muted-foreground">Revise seus gráficos mensalmente para otimizar seu orçamento</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">⚡ Use Comando de Voz</p>
                      <p className="text-muted-foreground">A forma mais rápida de registrar transações em movimento</p>
                    </div>
                  </div>
                </div>
                
                {/* Banner de Anúncios - apenas para contas gratuitas */}
                {!isPremium && <AdBanner refreshInterval={45} />}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};