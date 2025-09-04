import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, TrendingUp, TrendingDown, Wallet, CreditCard, Calendar, Tag, Receipt, FileText, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: 'expense' | 'income' | 'savings';
  payment_method?: string;
  notes?: string;
  receipt_url?: string;
  categories?: {
    name: string;
    icon?: string;
    color?: string;
  };
}

interface InstallmentPurchase {
  id: string;
  purchase_name: string;
  total_amount: number;
  total_installments: number;
  paid_installments: number;
  remaining_amount: number;
  next_due_date?: string;
  purchase_date: string;
}

interface OverdueSubscription {
  id: string;
  name: string;
  amount: number;
  renewal_day: number;
  category: string;
  last_charged?: string;
}

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'expenses' | 'income' | 'investments' | 'debt';
  title: string;
  transactions: Transaction[];
  installmentPurchases?: InstallmentPurchase[];
  overdueSubscriptions?: OverdueSubscription[];
  totalAmount: number;
  periodDescription?: string;
}

export const TransactionDetailsModal = ({
  isOpen,
  onClose,
  type,
  title,
  transactions,
  installmentPurchases = [],
  overdueSubscriptions = [],
  totalAmount,
  periodDescription
}: TransactionDetailsModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar transações baseado no termo de pesquisa
  const filteredTransactions = useMemo(() => {
    if (!searchTerm.trim()) return transactions;
    
    const searchLower = searchTerm.toLowerCase();
    return transactions.filter(transaction => 
      transaction.description.toLowerCase().includes(searchLower) ||
      transaction.categories?.name.toLowerCase().includes(searchLower) ||
      transaction.payment_method?.toLowerCase().includes(searchLower) ||
      transaction.notes?.toLowerCase().includes(searchLower) ||
      transaction.amount.toString().includes(searchTerm)
    );
  }, [transactions, searchTerm]);

  // Filtrar compras parceladas baseado no termo de pesquisa
  const filteredInstallmentPurchases = useMemo(() => {
    if (!searchTerm.trim()) return installmentPurchases;
    
    const searchLower = searchTerm.toLowerCase();
    return installmentPurchases.filter(purchase =>
      purchase.purchase_name.toLowerCase().includes(searchLower) ||
      purchase.total_amount.toString().includes(searchTerm) ||
      purchase.remaining_amount.toString().includes(searchTerm)
    );
  }, [installmentPurchases, searchTerm]);

  // Filtrar assinaturas atrasadas baseado no termo de pesquisa
  const filteredOverdueSubscriptions = useMemo(() => {
    if (!searchTerm.trim()) return overdueSubscriptions;
    
    const searchLower = searchTerm.toLowerCase();
    return overdueSubscriptions.filter(subscription =>
      subscription.name.toLowerCase().includes(searchLower) ||
      subscription.category.toLowerCase().includes(searchLower) ||
      subscription.amount.toString().includes(searchTerm)
    );
  }, [overdueSubscriptions, searchTerm]);
  const getTypeIcon = () => {
    switch (type) {
      case 'expenses':
        return <TrendingDown className="h-8 w-8 text-destructive" />;
      case 'income':
        return <TrendingUp className="h-8 w-8 text-success" />;
      case 'investments':
        return <Wallet className="h-8 w-8 text-blue-600" />;
      case 'debt':
        return <CreditCard className="h-8 w-8 text-warning" />;
      default:
        return <FileText className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'expenses':
        return 'from-destructive/5 via-destructive/3 to-destructive/5';
      case 'income':
        return 'from-success/5 via-success/3 to-success/5';
      case 'investments':
        return 'from-blue-500/5 via-blue-500/3 to-blue-500/5';
      case 'debt':
        return 'from-warning/5 via-warning/3 to-warning/5';
      default:
        return 'from-muted/5 via-muted/3 to-muted/5';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const getTransactionTypeIcon = (transactionType: string) => {
    switch (transactionType) {
      case 'expense':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'income':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'savings':
        return <Wallet className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionTypeColor = (transactionType: string) => {
    switch (transactionType) {
      case 'expense':
        return 'text-destructive';
      case 'income':
        return 'text-success';
      case 'savings':
        return 'text-blue-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getModalValueColor = () => {
    switch (type) {
      case 'expenses':
        return 'text-destructive';
      case 'income':
        return 'text-success';
      case 'investments':
        return 'text-blue-600';
      case 'debt':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  const getInstallmentStatus = (purchase: InstallmentPurchase) => {
    const percentage = (purchase.paid_installments / purchase.total_installments) * 100;
    if (percentage === 100) return { text: 'Quitado', color: 'bg-success text-success-foreground' };
    if (percentage > 70) return { text: 'Quase quitado', color: 'bg-warning text-warning-foreground' };
    if (percentage > 30) return { text: 'Em andamento', color: 'bg-primary text-primary-foreground' };
    return { text: 'Iniciando', color: 'bg-muted text-muted-foreground' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden p-0 border-0 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl shadow-2xl mx-2 sm:mx-auto">
        <div className={cn("absolute inset-0 bg-gradient-to-br", getTypeColor())} />
        <div className="relative z-10 overflow-y-auto max-h-[90vh]">
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border/50 bg-gradient-to-r from-background/90 to-background/70 backdrop-blur-sm sticky top-0 z-20">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {/* Icon with glow effect */}
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-background/80 to-background/60 rounded-2xl flex items-center justify-center shadow-lg border border-border/50">
              {getTypeIcon()}
            </div>
            
            <div className="text-center">
              <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
                {title}
              </DialogTitle>
              {periodDescription && (
                <p className="text-sm text-muted-foreground mt-2">
                  {periodDescription}
                </p>
              )}
              <div className="mt-3">
                <span className={cn("text-2xl font-bold", getModalValueColor())}>
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-4 sm:p-6">
            {/* Campo de pesquisa */}
            <div className="mb-6">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <Input
                  placeholder="Buscar por descrição, categoria, valor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 h-11 w-full text-sm bg-background/80 border-2 focus:border-primary/50 transition-all duration-200 rounded-lg shadow-sm focus:shadow-md"
                />
              </div>
            </div>

            {type === 'debt' ? (
              // Mostrar compras parceladas e assinaturas atrasadas para saldo devedor
              <div className="space-y-6">
                {/* Compras parceladas */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Compras no Cartão de Crédito</h3>
                     <Badge variant="outline" className="text-sm flex items-center justify-center text-center">
                        {searchTerm ? `${filteredInstallmentPurchases.length} de ${installmentPurchases.length}` : `${installmentPurchases.length} compras`}
                      </Badge>
                  </div>
                  
                  {filteredInstallmentPurchases.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? "Nenhuma compra encontrada com os termos de busca" : "Nenhuma compra parcelada encontrada neste período"}
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px] w-full">
                      <div className="space-y-3">
                        {filteredInstallmentPurchases.map((purchase) => {
                          const status = getInstallmentStatus(purchase);
                          return (
                            <div
                              key={purchase.id}
                              className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CreditCard className="h-4 w-4 text-primary" />
                                    <h4 className="font-medium text-sm">{purchase.purchase_name}</h4>
                                     <Badge className={cn("text-xs flex items-center justify-center text-center", status.color)}>
                                       {status.text}
                                     </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>Compra: {formatDate(purchase.purchase_date)}</span>
                                    </div>
                                     {purchase.next_due_date && (
                                       <div className="flex items-center gap-1">
                                         <Calendar className="h-3 w-3" />
                                         <span>Próxima: {purchase.next_due_date}</span>
                                       </div>
                                     )}
                                  </div>
                                  
                                  <div className="mt-2 flex items-center justify-between">
                                    <span className="text-sm">
                                      {purchase.paid_installments}/{purchase.total_installments} parcelas pagas
                                    </span>
                                    <div className="text-right">
                                      <div className="text-sm font-medium text-warning">
                                        {formatCurrency(purchase.remaining_amount)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Total: {formatCurrency(purchase.total_amount)}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Progress bar */}
                                  <div className="mt-2 w-full bg-muted rounded-full h-2">
                                    <div
                                      className="bg-primary rounded-full h-2 transition-all"
                                      style={{
                                        width: `${(purchase.paid_installments / purchase.total_installments) * 100}%`
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {/* Assinaturas atrasadas */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Assinaturas em Atraso</h3>
                     <Badge variant="outline" className="text-sm flex items-center justify-center text-center">
                        {searchTerm ? `${filteredOverdueSubscriptions.length} de ${overdueSubscriptions.length}` : `${overdueSubscriptions.length} assinaturas`}
                      </Badge>
                  </div>
                  
                  {filteredOverdueSubscriptions.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? "Nenhuma assinatura encontrada com os termos de busca" : "Nenhuma assinatura em atraso encontrada neste período"}
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px] w-full">
                      <div className="space-y-3">
                        {filteredOverdueSubscriptions.map((subscription) => (
                          <div
                            key={subscription.id}
                            className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar className="h-4 w-4 text-destructive" />
                                  <h4 className="font-medium text-sm">{subscription.name}</h4>
                                    <Badge className="text-xs bg-destructive/10 text-destructive border-destructive/20 flex items-center justify-center text-center">
                                      Em atraso
                                    </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    <span>{subscription.category}</span>
                                  </div>
                                </div>
                                
                                {subscription.last_charged && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    Último pagamento: {formatDate(subscription.last_charged)}
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-right">
                                <div className="text-sm font-medium text-warning">
                                  {formatCurrency(subscription.amount)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            ) : (
              // Mostrar transações para os outros tipos
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Transações do Período</h3>
                  <Badge variant="outline" className="text-sm">
                    {searchTerm ? `${filteredTransactions.length} de ${transactions.length}` : `${transactions.length} transações`}
                  </Badge>
                </div>
                
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? "Nenhuma transação encontrada com os termos de busca" : "Nenhuma transação encontrada neste período"}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] w-full">
                    <div className="space-y-3">
                      {filteredTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getTransactionTypeIcon(transaction.type)}
                                <h4 className="font-medium text-sm">{transaction.description}</h4>
                              </div>
                              
                              {transaction.categories && (
                                <div className="flex items-center gap-1 mb-2">
                                  <Tag className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {transaction.categories.icon} {transaction.categories.name}
                                  </span>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDate(transaction.date)}</span>
                                </div>
                                {transaction.payment_method && (
                                  <div className="flex items-center gap-1">
                                    <span>{transaction.payment_method}</span>
                                  </div>
                                )}
                              </div>
                              
                              {transaction.notes && (
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  "{transaction.notes}"
                                </p>
                              )}
                              
                              {transaction.receipt_url && (
                                <div className="mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    <Receipt className="h-3 w-3 mr-1" />
                                    Com comprovante
                                  </Badge>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <div className={cn("text-lg font-bold", getTransactionTypeColor(transaction.type))}>
                                {formatCurrency(transaction.amount)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};