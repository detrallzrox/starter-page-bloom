import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Edit2, Download, Calendar, CreditCard, FileText, Image, Trash2 } from "lucide-react";

interface EditData {
  amount: string;
  description: string;
  category_id: string;
  type: 'expense' | 'income' | 'savings';
  payment_method: string;
  notes: string;
  date: string;
}

interface TransactionDialogProps {
  transaction: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: EditData) => void;
  onDelete: (id: string) => void;
  categories: any[];
}

export const TransactionDialog = ({ transaction, isOpen, onClose, onUpdate, onDelete, categories }: TransactionDialogProps) => {
  const [editData, setEditData] = useState<EditData>({
    amount: transaction?.amount?.toString() || '',
    description: transaction?.description || '',
    category_id: transaction?.category_id || '',
    type: transaction?.type || 'expense',
    payment_method: transaction?.payment_method || '',
    notes: transaction?.notes || '',
    date: transaction?.date || ''
  });

  // Update editData when transaction changes
  useEffect(() => {
    if (transaction) {
      setEditData({
        amount: transaction.amount?.toString() || '',
        description: transaction.description || '',
        category_id: transaction.category_id || '',
        type: transaction.type || 'expense',
        payment_method: transaction.payment_method || '',
        notes: transaction.notes || '',
        date: transaction.date || ''
      });
    }
  }, [transaction]);

  const handleUpdate = () => {
    onUpdate(editData);
    onClose();
  };

  const handleDelete = () => {
    if (transaction?.id) {
      onDelete(transaction.id);
      onClose();
    }
  };

  const handleDownloadReceipt = (receiptUrl: string, description: string) => {
    const link = document.createElement('a');
    link.href = receiptUrl;
    link.download = `comprovante-${description.replace(/[^a-zA-Z0-9]/g, '-')}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden p-0 border-0 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl shadow-2xl mx-2 sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/3 to-blue-500/5" />
        <div className="relative z-10 overflow-y-auto max-h-[90vh]">
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border/50 bg-gradient-to-r from-background/90 to-background/70 backdrop-blur-sm sticky top-0 z-20">
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
              Detalhes da Transação
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 p-4 sm:p-6">
          {/* Receipt Image */}
          {transaction?.receipt_url && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Image className="h-5 w-5" />
                Comprovante
              </Label>
              <div className="relative group bg-muted/30 rounded-lg p-4">
                <img 
                  src={transaction.receipt_url} 
                  alt="Comprovante da transação" 
                  className="w-full max-w-sm mx-auto rounded-lg border shadow-lg"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  onClick={() => handleDownloadReceipt(transaction.receipt_url, transaction.description)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}

          {/* Type and Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tipo da Transação</Label>
              <Select 
                value={editData.type} 
                onValueChange={(value: 'expense' | 'income' | 'savings') => 
                  setEditData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense" className="text-base py-3">💸 Despesa</SelectItem>
                  <SelectItem value="income" className="text-base py-3">💰 Receita</SelectItem>
                  <SelectItem value="savings" className="text-base py-3">💎 Investimentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <Label className="text-base font-semibold">Valor (R$)</Label>
              <Input
                value={editData.amount}
                onChange={(e) => setEditData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0,00"
                className="h-12 text-base"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Descrição</Label>
            <Input
              value={editData.description}
              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição da transação"
              className="h-12 text-base"
            />
          </div>

          {/* Category */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Categoria</Label>
            <Select 
              value={editData.category_id} 
              onValueChange={(value) => setEditData(prev => ({ ...prev, category_id: value }))}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.filter(cat => cat.type === editData.type).map((category) => (
                  <SelectItem key={category.id} value={category.id} className="text-base py-3">
                    <span className="flex items-center gap-2">
                      {category.icon} {category.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Calendar className="h-5 w-5" />
                Data
              </Label>
              <Input
                type="date"
                value={editData.date}
                onChange={(e) => setEditData(prev => ({ ...prev, date: e.target.value }))}
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <CreditCard className="h-5 w-5" />
                Método de Pagamento
              </Label>
              <Input
                value={editData.payment_method}
                onChange={(e) => setEditData(prev => ({ ...prev, payment_method: e.target.value }))}
                placeholder="Ex: Cartão de Crédito, PIX, Dinheiro"
                className="h-12 text-base"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <FileText className="h-5 w-5" />
              Observações
            </Label>
            <Textarea
              value={editData.notes}
              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações adicionais sobre esta transação..."
              rows={4}
              className="text-base resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            <Button 
              onClick={handleUpdate} 
              className="flex-1 h-12 text-base font-semibold"
            >
              <Edit2 className="h-5 w-5 mr-2" />
              Salvar Alterações
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              className="flex-1 h-12 text-base font-semibold"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Excluir
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 h-12 text-base font-semibold"
            >
              Cancelar
            </Button>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};