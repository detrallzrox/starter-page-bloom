import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Trash2, Bell, BellOff, Edit, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { AdBanner } from "@/components/AdBanner";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";
import { useAccountContext } from "@/hooks/useAccountContext";

interface BillReminder {
  id: string;
  reminder_name: string;
  comment: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually';
  category: string;
  is_recurring: boolean;
  recurring_enabled: boolean;
  next_notification_date?: string;
  reminder_time?: string;
  reminder_day?: number;
  notification_date?: string;
}

// Ícones padrão para categorias que não tiverem ícone definido
const defaultCategoryIcons: Record<string, string> = {
  'utilities': '💡',
  'water': '💧', 
  'phone': '📱',
  'rent': '🏠',
  'iptu': '🏛️',
  'fire': '🚒',
  'credit_card': '💳',
  'other': '📄',
  'moradia': '🏠',
  'alimentacao': '🍽️',
  'transporte': '🚗',
  'lazer': '🎮',
  'saude': '🏥',
  'educacao': '📚',
  'vestuario': '👔',
  'tecnologia': '💻',
  'pets': '🐕',
  'viagem': '✈️',
  'energia': '💡',
  'agua': '💧',
  'telefone': '📱',
  'seguros': '🛡️',
  'financeiro': '💳',
  'outros': '📄'
};

const frequencyLabels: Record<string, string> = {
  'daily': 'Diariamente',
  'weekly': 'Semanalmente',
  'monthly': 'Mensalmente',
  'semiannually': 'Semestralmente',
  'annually': 'Anualmente'
};

