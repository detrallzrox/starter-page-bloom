import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";
import { TransactionItem, TransactionSearch, TransactionDialog } from "@/components/transactions";

// Cores vibrantes para categorias (exatamente iguais ao gráfico)
const getCategoryColor = (categoryName: string, chartData: Array<{name: string, value: number}>) => {
  const vibrantColors = [
    '#CC0000', // Vermelho escuro
    '#0000CC', // Azul escuro
    '#FF6600', // Laranja
    '#006600', // Verde escuro
    '#660066', // Roxo escuro
    '#8B4513', // Marrom
    '#000000', // Preto
    '#CC1493', // Rosa escuro
    '#008B8B', // Ciano escuro
    '#4B0082', // Índigo
    '#800000', // Vinho
    '#556B2F'  // Verde oliva escuro
  ];
  
  // Usar exatamente a mesma lógica do gráfico - baseado na ordem em que aparecem no chartData
  const categoryIndex = chartData.findIndex(item => item.name === categoryName);
  return categoryIndex >= 0 ? vibrantColors[categoryIndex % vibrantColors.length] : '#6B7280';
};

interface RecentTransactionsProps {
  filteredTransactions?: any[];
}

export const RecentTransactions = ({ filteredTransactions }: RecentTransactionsProps = {}) => {
  const { isPremium } = useCurrentAccountPremium();
  const { transactions, categories, isLoading, updateTransaction, deleteTransaction } = useTransactions();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Usar transações filtradas se fornecidas, senão usar todas as transações
  const transactionsToUse = filteredTransactions || transactions;
  
  // Criar exatamente o mesmo chartData do gráfico para manter consistência nas cores
  const chartData = useMemo(() => {
    const categoryMap = new Map();
    
    transactionsToUse
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const categoryName = transaction.categories?.name || 'Outros';
        
        if (categoryMap.has(categoryName)) {
          categoryMap.get(categoryName).value += transaction.amount;
        } else {
          categoryMap.set(categoryName, {
            name: categoryName,
            value: transaction.amount
          });
        }
      });

    return Array.from(categoryMap.values());
  }, [transactionsToUse]);

  // Filtrar transações baseado no termo de busca e ordenar por data mais recente
  const recentTransactions = transactionsToUse
    .filter(transaction => {
      if (!searchTerm.trim()) return true;
      
      const searchLower = searchTerm.toLowerCase().trim();
      const description = (transaction.description || '').toLowerCase();
      const category = (transaction.categories?.name || '').toLowerCase();
      const amount = transaction.amount.toString();
      const paymentMethod = (transaction.payment_method || '').toLowerCase();
      const notes = (transaction.notes || '').toLowerCase();
      
      return description.includes(searchLower) ||
             category.includes(searchLower) ||
             amount.includes(searchLower) ||
             paymentMethod.includes(searchLower) ||
             notes.includes(searchLower);
    })
    .sort((a, b) => {
      // Ordenar primeiro por data da transação (campo 'date'), depois por created_at
      const dateA = new Date(a.date + 'T12:00:00').getTime();
      const dateB = new Date(b.date + 'T12:00:00').getTime();
      
      if (dateA !== dateB) {
        return dateB - dateA; // Data mais recente primeiro
      }
      
      // Se as datas forem iguais, ordenar por created_at
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
  };

  const handleUpdate = (editData: any) => {
    if (!editingTransaction) return;
    
    updateTransaction({
      id: editingTransaction.id,
      amount: parseFloat(editData.amount.replace(',', '.')),
      description: editData.description,
      category_id: editData.category_id,
      type: editData.type,
      payment_method: editData.payment_method,
      notes: editData.notes
    });
    
    setEditingTransaction(null);
  };

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    setDeleteId(null);
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-card hover:shadow-md transition-all duration-300 border-0 shadow-lg">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-bold">Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="space-y-3 sm:space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border bg-card/50">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 sm:w-40 h-4 bg-muted rounded animate-pulse" />
                  <div className="w-20 sm:w-24 h-3 bg-muted rounded animate-pulse" />
                </div>
                <div className="w-16 sm:w-20 h-6 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="recent-transactions" data-component="recent-transactions" className="bg-gradient-card hover:shadow-lg transition-all duration-300 border-0 shadow-lg">
      <CardHeader className="p-4 sm:p-6 space-y-4">
        <TransactionSearch 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          transactionCount={recentTransactions.length}
        />
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 pt-0">
        {recentTransactions.length > 0 ? (
          <div className="space-y-3 sm:space-y-4 max-h-[500px] sm:max-h-[600px] lg:max-h-[700px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {recentTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                categoryColor={getCategoryColor(
                  transaction.categories?.name || 'Outros', 
                  chartData
                )}
                onEdit={handleEdit}
                onDelete={setDeleteId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted/50 flex items-center justify-center">
                {searchTerm.trim() ? (
                  <Search className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                ) : (
                  <Plus className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2 text-center">
                {searchTerm.trim() ? (
                  <>
                    <p className="text-sm sm:text-base font-medium text-foreground">
                      Nenhuma transação encontrada
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Tente usar termos diferentes ou limpe a busca
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm sm:text-base font-medium text-foreground">
                      Nenhuma transação ainda
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Use as ações rápidas para adicionar sua primeira transação
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dialogs */}
        <TransactionDialog
          transaction={editingTransaction}
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          categories={categories}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="w-[95vw] max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg sm:text-xl">Excluir Transação</AlertDialogTitle>
              <AlertDialogDescription className="text-sm sm:text-base">
                Esta ação não pode ser desfeita. A transação será permanentemente removida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
              <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteId && handleDelete(deleteId)}
                className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};