export const BillReminders = () => {
  const { isPremium } = useCurrentAccountPremium();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBill, setEditingBill] = useState<BillReminder | null>(null);
  const [bills, setBills] = useState<BillReminder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newBill, setNewBill] = useState({
    reminder_name: '',
    comment: '',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually',
    category: '',
    reminder_day: 1,
    reminder_time: '19:50',
    notification_date: undefined as Date | undefined,
  });
  const [editBill, setEditBill] = useState({
    reminder_name: '',
    comment: '',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually',
    category: '',
    reminder_day: 1,
    reminder_time: '19:50',
    notification_date: undefined as Date | undefined,
  });
  
  const { user } = useAuth();
  const { categories } = useTransactions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentAccount } = useAccountContext();

  useEffect(() => {
    console.log('🔴 BILL REMINDERS - User state changed:', { 
      user: user?.id, 
      isAuthenticated: !!user,
      currentAccount: currentAccount?.id,
      accountType: currentAccount?.type
    });
    if (user && user.id) {
      loadBills();
    } else {
      console.log('🔴 BILL REMINDERS - No user authenticated, clearing bills');
      setBills([]);
    }
  }, [user, currentAccount]);

  // Listen for custom reminder-created event
  useEffect(() => {
    const handleReminderCreated = () => {
      console.log('🔴 BILL REMINDERS - Reminder created event received, reloading...');
      if (user && user.id) {
        loadBills();
      }
    };

    window.addEventListener('reminder-created', handleReminderCreated);
    return () => window.removeEventListener('reminder-created', handleReminderCreated);
  }, [user]);

  const loadBills = async () => {
    try {
      console.log('🔴 BILL REMINDERS DEBUG - Loading bills for user:', user?.id);
      console.log('🔴 BILL REMINDERS DEBUG - Current account:', currentAccount?.id);
      
      // Para contas compartilhadas, buscar lembretes da conta atual (que pode ser compartilhada)
      const targetUserId = currentAccount?.id || user?.id;
      
      console.log('🔴 BILL REMINDERS DEBUG - Target user ID:', targetUserId);
      
      // Buscar lembretes da conta atual (seja pessoal ou compartilhada)
      const { data, error } = await supabase
        .from('bill_reminders')
        .select('*')
        .eq('user_id', targetUserId)
        .order('reminder_name');
      
      console.log('🔴 BILL REMINDERS DEBUG - Query result:', { data, error });
      
      if (error) throw error;
      
      // Mapear os dados para o formato esperado
      const mappedBills = (data || []).map((bill: any) => ({
        id: bill.id,
        reminder_name: bill.reminder_name,
        comment: bill.comment,
        frequency: bill.frequency,
        category: bill.category,
        is_recurring: bill.is_recurring || false,
        recurring_enabled: bill.recurring_enabled || false,
        next_notification_date: bill.next_notification_date,
        reminder_time: bill.reminder_time,
        reminder_day: bill.reminder_day,
        notification_date: bill.notification_date
      }));
      
      console.log('🔴 BILL REMINDERS DEBUG - Mapped bills:', mappedBills);
      
      setBills(mappedBills);
    } catch (error) {
      console.error('Erro ao carregar lembretes:', error);
    }
  };

  const handleAddBill = async () => {
    if (!newBill.reminder_name || !newBill.comment || !newBill.category || !newBill.notification_date) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos incluindo a data da notificação",
        variant: "destructive",
      });
      return;
    }

    try {
      // Para contas compartilhadas, usar a conta atual (seja pessoal ou compartilhada)
      const targetUserId = currentAccount?.id || user?.id;
      
      // Formatar data como YYYY-MM-DD local sem conversão de timezone
      const year = newBill.notification_date!.getFullYear();
      const month = String(newBill.notification_date!.getMonth() + 1).padStart(2, '0');
      const day = String(newBill.notification_date!.getDate()).padStart(2, '0');
      const notificationDate = `${year}-${month}-${day}`;
      
      const { error } = await supabase.from('bill_reminders').insert({
        user_id: targetUserId,
        reminder_name: newBill.reminder_name,
        comment: newBill.comment,
        frequency: newBill.frequency,
        category: newBill.category,
        recurring_enabled: true, // Sempre inicia ativado
        is_recurring: true,
        notification_date: notificationDate,
        next_notification_date: notificationDate,
        reminder_time: newBill.reminder_time + ':00' // Converter HH:MM para HH:MM:SS
      });

      if (error) throw error;

      // Não enviar notificação push na criação - apenas na data/hora programada

      toast({
        title: "Lembrete adicionado!",
        description: "O lembrete foi criado e está ativo",
      });

      setNewBill({ reminder_name: '', comment: '', frequency: 'daily', category: '', reminder_day: 1, reminder_time: '19:50', notification_date: undefined });
      setIsOpen(false);
      loadBills();
      queryClient.invalidateQueries({ queryKey: ['bill_reminders', currentAccount?.id || user?.id] });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar lembrete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleRecurring = async (bill: BillReminder) => {
    try {
      const newRecurringState = !bill.recurring_enabled;
      
      let updateData: any = { 
        recurring_enabled: newRecurringState,
        is_recurring: newRecurringState
      };

      // Se ativando a recorrência, usar a data de notificação definida pelo usuário
      if (newRecurringState) {
        if (bill.notification_date) {
          updateData.next_notification_date = bill.notification_date;
        } else {
          // Se não há data definida, usar a data atual
          updateData.next_notification_date = new Date().toISOString().split('T')[0];
        }
      } else {
        updateData.next_notification_date = null;
      }

      const { error } = await supabase
        .from('bill_reminders')
        .update(updateData)
        .eq('id', bill.id);

      if (error) throw error;

      toast({
        title: newRecurringState ? "Notificação ativada!" : "Notificação desativada",
        description: newRecurringState 
          ? `Você receberá lembretes ${frequencyLabels[bill.frequency].toLowerCase()}` 
          : "As notificações foram desativadas",
      });

      loadBills();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar lembrete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteBill = async (billId: string) => {
    try {
      const { error } = await supabase
        .from('bill_reminders')
        .delete()
        .eq('id', billId);

      if (error) throw error;

      toast({
        title: "Lembrete removido",
        description: "O lembrete foi excluído com sucesso",
      });

      loadBills();
      queryClient.invalidateQueries({ queryKey: ['bill_reminders', currentAccount?.id || user?.id] });
    } catch (error: any) {
      toast({
        title: "Erro ao remover lembrete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenEditModal = (bill: BillReminder) => {
    setEditingBill(bill);
    
    // Corrigir problemas de timezone ao carregar a data
    let notificationDate: Date | undefined = undefined;
    if (bill.notification_date) {
      // Parse da data como local (evitar conversão de timezone)
      const [year, month, day] = bill.notification_date.split('-').map(Number);
      notificationDate = new Date(year, month - 1, day); // month é 0-based no Date
    }
    
    setEditBill({
      reminder_name: bill.reminder_name,
      comment: bill.comment,
      frequency: bill.frequency,
      category: bill.category,
      reminder_day: bill.reminder_day || 1,
      reminder_time: bill.reminder_time ? bill.reminder_time.slice(0, 5) : '19:50',
      notification_date: notificationDate,
    });
    setIsEditMode(true);
  };

  const handleCloseEditModal = () => {
    setIsEditMode(false);
    setEditingBill(null);
    setEditBill({
      reminder_name: '',
      comment: '',
      frequency: 'daily',
      category: '',
      reminder_day: 1,
      reminder_time: '19:50',
      notification_date: undefined,
    });
  };

  const handleUpdateBill = async () => {
    if (!editBill.reminder_name || !editBill.comment || !editBill.category || !editBill.notification_date || !editingBill) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos incluindo a data da notificação",
        variant: "destructive",
      });
      return;
    }

    try {
      // Preparar dados para update apenas com campos que realmente foram alterados
      const updateData: any = {};
      
      // Verificar e adicionar apenas campos que foram alterados
      if (editBill.reminder_name !== editingBill.reminder_name) {
        updateData.reminder_name = editBill.reminder_name;
      }
      
      if (editBill.comment !== editingBill.comment) {
        updateData.comment = editBill.comment;
      }
      
      if (editBill.frequency !== editingBill.frequency) {
        updateData.frequency = editBill.frequency;
      }
      
      if (editBill.category !== editingBill.category) {
        updateData.category = editBill.category;
      }
      
      // Verificar se a data de notificação foi alterada
      const currentNotificationDate = editingBill.notification_date ? editingBill.notification_date : null;
      const newNotificationDateFormatted = editBill.notification_date ? 
        `${editBill.notification_date.getFullYear()}-${String(editBill.notification_date.getMonth() + 1).padStart(2, '0')}-${String(editBill.notification_date.getDate()).padStart(2, '0')}` : 
        null;
      
      if (newNotificationDateFormatted !== currentNotificationDate) {
        updateData.notification_date = newNotificationDateFormatted;
        // Só atualizar next_notification_date se a notification_date foi alterada
        updateData.next_notification_date = newNotificationDateFormatted;
      }
      
      // Verificar se o horário foi alterado
      const currentReminderTime = editingBill.reminder_time ? editingBill.reminder_time.slice(0, 5) : '19:50';
      if (editBill.reminder_time !== currentReminderTime) {
        updateData.reminder_time = editBill.reminder_time + ':00';
      }
      
      // Se nenhum campo foi alterado, não fazer update
      if (Object.keys(updateData).length === 0) {
        toast({
          title: "Nenhuma alteração detectada",
          description: "Não há mudanças para salvar",
        });
        handleCloseEditModal();
        return;
      }
      
      const { error } = await supabase
        .from('bill_reminders')
        .update(updateData)
        .eq('id', editingBill.id);

      if (error) throw error;

      toast({
        title: "Lembrete atualizado!",
        description: "O lembrete foi atualizado com sucesso",
      });

      handleCloseEditModal();
      loadBills();
      queryClient.invalidateQueries({ queryKey: ['bill_reminders', currentAccount?.id || user?.id] });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar lembrete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Função para obter ícone de uma categoria
  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (category?.icon) return category.icon;
    
    // Se não tiver ícone definido, usar ícone padrão baseado no nome
    const categoryName = category?.name?.toLowerCase() || '';
    return defaultCategoryIcons[categoryName] || defaultCategoryIcons['outros'];
  };

  // Função para obter informações da categoria
  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return {
      name: category?.name || 'Categoria não encontrada',
      icon: getCategoryIcon(categoryId)
    };
  };

  // Listener para eventos customizados de abertura de modal
  useEffect(() => {
    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener('open-bill-reminders-modal', handleOpenModal);
    return () => window.removeEventListener('open-bill-reminders-modal', handleOpenModal);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-col h-16 sm:h-20 space-y-1 sm:space-y-2 bg-gradient-to-br from-brand-purple/5 to-purple-600/15 border-brand-purple/20 hover:border-brand-purple/40 hover:bg-gradient-to-br hover:from-brand-purple/10 hover:to-purple-600/20 hover:shadow-glow transition-all duration-300 transform hover:scale-105 group">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-brand-purple group-hover:scale-110 transition-transform duration-300" />
          <span className="text-xs sm:text-sm text-brand-purple font-medium">Lembretes</span>
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
            <div className="absolute -top-4 left-0 right-0 h-1 bg-gradient-to-r from-brand-purple to-purple-600 rounded-t-lg"></div>
            
            {/* Icon with glow effect */}
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-brand-purple to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-glow-pulse">
              <FileText className="h-8 w-8 text-white" />
            </div>
            
            <div className="text-center">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-brand-purple to-purple-600 bg-clip-text text-transparent">
                Lembretes de Contas
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Organize e acompanhe todos os seus compromissos financeiros de forma inteligente
              </p>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 p-4 sm:p-6">
            {/* Formulário para adicionar novo lembrete */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-brand-purple/5 via-background to-purple-600/10 hover:shadow-2xl transition-all duration-300 border border-brand-purple/20">
              <CardHeader className="pb-4 border-b border-brand-purple/20">
                <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-3 text-brand-purple">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-brand-purple/10 to-purple-600/10 border border-brand-purple/20 shadow-glow">
                    <Plus className="h-5 w-5" />
                  </div>
                  Criar Novo Lembrete
                </CardTitle>
                <p className="text-sm text-muted-foreground">Preencha as informações abaixo para configurar um novo lembrete</p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 bg-brand-purple rounded-full"></span>
                      Nome do Lembrete
                    </Label>
                    <Input
                      value={newBill.reminder_name}
                      onChange={(e) => setNewBill(prev => ({ ...prev, reminder_name: e.target.value }))}
                      placeholder="Ex: Pagamento do cartão de crédito"
                      className="h-12 border-2 focus:border-brand-purple transition-colors bg-background/50 hover:border-purple-600/50"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 bg-brand-purple rounded-full"></span>
                      Categoria
                    </Label>
                    <Select value={newBill.category} onValueChange={(value) => setNewBill(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger className="h-12 border-2 focus:border-brand-purple transition-colors bg-background/50 hover:border-purple-600/50">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] border-brand-purple/20 bg-background/95 backdrop-blur-sm">
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id} className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-lg">{category.icon || getCategoryIcon(category.id)}</span>
                              </div>
                              <span className="font-medium">{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 bg-brand-purple rounded-full"></span>
                    Mensagem da Notificação
                  </Label>
                  <Textarea
                    value={newBill.comment}
                    onChange={(e) => setNewBill(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Digite a mensagem que aparecerá na notificação..."
                    rows={3}
                    className="resize-none border-2 focus:border-brand-purple transition-colors bg-background/50 hover:border-purple-600/50"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 bg-brand-purple rounded-full"></span>
                      Frequência
                    </Label>
                    <Select value={newBill.frequency} onValueChange={(value) => setNewBill(prev => ({ ...prev, frequency: value as any }))}>
                      <SelectTrigger className="h-12 border-2 focus:border-brand-purple transition-colors bg-background/50 hover:border-purple-600/50">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="border-brand-purple/20 bg-background/95 backdrop-blur-sm">
                        <SelectItem value="daily" className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">🗓️</span>
                            <span className="font-medium">Diariamente</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="weekly" className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📅</span>
                            <span className="font-medium">Semanalmente</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="monthly" className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📆</span>
                            <span className="font-medium">Mensalmente</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="semiannually" className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📋</span>
                            <span className="font-medium">Semestralmente</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="annually" className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📊</span>
                            <span className="font-medium">Anualmente</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 bg-brand-purple rounded-full"></span>
                      Horário
                    </Label>
                    <Input
                      type="time"
                      value={newBill.reminder_time}
                      onChange={(e) => setNewBill(prev => ({ ...prev, reminder_time: e.target.value }))}
                      className="h-12 border-2 focus:border-brand-purple transition-colors bg-background/50 hover:border-purple-600/50"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 bg-brand-purple rounded-full"></span>
                      Data
                    </Label>
                    <Input
                      type="date"
                      value={newBill.notification_date ? newBill.notification_date.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const dateString = e.target.value;
                        if (dateString) {
                          const [year, month, day] = dateString.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          setNewBill(prev => ({ ...prev, notification_date: date }));
                        } else {
                          setNewBill(prev => ({ ...prev, notification_date: undefined }));
                        }
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="h-12 border-2 focus:border-brand-purple transition-colors bg-background/50 hover:border-purple-600/50"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleAddBill} 
                    className="flex-1 h-14 text-lg font-semibold bg-gradient-to-r from-brand-purple to-purple-600 hover:from-purple-600 hover:to-brand-purple shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform"
                  >
                    <Plus className="h-5 w-5 mr-3" />
                    Criar Lembrete
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsOpen(false)}
                    className="flex-1 h-14 text-lg font-semibold"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Lista de lembretes */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground">Seus Lembretes</h3>
                  <p className="text-sm text-muted-foreground mt-1">Gerencie todos os seus lembretes ativos</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-gradient-to-r from-primary/10 to-primary/20 text-primary px-4 py-2 rounded-full font-semibold border border-primary/20">
                    {bills.filter(bill => 
                      bill.reminder_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      bill.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      getCategoryInfo(bill.category).name.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length} {bills.filter(bill => 
                      bill.reminder_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      bill.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      getCategoryInfo(bill.category).name.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length === 1 ? 'lembrete' : 'lembretes'}
                  </div>
                  {bills.filter(b => b.recurring_enabled).length > 0 && (
                    <div className="bg-gradient-to-r from-green-500/10 to-green-600/20 text-green-600 px-4 py-2 rounded-full font-semibold border border-green-500/20">
                      {bills.filter(b => b.recurring_enabled).length} ativo{bills.filter(b => b.recurring_enabled).length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Campo de busca */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar lembretes por nome, categoria ou mensagem..."
                  className="pl-12 pr-12 h-12 border-2 focus:border-brand-purple transition-colors bg-background/50 hover:border-purple-600/50"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-foreground transition-colors"
                  >
                    <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              
              {bills.length === 0 ? (
                <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                  <CardContent className="p-12 text-center">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center mb-6 border-2 border-primary/20">
                      <FileText className="h-10 w-10 text-primary" />
                    </div>
                    <h4 className="text-xl font-bold mb-3 text-foreground">Nenhum lembrete criado</h4>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                      Comece criando seu primeiro lembrete para nunca mais esquecer dos seus compromissos financeiros importantes
                    </p>
                    <Button variant="outline" size="lg" className="border-2 border-primary/20 hover:bg-primary/10">
                      <Plus className="h-5 w-5 mr-2" />
                      Criar Primeiro Lembrete
                    </Button>
                  </CardContent>
                </Card>
              ) : bills.filter(bill => 
                bill.reminder_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                bill.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                getCategoryInfo(bill.category).name.toLowerCase().includes(searchTerm.toLowerCase())
              ).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm ? `Nenhum lembrete encontrado para "${searchTerm}"` : 'Nenhum lembrete cadastrado'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {bills
                    .filter(bill => 
                      bill.reminder_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      bill.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      getCategoryInfo(bill.category).name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(bill => {
                    const categoryInfo = getCategoryInfo(bill.category);
                    const nextNotificationDate = bill.next_notification_date 
                      ? bill.next_notification_date.split('-').reverse().join('/')
                      : null;
                    
                    return (
                      <Card key={bill.id} className={cn(
                        "group transition-all duration-300 hover:shadow-xl border-l-4 overflow-hidden",
                        bill.recurring_enabled 
                          ? "border-l-green-500 bg-gradient-to-r from-green-50/50 to-background hover:from-green-50 hover:to-green-50/30 dark:from-green-950/20 dark:to-background dark:hover:from-green-950/30 dark:hover:to-green-950/10" 
                          : "border-l-muted bg-gradient-to-r from-muted/20 to-background hover:from-muted/30 hover:to-muted/10"
                      )}>
                        <CardContent className="p-4">
                          <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 shrink-0">
                                  <span className="text-lg">{categoryInfo.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-base truncate text-foreground">{bill.reminder_name}</h4>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    {bill.recurring_enabled ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-950/50 dark:text-green-400 px-2 py-1 rounded-full">
                                        <Bell className="h-3 w-3" />
                                        Ativo
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                        <BellOff className="h-3 w-3" />
                                        Pausado
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                                      {categoryInfo.name}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-muted/30 p-3 rounded-lg">
                                <p className="text-sm text-muted-foreground italic line-clamp-2">
                                  "{bill.comment}"
                                </p>
                              </div>
                              
                              {/* Informações compactas */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="bg-background/50 p-2 rounded-lg border border-border/50">
                                  <p className="text-xs text-muted-foreground">Frequência</p>
                                  <p className="text-sm font-medium text-foreground truncate">{frequencyLabels[bill.frequency]}</p>
                                </div>
                                <div className="bg-background/50 p-2 rounded-lg border border-border/50">
                                  <p className="text-xs text-muted-foreground">Horário</p>
                                  <p className="text-sm font-medium text-foreground">
                                    {bill.reminder_time ? bill.reminder_time.slice(0, 5) : 'N/A'}
                                  </p>
                                </div>
                                {bill.notification_date && (
                                  <div className="bg-background/50 p-2 rounded-lg border border-border/50">
                                    <p className="text-xs text-muted-foreground">Data Inicial</p>
                                    <p className="text-sm font-medium text-foreground">
                                      {bill.notification_date.split('-').reverse().join('/')}
                                    </p>
                                  </div>
                                )}
                                {bill.recurring_enabled && nextNotificationDate && (
                                  <div className="bg-primary/5 p-2 rounded-lg border border-primary/20">
                                    <p className="text-xs text-primary">Próximo</p>
                                    <p className="text-sm font-medium text-primary truncate">
                                      {nextNotificationDate}
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              {!bill.recurring_enabled && (
                                <div className="bg-orange-50 dark:bg-orange-950/20 p-2 rounded-lg border border-orange-200 dark:border-orange-800">
                                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium flex items-center gap-2">
                                    <span>⚠️</span>
                                    Lembrete pausado - ative para receber notificações
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between lg:flex-col lg:items-center gap-3">
                              <Switch
                                checked={bill.recurring_enabled}
                                onCheckedChange={() => handleToggleRecurring(bill)}
                                className="shrink-0"
                              />
                              <div className="flex gap-2">
                                {/* Só permitir edição/exclusão se NÃO for o lembrete padrão */}
                                {bill.reminder_name !== 'Anotação de Gastos' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenEditModal(bill)}
                                      className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                      title="Editar"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteBill(bill.id)}
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      title="Excluir"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {/* Mostrar indicativo para lembrete padrão */}
                                {bill.reminder_name === 'Anotação de Gastos' && (
                                  <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full border">
                                    Padrão
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Banner de Anúncios - apenas para contas gratuitas */}
            {!isPremium && <AdBanner refreshInterval={45} />}
          </div>
        </div>
      </DialogContent>

      {/* Modal de edição */}
      <Dialog open={isEditMode} onOpenChange={handleCloseEditModal}>
        <DialogContent className="max-w-4xl mx-2 sm:mx-auto max-h-[95vh] overflow-y-auto border-0 shadow-2xl">
          <div className="bg-gradient-to-br from-brand-purple/5 via-background to-purple-600/10">
            <DialogHeader className="pb-4 border-b border-brand-purple/20">
              <DialogTitle className="text-xl sm:text-2xl font-semibold flex items-center gap-3 bg-gradient-to-r from-brand-purple to-purple-600 bg-clip-text text-transparent">
                <div className="p-2 rounded-lg bg-gradient-to-br from-brand-purple/10 to-purple-600/10 border border-brand-purple/20 shadow-glow">
                  <Edit className="h-6 w-6 text-brand-purple" />
                </div>
                Editar Lembrete
              </DialogTitle>
            </DialogHeader>
          
          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-brand-purple/5 via-background to-purple-600/10 border border-brand-purple/20">
              <CardHeader className="pb-4 border-b border-brand-purple/20">
                <CardTitle className="text-base sm:text-lg flex items-center gap-3 text-brand-purple">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-brand-purple/10 to-purple-600/10 border border-brand-purple/20">
                    <Edit className="h-4 w-4" />
                  </div>
                  Informações do Lembrete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Nome do Lembrete</Label>
                    <Input
                      value={editBill.reminder_name}
                      onChange={(e) => setEditBill(prev => ({ ...prev, reminder_name: e.target.value }))}
                      placeholder="Ex: Pagamento do cartão de crédito"
                      className="h-10 sm:h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Categoria</Label>
                    <Select value={editBill.category} onValueChange={(value) => setEditBill(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id} className="hover:bg-brand-purple/10">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{category.icon || getCategoryIcon(category.id)}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Mensagem da Notificação</Label>
                  <Textarea
                    value={editBill.comment}
                    onChange={(e) => setEditBill(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Digite a mensagem que aparecerá na notificação..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Frequência</Label>
                    <Select value={editBill.frequency} onValueChange={(value) => setEditBill(prev => ({ ...prev, frequency: value as any }))}>
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">🗓️ Diariamente</SelectItem>
                        <SelectItem value="weekly">📅 Semanalmente</SelectItem>
                        <SelectItem value="monthly">📆 Mensalmente</SelectItem>
                        <SelectItem value="semiannually">📋 Semestralmente</SelectItem>
                        <SelectItem value="annually">📊 Anualmente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Horário</Label>
                    <Input
                      type="time"
                      value={editBill.reminder_time}
                      onChange={(e) => setEditBill(prev => ({ ...prev, reminder_time: e.target.value }))}
                      className="h-10 sm:h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Data</Label>
                    <Input
                      type="date"
                      value={editBill.notification_date ? editBill.notification_date.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const dateString = e.target.value;
                        if (dateString) {
                          const [year, month, day] = dateString.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          setEditBill(prev => ({ ...prev, notification_date: date }));
                        } else {
                          setEditBill(prev => ({ ...prev, notification_date: undefined }));
                        }
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    onClick={handleCloseEditModal} 
                    variant="outline" 
                    className="flex-1 h-11 text-base font-medium"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleUpdateBill} 
                    className="flex-1 h-11 text-base font-medium bg-gradient-to-r from-brand-purple to-purple-600 hover:from-purple-600 hover:to-brand-purple shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Banner de Anúncios - apenas para contas gratuitas */}
          {!isPremium && <AdBanner refreshInterval={45} />}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};