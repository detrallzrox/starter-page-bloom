import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, Plus, Trash2, CreditCard, RefreshCcw, Image, Download, CalendarDays, Edit, Search, X } from "lucide-react";
import { format, addMonths } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAccountContext } from "@/hooks/useAccountContext";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";
import { useInstallments } from "@/hooks/useInstallments";
import { useBalanceUpdater } from "@/hooks/useBalanceUpdater";
import { useQueryClient } from '@tanstack/react-query';
import { AdBanner } from "@/components/AdBanner";

interface Installment {
  id: string;
  purchase_name: string;
  total_amount: number;
  installment_amount: number;
  total_installments: number;
  current_installment: number;
  first_payment_date: string;
  last_payment_date: string;
  is_paid: boolean;
  paid_at?: string;
  category_id?: string;
  notes?: string;
  receipt_url?: string;
}

export const InstallmentPurchases = () => {
  const { isPremium } = useCurrentAccountPremium();
  const [isOpen, setIsOpen] = useState(false);
  const [isMonthPaymentOpen, setIsMonthPaymentOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditInstallmentOpen, setIsEditInstallmentOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [editingPurchase, setEditingPurchase] = useState<string | null>(null);
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newInstallment, setNewInstallment] = useState({
    purchase_name: '',
    total_amount: '',
    installment_amount: '',
    total_installments: '',
    first_payment_date: '',
    category_id: '',
    notes: ''
  });
  const [editInstallment, setEditInstallment] = useState({
    purchase_name: '',
    installment_amount: '',
    total_installments: '',
    category_id: '',
    first_payment_date: '',
    notes: ''
  });
  const [editSingleInstallment, setEditSingleInstallment] = useState({
    installment_amount: '',
    category_id: '',
    notes: ''
  });
  
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const { categories, addTransaction } = useTransactions();
  const { installments, refetch } = useInstallments();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { triggerMultiLayerUpdate } = useBalanceUpdater();


  const calculateLastPaymentDate = (firstDate: string, totalInstallments: number) => {
    // Parse date correctly to avoid timezone issues
    const [year, month, day] = firstDate.split('-').map(Number);
    const startDate = new Date(year, month - 1, day); // month is 0-based
    const lastDate = addMonths(startDate, totalInstallments - 1);
    return format(lastDate, 'yyyy-MM-dd');
  };

  const handleAddInstallment = async () => {
    if (!newInstallment.purchase_name || !newInstallment.installment_amount || 
        !newInstallment.total_installments || !newInstallment.first_payment_date || 
        !newInstallment.category_id) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, valor da parcela, quantidade, data e categoria",
        variant: "destructive",
      });
      return;
    }

    const installmentAmount = parseFloat(newInstallment.installment_amount.replace(',', '.'));
    const totalInstallments = parseInt(newInstallment.total_installments);
    
    if (isNaN(installmentAmount) || isNaN(totalInstallments) || totalInstallments <= 0) {
      toast({
        title: "Valores inválidos",
        description: "Digite valores numéricos válidos",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = installmentAmount * totalInstallments;
    const lastPaymentDate = calculateLastPaymentDate(newInstallment.first_payment_date, totalInstallments);
    const userId = currentAccount?.id || user?.id;
    
    if (!userId) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não identificado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔧 DEBUG - Input date from user:', newInstallment.first_payment_date);
      
      // Criar todas as parcelas
      const installmentsToCreate = [];
      // Parse date correctly to avoid timezone issues
      const [year, month, day] = newInstallment.first_payment_date.split('-').map(Number);
      console.log('🔧 DEBUG - Parsed components:', { year, month, day });
      
      const firstDate = new Date(year, month - 1, day); // month is 0-based
      console.log('🔧 DEBUG - Created local date:', firstDate);
      console.log('🔧 DEBUG - Local date components:', {
        year: firstDate.getFullYear(),
        month: firstDate.getMonth() + 1, // Add 1 because getMonth() is 0-based
        day: firstDate.getDate()
      });
      
      // Ensure we save the exact date the user selected (YYYY-MM-DD format)
      const formattedFirstPaymentDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      console.log('🔧 DEBUG - Final formatted date for saving:', formattedFirstPaymentDate);
      
      for (let i = 0; i < totalInstallments; i++) {
        const paymentDate = addMonths(firstDate, i);
        installmentsToCreate.push({
          user_id: userId,
          purchase_name: newInstallment.purchase_name,
          total_amount: totalAmount,
          installment_amount: installmentAmount,
          total_installments: totalInstallments,
          current_installment: i + 1,
          first_payment_date: formattedFirstPaymentDate, // Use the formatted date
          last_payment_date: lastPaymentDate,
          category_id: newInstallment.category_id,
          notes: newInstallment.notes || null,
          receipt_url: null, // Para compras manuais, sem comprovante
          is_paid: false
        });
      }

      const { error } = await supabase
        .from('installments')
        .insert(installmentsToCreate);

      if (error) throw error;

      // Criar notificação apenas para a conta atual selecionada (não para contas compartilhadas)
      await supabase
        .from('notifications')
        .insert({
          user_id: currentAccount?.id || user?.id,
          title: 'Nova compra parcelada',
          message: `Compra "${newInstallment.purchase_name}" criada com ${totalInstallments} parcelas de R$ ${installmentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          type: 'installment',
          reference_id: null,
          reference_type: 'installment_purchase',
          navigation_data: { 
            purchase_name: newInstallment.purchase_name,
            total_installments: totalInstallments,
            installment_amount: installmentAmount
          }
        });

      toast({
        title: "Cartão de crédito criado!",
        description: `${totalInstallments} parcelas de R$ ${installmentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} criadas`,
      });

      setNewInstallment({
        purchase_name: '',
        total_amount: '',
        installment_amount: '',
        total_installments: '',
        first_payment_date: '',
        category_id: '',
        notes: ''
      });
      setIsOpen(false);
      
      // Forçar atualização completa do saldo devedor
      await triggerMultiLayerUpdate('installment-creation');
      refetch();
    } catch (error: any) {
      toast({
        title: "Erro ao criar cartão de crédito",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  // Proteção RIGOROSA contra múltiplas execuções
  const [processingPayments, setProcessingPayments] = useState<Set<string>>(new Set());
  const [globalProcessingLock, setGlobalProcessingLock] = useState(false);

  const handleMarkAsPaid = async (installment: Installment) => {
    const startTime = Date.now();
    const logPrefix = `[PAYMENT-${installment.id.slice(0,8)}]`;
    
    console.log(`${logPrefix} 💰 PAGAMENTO INICIADO para parcela:`, installment.id, 'Valor:', installment.installment_amount);
    console.log(`${logPrefix} 🕐 Start time:`, new Date(startTime).toISOString());
    
    // PROTEÇÃO TRIPLA contra processamento duplo
    if (processingPayments.has(installment.id)) {
      console.warn(`${logPrefix} 🚫 BLOCKED: Payment already being processed for installment:`, installment.id);
      return;
    }
    
    if (globalProcessingLock) {
      console.warn(`${logPrefix} 🔒 BLOCKED: Global processing lock is active`);
      return;
    }
    
    if (installment.is_paid) {
      console.warn(`${logPrefix} ✅ BLOCKED: Installment already marked as paid`);
      return;
    }

    try {
      console.log(`${logPrefix} 🔐 ATIVANDO proteções e locks...`);
      setProcessingPayments(prev => new Set(prev).add(installment.id));
      setGlobalProcessingLock(true);

      // SOLUÇÃO: Fazer tudo em uma única operação atômica no banco
      // Isso evita qualquer possibilidade de duplicação ou race conditions
      console.log(`${logPrefix} 🔄 Executando operação atômica...`);
      
      const { data, error } = await supabase
        .rpc('process_installment_payment', {
          p_installment_id: installment.id,
          p_user_id: currentAccount?.id || user?.id,
          p_amount: installment.installment_amount,
          p_description: `${installment.purchase_name} (${installment.current_installment}/${installment.total_installments})`,
          p_category_id: installment.category_id,
          p_receipt_url: installment.receipt_url
        });

      if (error) {
        console.error(`${logPrefix} ❌ Erro na operação atômica:`, error);
        throw error;
      }

      console.log(`${logPrefix} ✅ Operação atômica concluída com sucesso:`, data);

      toast({
        title: "Parcela paga!",
        description: "Despesa adicionada automaticamente e saldo atualizado",
      });

      const endTime = Date.now();
      console.log(`${logPrefix} ✅ PAGAMENTO CONCLUÍDO para parcela:`, installment.id);
      console.log(`${logPrefix} 🕐 End time:`, new Date(endTime).toISOString());
      console.log(`${logPrefix} ⏱️ Total duration:`, endTime - startTime, 'ms');
      
      // Aguardar um pouco para o trigger do banco completar
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log(`${logPrefix} 🔄 FORCING COMPLETE BALANCE UPDATE after installment payment...`);
      
      // Invalidar e forçar refetch de TODAS as queries relacionadas
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['installments'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
        // Forçar refetch imediato das queries principais
        queryClient.refetchQueries({ queryKey: ['transactions', currentAccount?.id] }),
        queryClient.refetchQueries({ queryKey: ['installments', currentAccount?.id] })
      ]);
      
      // Forçar atualizações adicionais para garantir sincronia total
      setTimeout(async () => {
        console.log(`${logPrefix} 🔄 SECONDARY REFETCH for installment payment balance consistency...`);
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['transactions', currentAccount?.id] }),
          queryClient.refetchQueries({ queryKey: ['installments', currentAccount?.id] })
        ]);
      }, 400);
      
      console.log(`${logPrefix} ⏰ Tempo total: ${Date.now() - startTime}ms`);
      
    } catch (error: any) {
      console.error(`${logPrefix} ❌ ERRO no pagamento:`, error);
      toast({
        title: "Erro ao processar pagamento",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      // SEMPRE limpar os locks, mesmo em caso de erro
      console.log(`${logPrefix} 🧹 Limpando locks de proteção...`);
      setProcessingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(installment.id);
        return newSet;
      });
      setGlobalProcessingLock(false);
      console.log(`${logPrefix} ✅ Locks removidos com sucesso`);
    }
  };

  const handleDeleteInstallment = async (purchaseName: string) => {
    console.log('🚀 === INICIO HANDLE DELETE INSTALLMENT ===');
    console.log('🎯 Purchase name to delete:', purchaseName);
    console.log('👤 Current user:', user?.id);
    console.log('🏢 Current account:', currentAccount?.id);
    
    const userId = currentAccount?.id || user?.id;
    console.log('🆔 Final userId:', userId);
    
    if (!userId) {
      console.error('❌ No user ID found');
      toast({
        title: "Erro de autenticação",
        description: "Usuário não identificado",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Buscar todas as parcelas da compra ANTES de deletar
      console.log('🔍 1. Buscando parcelas da compra antes do delete...');
      const { data: beforeInstallments, error: beforeError } = await supabase
        .from('installments')
        .select('*')
        .eq('purchase_name', purchaseName)
        .eq('user_id', userId);

      console.log('📊 Parcelas encontradas ANTES:', beforeInstallments?.length || 0);
      console.log('📋 Data ANTES:', beforeInstallments);
      
      if (beforeError) {
        console.error('❌ Erro ao buscar parcelas ANTES:', beforeError);
        throw beforeError;
      }

      if (!beforeInstallments || beforeInstallments.length === 0) {
        console.log('❌ Nenhuma parcela encontrada ANTES do delete');
        toast({
          title: "Erro",
          description: "Nenhuma parcela encontrada para esta compra",
          variant: "destructive",
        });
        return;
      }

      // 2. Verificar se todas as parcelas estão pagas
      const unpaidInstallments = beforeInstallments.filter(inst => !inst.is_paid);
      console.log('💰 Parcelas não pagas:', unpaidInstallments.length);
      console.log('💳 Parcelas pagas:', beforeInstallments.length - unpaidInstallments.length);

      if (unpaidInstallments.length > 0) {
        console.log('⛔ Existem parcelas não pagas, não é possível deletar');
        toast({
          title: "Não é possível excluir",
          description: `Você só pode excluir esta compra após pagar todas as ${beforeInstallments.length} parcelas. Restam ${unpaidInstallments.length} parcela(s) não pagas.`,
          variant: "destructive",
        });
        return;
      }

      // 3. Confirmar com o usuário
      console.log('❓ Solicitando confirmação do usuário');
      const confirmDelete = window.confirm(
        `Tem certeza que deseja excluir permanentemente a compra "${purchaseName}"? Esta ação não pode ser desfeita.`
      );
      
      if (!confirmDelete) {
        console.log('❌ Usuário cancelou a operação');
        return;
      }

      console.log('✅ Usuário confirmou o delete, prosseguindo...');

      // 4. Executar o delete
      console.log('🗑️ Executando DELETE na base de dados...');
      const { error: deleteError, count } = await supabase
        .from('installments')
        .delete({ count: 'exact' })
        .eq('purchase_name', purchaseName)
        .eq('user_id', userId);

      console.log('📈 Registros deletados (count):', count);
      
      if (deleteError) {
        console.error('❌ Erro no DELETE:', deleteError);
        throw deleteError;
      }

      console.log('✅ DELETE executado com sucesso');

      // 5. Verificar se realmente foi deletado
      console.log('🔍 Verificando se foi realmente deletado...');
      const { data: afterInstallments, error: afterError } = await supabase
        .from('installments')
        .select('*')
        .eq('purchase_name', purchaseName)
        .eq('user_id', userId);

      console.log('📊 Parcelas encontradas APÓS delete:', afterInstallments?.length || 0);
      console.log('📋 Data APÓS:', afterInstallments);

      if (afterError) {
        console.error('❌ Erro ao verificar após delete:', afterError);
      }

      // 6. Verificar estado atual dos installments no hook
      console.log('📱 Estado atual dos installments no componente:', installments.length);
      console.log('📋 Installments atuais:', installments.map(i => i.purchase_name));

      // 7. Exibir sucesso
      toast({
        title: "Cartão de crédito removido",
        description: "A compra foi removida da lista sem afetar as transações",
      });

      // 8. Forçar refetch
      console.log('🔄 Forçando refetch...');
      await refetch();
      
      // 9. Verificar novamente após refetch
      setTimeout(async () => {
        console.log('🔍 Verificando dados após refetch...');
        const { data: finalCheck } = await supabase
          .from('installments')
          .select('*')
          .eq('user_id', userId);
        console.log('📊 Total de installments após refetch:', finalCheck?.length || 0);
        console.log('📋 Compras após refetch:', [...new Set(finalCheck?.map(i => i.purchase_name) || [])]);
      }, 1000);

      console.log('🎉 === FIM HANDLE DELETE INSTALLMENT ===');

    } catch (error: any) {
      console.error('💥 Erro geral no delete:', error);
      console.error('💥 Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: "Erro ao remover cartão de crédito",
        description: error.message || 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const handleEditPurchase = (purchaseName: string, purchaseInstallments: Installment[]) => {
    const firstInstallment = purchaseInstallments[0];
    setEditingPurchase(purchaseName);
    setEditInstallment({
      purchase_name: firstInstallment.purchase_name,
      installment_amount: firstInstallment.installment_amount.toString(),
      total_installments: firstInstallment.total_installments.toString(),
      category_id: firstInstallment.category_id || '',
      first_payment_date: firstInstallment.first_payment_date,
      notes: firstInstallment.notes || ''
    });
    setIsEditOpen(true);
  };

  const handleUpdatePurchase = async () => {
    if (!editingPurchase || !editInstallment.purchase_name || !editInstallment.installment_amount || 
        !editInstallment.total_installments || !editInstallment.first_payment_date) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const installmentAmount = parseFloat(editInstallment.installment_amount.replace(',', '.'));
    const totalInstallments = parseInt(editInstallment.total_installments);
    
    if (isNaN(installmentAmount) || isNaN(totalInstallments) || totalInstallments <= 0) {
      toast({
        title: "Valores inválidos",
        description: "Digite valores numéricos válidos",
        variant: "destructive",
      });
      return;
    }

    const userId = currentAccount?.id || user?.id;
    
    if (!userId) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não identificado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    try {
      const totalAmount = installmentAmount * totalInstallments;
      const lastPaymentDate = calculateLastPaymentDate(editInstallment.first_payment_date, totalInstallments);
      
      // Primeiro, buscar as parcelas existentes para verificar se alguma está paga
      const { data: existingInstallments, error: fetchError } = await supabase
        .from('installments')
        .select('*')
        .eq('purchase_name', editingPurchase)
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const paidInstallments = existingInstallments?.filter(inst => inst.is_paid) || [];
      
      // Verificar se a nova quantidade é menor que as parcelas já pagas
      if (totalInstallments < paidInstallments.length) {
        toast({
          title: "Não é possível reduzir parcelas",
          description: `Você já pagou ${paidInstallments.length} parcela(s). Não é possível reduzir para ${totalInstallments} parcela(s).`,
          variant: "destructive",
        });
        return;
      }

      // Deletar todas as parcelas existentes
      const { error: deleteError } = await supabase
        .from('installments')
        .delete()
        .eq('purchase_name', editingPurchase)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Criar as novas parcelas com a quantidade atualizada
      const installmentsToCreate = [];
      // Parse date correctly to avoid timezone issues
      const [year, month, day] = editInstallment.first_payment_date.split('-').map(Number);
      const firstDate = new Date(year, month - 1, day); // month is 0-based
      
      for (let i = 0; i < totalInstallments; i++) {
        // Verificar se esta parcela estava paga antes
        const wasPaid = paidInstallments.find(paid => paid.current_installment === i + 1);
        
        installmentsToCreate.push({
          user_id: userId,
          purchase_name: editInstallment.purchase_name,
          total_amount: totalAmount,
          installment_amount: installmentAmount,
          total_installments: totalInstallments,
          current_installment: i + 1,
          first_payment_date: editInstallment.first_payment_date,
          last_payment_date: lastPaymentDate,
          category_id: editInstallment.category_id || null,
          notes: editInstallment.notes || null,
          receipt_url: existingInstallments?.[0]?.receipt_url || null,
          is_paid: wasPaid ? true : false,
          paid_at: wasPaid ? wasPaid.paid_at : null
        });
      }

      // Inserir as novas parcelas
      const { error: insertError } = await supabase
        .from('installments')
        .insert(installmentsToCreate);

      if (insertError) throw insertError;

      toast({
        title: "Compra atualizada!",
        description: "As informações do cartão de crédito foram atualizadas com sucesso",
      });

      setIsEditOpen(false);
      setEditingPurchase(null);
      setEditInstallment({
        purchase_name: '',
        installment_amount: '',
        total_installments: '',
        category_id: '',
        first_payment_date: '',
        notes: ''
      });
      
      await triggerMultiLayerUpdate('installment-edit');
      refetch();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar compra",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditSingleInstallment = (installment: Installment) => {
    setEditingInstallment(installment);
    setEditSingleInstallment({
      installment_amount: installment.installment_amount.toString(),
      category_id: installment.category_id || '',
      notes: installment.notes || ''
    });
    setIsEditInstallmentOpen(true);
  };

  const handleUpdateSingleInstallment = async () => {
    if (!editingInstallment || !editSingleInstallment.installment_amount) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o valor da parcela",
        variant: "destructive",
      });
      return;
    }

    const installmentAmount = parseFloat(editSingleInstallment.installment_amount.replace(',', '.'));
    
    if (isNaN(installmentAmount)) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor numérico válido",
        variant: "destructive",
      });
      return;
    }

    const userId = currentAccount?.id || user?.id;
    
    if (!userId) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não identificado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('installments')
        .update({
          installment_amount: installmentAmount,
          category_id: editSingleInstallment.category_id || null,
          notes: editSingleInstallment.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingInstallment.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Parcela atualizada!",
        description: "As informações da parcela foram atualizadas com sucesso",
      });

      setIsEditInstallmentOpen(false);
      setEditingInstallment(null);
      setEditSingleInstallment({
        installment_amount: '',
        category_id: '',
        notes: ''
      });
      
      await triggerMultiLayerUpdate('installment-edit');
      refetch();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar parcela",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelPurchase = async (purchaseName: string, purchaseInstallments: Installment[]) => {
    try {
      const userId = currentAccount?.id || user?.id;
      console.log('HandleCancelPurchase - userId:', userId, 'purchaseName:', purchaseName);
      
      if (!userId) {
        toast({
          title: "Erro de autenticação",
          description: "Usuário não identificado",
          variant: "destructive",
        });
        return;
      }

      const confirmCancel = window.confirm(
        `Tem certeza que deseja cancelar/reembolsar a compra "${purchaseName}"? Isso irá desfazer todas as alterações no saldo e remover as transações relacionadas.`
      );
      
      if (!confirmCancel) return;

      console.log('HandleCancelPurchase - Iniciando cancelamento');

      // Buscar e deletar todas as transações relacionadas às parcelas pagas
      const paidInstallments = purchaseInstallments.filter(i => i.is_paid);
      console.log('HandleCancelPurchase - paidInstallments:', paidInstallments);
      
      for (const installment of paidInstallments) {
        const transactionDescription = `${installment.purchase_name} (${installment.current_installment}/${installment.total_installments})`;
        console.log('HandleCancelPurchase - Deletando transação:', transactionDescription);
        
        const { error: deleteTransactionError } = await supabase
          .from('transactions')
          .delete()
          .eq('user_id', userId)
          .eq('description', transactionDescription)
          .eq('type', 'expense');

        if (deleteTransactionError) {
          console.error('Erro ao deletar transação:', deleteTransactionError);
        }
      }

      console.log('HandleCancelPurchase - Deletando parcelas da compra');
      
      // Deletar todas as parcelas da compra
      const { error: deleteInstallmentsError } = await supabase
        .from('installments')
        .delete()
        .eq('purchase_name', purchaseName)
        .eq('user_id', userId);

      console.log('HandleCancelPurchase - Delete result error:', deleteInstallmentsError);
      if (deleteInstallmentsError) throw deleteInstallmentsError;

      // Criar notificação de cancelamento
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Compra Cancelada/Reembolsada',
          message: `A compra "${purchaseName}" foi cancelada e todas as alterações no saldo foram desfeitas`,
          type: 'info'
        });

      toast({
        title: "Compra cancelada/reembolsada",
        description: "Todas as alterações no saldo foram desfeitas e as transações removidas",
      });

      console.log('HandleCancelPurchase - Chamando refetch');
      refetch();
      // Invalida queries para atualizar UI em tempo real
      queryClient.invalidateQueries({ queryKey: ['transactions', currentAccount?.id] });
    } catch (error: any) {
      console.error('Cancel error:', error);
      toast({
        title: "Erro ao cancelar compra",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Agrupar parcelas por compra
  const groupedInstallments = installments.reduce((acc, installment) => {
    if (!acc[installment.purchase_name]) {
      acc[installment.purchase_name] = [];
    }
    acc[installment.purchase_name].push(installment);
    return acc;
  }, {} as Record<string, Installment[]>);

  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  const handleDownloadReceipt = async (receiptUrl: string, description: string) => {
    const link = document.createElement('a');
    link.href = receiptUrl;
    link.download = `comprovante-${description.replace(/[^a-zA-Z0-9]/g, '-')}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Nova funcionalidade: Pagar todas as faturas de um mês
  const handlePayAllInstallmentsForMonth = async () => {
    if (!selectedMonth) {
      toast({
        title: "Selecione um mês",
        description: "Escolha o mês para pagar todas as faturas",
        variant: "destructive",
      });
      return;
    }

    const [year, month] = selectedMonth.split('-');
    const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    
    // Filtrar todas as parcelas não pagas do mês selecionado usando a mesma lógica do hook useInstallments
    const installmentsForMonth = installments.filter(installment => {
      if (installment.is_paid) return false;
      
      // Calcular a data de vencimento desta parcela específica usando o mesmo método do hook
      const [year, month, day] = installment.first_payment_date.split('-').map(Number);
      const firstPaymentDate = new Date(year, month - 1, day);
      const paymentDate = addMonths(firstPaymentDate, installment.current_installment - 1);
      
      // Verificar se a parcela está no mês/ano selecionado
      const paymentYear = paymentDate.getFullYear();
      const paymentMonth = paymentDate.getMonth() + 1; // getMonth() retorna 0-11, precisamos 1-12
      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = selectedDate.getMonth() + 1;
      
      return paymentYear === selectedYear && paymentMonth === selectedMonth;
    });

    if (installmentsForMonth.length === 0) {
      toast({
        title: "Nenhuma fatura encontrada",
        description: `Não há faturas pendentes para ${new Date(selectedDate).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })}`,
        variant: "destructive",
      });
      return;
    }

    const totalValue = installmentsForMonth.reduce((sum, inst) => sum + inst.installment_amount, 0);
    
    const confirmPayment = window.confirm(
      `Confirma o pagamento de ${installmentsForMonth.length} fatura(s) de ${new Date(selectedDate).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })}?\n\nValor total: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );

    if (!confirmPayment) return;

    setGlobalProcessingLock(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;

      // Processar cada parcela sequencialmente para evitar conflitos
      for (const installment of installmentsForMonth) {
        try {
          const { data, error } = await supabase
            .rpc('process_installment_payment', {
              p_installment_id: installment.id,
              p_user_id: currentAccount?.id || user?.id,
              p_amount: installment.installment_amount,
              p_description: `${installment.purchase_name} (${installment.current_installment}/${installment.total_installments})`,
              p_category_id: installment.category_id,
              p_receipt_url: installment.receipt_url
            });

          if (error) {
            console.error(`Erro ao pagar parcela ${installment.id}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
          
          // Pequeno delay entre pagamentos para evitar sobrecarga
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Erro ao processar parcela ${installment.id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Pagamentos processados!",
          description: `${successCount} fatura(s) paga(s) com sucesso${errorCount > 0 ? `. ${errorCount} erro(s) encontrado(s)` : ''}`,
        });
        
        // Aguardar um pouco para o trigger do banco completar
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('🔄 FORCING COMPLETE BALANCE UPDATE after month payment...');
        
        // Invalidar e forçar refetch de TODAS as queries relacionadas
        await Promise.all([
          refetch(),
          queryClient.invalidateQueries({ queryKey: ['transactions'] }),
          queryClient.invalidateQueries({ queryKey: ['installments'] }),
          queryClient.invalidateQueries({ queryKey: ['notifications'] }),
          // Forçar refetch imediato das queries principais
          queryClient.refetchQueries({ queryKey: ['transactions', currentAccount?.id] }),
          queryClient.refetchQueries({ queryKey: ['installments', currentAccount?.id] })
        ]);
        
        // Forçar atualizações adicionais para garantir sincronia total
        setTimeout(async () => {
          console.log('🔄 SECONDARY REFETCH for month payment balance consistency...');
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['transactions', currentAccount?.id] }),
            queryClient.refetchQueries({ queryKey: ['installments', currentAccount?.id] })
          ]);
        }, 400);
      }

      if (errorCount > 0 && successCount === 0) {
        toast({
          title: "Erro no pagamento",
          description: "Não foi possível processar nenhuma fatura. Tente novamente.",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      toast({
        title: "Erro no pagamento em lote",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setGlobalProcessingLock(false);
      setIsMonthPaymentOpen(false);
      setSelectedMonth('');
    }
  };

  // Gerar opções de meses para o select (últimos 12 meses + próximos 12 meses)
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    // Últimos 12 meses
    for (let i = 12; i >= 1; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    
    // Mês atual
    const currentValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const currentLabel = currentDate.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
    options.push({ value: currentValue, label: currentLabel });
    
    // Próximos 12 meses
    for (let i = 1; i <= 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    
    return options;
  };

  // Listener para eventos customizados de abertura de modal
  useEffect(() => {
    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener('open-installment-purchases-modal', handleOpenModal);
    return () => window.removeEventListener('open-installment-purchases-modal', handleOpenModal);
  }, []);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-col h-16 sm:h-20 space-y-1 sm:space-y-2 bg-gradient-to-br from-warning/5 to-warning/15 border-warning/20 hover:border-warning/40 hover:bg-gradient-to-br hover:from-warning/10 hover:to-warning/20 hover:shadow-warning transition-all duration-300 transform hover:scale-105 group">
          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-warning group-hover:scale-110 transition-transform duration-300" />
          <span className="text-xs sm:text-sm px-1 text-warning font-medium">Cartão de Crédito</span>
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
            <div className="absolute -top-4 left-0 right-0 h-1 bg-gradient-warning rounded-t-lg"></div>
            
            {/* Icon with glow effect */}
            <div className="w-16 h-16 mx-auto bg-gradient-warning rounded-2xl flex items-center justify-center shadow-warning animate-glow-pulse">
              <CreditCard className="h-8 w-8 text-white" />
            </div>
            
            <div className="text-center">
              <DialogTitle className="text-2xl font-bold bg-gradient-warning bg-clip-text text-transparent">
                Compras no Cartão de Crédito
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Gerencie todas as suas compras no cartão de crédito
              </p>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 p-4 sm:p-6">
          {/* Formulário para adicionar nova compra parcelada */}
          <Card className="border-2 border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10 dark:from-warning/10 dark:to-warning/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-3 text-warning-dark dark:text-warning">
                <div className="w-10 h-10 bg-gradient-warning rounded-xl flex items-center justify-center">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                Criar Nova Compra no Cartão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    Nome da Compra <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={newInstallment.purchase_name}
                    onChange={(e) => setNewInstallment(prev => ({ ...prev, purchase_name: e.target.value }))}
                    placeholder="Ex: Smartphone, Televisão, Sofá..."
                    className="h-12 text-base border-2 bg-white/70 backdrop-blur-sm focus:shadow-credit transition-all duration-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    Valor da Parcela (R$) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      value={newInstallment.installment_amount}
                      onChange={(e) => setNewInstallment(prev => ({ ...prev, installment_amount: e.target.value }))}
                      placeholder="0,00"
                      className="pl-8 h-12 text-lg font-medium border-2 bg-white/70 backdrop-blur-sm focus:shadow-credit transition-all duration-300"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    Quantidade de Parcelas <span className="text-red-500">*</span>
                  </Label>
                  <Select value={newInstallment.total_installments} onValueChange={(value) => setNewInstallment(prev => ({ ...prev, total_installments: value }))}>
                    <SelectTrigger className="h-12 border-2 bg-white/70 backdrop-blur-sm focus:shadow-credit transition-all duration-300">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-md border-2">
                      {Array.from({ length: 48 }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()} className="text-sm font-medium">
                          <div className="flex items-center justify-between w-full">
                            <span>{num}x</span>
                            {num === 1 && <span className="text-xs text-green-600 ml-2">À vista</span>}
                            {num === 2 && <span className="text-xs text-blue-600 ml-2">Popular</span>}
                            {num === 12 && <span className="text-xs text-orange-600 ml-2">1 ano</span>}
                            {num === 24 && <span className="text-xs text-purple-600 ml-2">2 anos</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    Data do Primeiro Pagamento <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={newInstallment.first_payment_date}
                      onChange={(e) => setNewInstallment(prev => ({ ...prev, first_payment_date: e.target.value }))}
                      className="h-12 border-2 bg-white/70 backdrop-blur-sm focus:shadow-credit transition-all duration-300"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    Categoria <span className="text-red-500">*</span>
                  </Label>
                  <Select value={newInstallment.category_id} onValueChange={(value) => setNewInstallment(prev => ({ ...prev, category_id: value }))}>
                    <SelectTrigger className="h-12 border-2 bg-white/70 backdrop-blur-sm focus:shadow-credit transition-all duration-300">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-md border-2">
                      {expenseCategories.map(category => (
                        <SelectItem key={category.id} value={category.id} className="text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{category.icon || '📁'}</span>
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Observações</Label>
                <Input
                  value={newInstallment.notes}
                  onChange={(e) => setNewInstallment(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Informações adicionais sobre a compra..."
                  className="h-12 border-2 bg-white/70 backdrop-blur-sm focus:shadow-credit transition-all duration-300"
                />
              </div>
              
              {/* Summary Card */}
              {newInstallment.installment_amount && newInstallment.total_installments && (
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl p-4 border border-blue-200/30">
                  <h4 className="font-semibold text-base text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Resumo da Compra
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Valor total:</span>
                      <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                        R$ {(parseFloat(newInstallment.installment_amount.replace(',', '.')) * parseInt(newInstallment.total_installments || '0')).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Parcelas:</span>
                      <span className="font-medium">
                        {newInstallment.total_installments}x de R$ {parseFloat(newInstallment.installment_amount.replace(',', '.') || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {newInstallment.first_payment_date && newInstallment.total_installments && (
                      <div className="flex justify-between items-center sm:col-span-2">
                        <span className="text-muted-foreground">Último pagamento:</span>
                        <span className="font-medium">
                          {(() => {
                            const [year, month, day] = newInstallment.first_payment_date.split('-').map(Number);
                            const firstDate = new Date(year, month - 1, day);
                            return format(addMonths(firstDate, parseInt(newInstallment.total_installments) - 1), 'dd/MM/yyyy');
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleAddInstallment} 
                  className="flex-1 h-12 text-base font-semibold bg-gradient-warning hover:shadow-warning transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Criar Nova Compra
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 h-12 text-base font-semibold"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Botão para pagar todas as faturas do mês */}
          {Object.keys(groupedInstallments).length > 0 && (
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Pagamento em Lote</h4>
                      <p className="text-sm text-muted-foreground">
                        Pague todas as faturas de um mês específico
                      </p>
                    </div>
                  </div>
                  <Dialog open={isMonthPaymentOpen} onOpenChange={setIsMonthPaymentOpen}>
                    <DialogTrigger asChild>
                      <Button variant="default" className="bg-primary hover:bg-primary/90">
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Pagar Mês
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Pagar Todas as Faturas do Mês</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Selecione o mês</Label>
                          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger>
                              <SelectValue placeholder="Escolha o mês" />
                            </SelectTrigger>
                            <SelectContent>
                              {generateMonthOptions().map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {selectedMonth && (
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm font-medium mb-2">
                              Faturas pendentes para {generateMonthOptions().find(opt => opt.value === selectedMonth)?.label}:
                            </p>
                            {(() => {
                              const [year, month] = selectedMonth.split('-');
                              const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                              const monthInstallments = installments.filter(installment => {
                                if (installment.is_paid) return false;
                                
                                // Calcular a data de vencimento desta parcela específica usando o mesmo método do hook
                                const [year, month, day] = installment.first_payment_date.split('-').map(Number);
                                const firstPaymentDate = new Date(year, month - 1, day);
                                const paymentDate = addMonths(firstPaymentDate, installment.current_installment - 1);
                                
                                // Verificar se a parcela está no mês/ano selecionado
                                const paymentYear = paymentDate.getFullYear();
                                const paymentMonth = paymentDate.getMonth() + 1; // getMonth() retorna 0-11, precisamos 1-12
                                const selectedYear = selectedDate.getFullYear();
                                const selectedMonth = selectedDate.getMonth() + 1;
                                
                                return paymentYear === selectedYear && paymentMonth === selectedMonth;
                              });
                              
                              if (monthInstallments.length === 0) {
                                return <p className="text-sm text-muted-foreground">Nenhuma fatura pendente</p>;
                              }
                              
                              const totalValue = monthInstallments.reduce((sum, inst) => sum + inst.installment_amount, 0);
                              return (
                                <div className="space-y-1">
                                  <p className="text-sm">
                                    {monthInstallments.length} fatura(s) • 
                                    Total: R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setIsMonthPaymentOpen(false);
                              setSelectedMonth('');
                            }}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handlePayAllInstallmentsForMonth}
                            disabled={!selectedMonth || globalProcessingLock}
                            className="flex-1"
                          >
                            {globalProcessingLock ? 'Processando...' : 'Confirmar Pagamento'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de compras parceladas */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-medium">Suas Compras Parceladas</h3>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar compras..."
                  className="pl-10 pr-10 h-9 w-full sm:w-64 border border-border/50 focus:border-warning transition-colors"
                />
              </div>
            </div>
            {Object.keys(groupedInstallments).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum cartão de crédito cadastrado
              </p>
            ) : (
              Object.entries(groupedInstallments)
                .filter(([purchaseName]) => 
                  purchaseName.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(([purchaseName, purchaseInstallments]: [string, Installment[]]) => {
                const paidCount = (purchaseInstallments as Installment[]).filter(i => i.is_paid).length;
                const totalInstallments = (purchaseInstallments as Installment[]).length;
                const categoryInfo = categories.find(cat => cat.id === purchaseInstallments[0]?.category_id);
                
                return (
                <Card key={purchaseName}>
                    <CardHeader>
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{categoryInfo?.icon || '🛍️'}</div>
                          <div>
                            <h4 className="font-medium">{purchaseName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {paidCount}/{totalInstallments} parcelas pagas • 
                              R$ {purchaseInstallments[0]?.installment_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês • 
                              Total: R$ {purchaseInstallments[0]?.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                         <div className="flex flex-wrap gap-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleEditPurchase(purchaseName, purchaseInstallments as Installment[])}
                             className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400 text-xs"
                           >
                             <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                             <span className="hidden sm:inline">Editar</span>
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleCancelPurchase(purchaseName, purchaseInstallments as Installment[])}
                             className="text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400 text-xs"
                           >
                             <RefreshCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                             <span className="hidden sm:inline">Reembolso</span>
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleDeleteInstallment(purchaseName)}
                             className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 text-xs"
                           >
                             <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                             <span className="hidden sm:inline">Excluir</span>
                           </Button>
                         </div>
                      </div>
                    </CardHeader>
                     <CardContent>
                         {/* Mostrar imagem do comprovante se existir */}
                         {purchaseInstallments[0]?.receipt_url && (
                            <div className="mb-4 p-3 border rounded-lg bg-background/50">
                              <div className="flex items-center gap-2 mb-2">
                                <Image className="h-4 w-4" />
                                <span className="text-sm font-medium">Comprovante da Compra</span>
                              </div>
                              <div className="relative group">
                                <img 
                                  src={purchaseInstallments[0].receipt_url} 
                                  alt="Comprovante do cartão de crédito" 
                                  className="w-full h-auto max-h-48 object-contain rounded-lg border shadow-sm mx-auto"
                                />
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDownloadReceipt(purchaseInstallments[0].receipt_url!, purchaseInstallments[0].purchase_name)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                         )}
                        
                       
                        <div className="grid gap-2 max-h-40 overflow-y-auto">
                           {(purchaseInstallments as Installment[])
                             .sort((a, b) => a.current_installment - b.current_installment)
                            .map(installment => (
                            <div key={installment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <span className="text-sm font-medium">
                                  {installment.current_installment}ª parcela
                                </span>
                                 <span className="text-sm text-muted-foreground">
                                   R$ {installment.installment_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • 
                                    {(() => {
                                      const [year, month, day] = installment.first_payment_date.split('-').map(Number);
                                      const firstDate = new Date(year, month - 1, day);
                                      return format(addMonths(firstDate, installment.current_installment - 1), 'dd/MM/yyyy');
                                    })()}
                                 </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {installment.is_paid ? (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    <Check className="h-3 w-3 mr-1" />
                                    Pago
                                  </Badge>
                                ) : (
                                   <Button
                                     size="sm"
                                     onClick={() => handleMarkAsPaid(installment)}
                                     disabled={processingPayments.has(installment.id)}
                                     className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-xs"
                                   >
                                     <Check className="h-3 w-3 mr-1" />
                                     <span className="hidden sm:inline">{processingPayments.has(installment.id) ? 'Processando...' : 'Pagar'}</span>
                                     <span className="sm:hidden">💰</span>
                                   </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
          
          {/* Banner de Anúncios - apenas para contas gratuitas */}
          {!isPremium && <AdBanner refreshInterval={45} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de Edição da Compra */}
    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cartão de Crédito</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-purchase-name">Nome da Compra</Label>
            <Input
              id="edit-purchase-name"
              value={editInstallment.purchase_name}
              onChange={(e) => setEditInstallment(prev => ({ ...prev, purchase_name: e.target.value }))}
              placeholder="Nome da compra"
            />
          </div>

          <div>
            <Label htmlFor="edit-installment-amount">Valor das Parcelas</Label>
            <Input
              id="edit-installment-amount"
              value={editInstallment.installment_amount}
              onChange={(e) => setEditInstallment(prev => ({ ...prev, installment_amount: e.target.value }))}
              placeholder="0,00"
              type="text"
            />
          </div>

          <div>
            <Label htmlFor="edit-total-installments">Quantidade de Parcelas</Label>
            <Input
              id="edit-total-installments"
              type="number"
              value={editInstallment.total_installments}
              onChange={(e) => setEditInstallment(prev => ({ ...prev, total_installments: e.target.value }))}
              placeholder="12"
              min="1"
              max="48"
            />
          </div>

          <div>
            <Label htmlFor="edit-category">Categoria</Label>
            <Select 
              value={editInstallment.category_id} 
              onValueChange={(value) => setEditInstallment(prev => ({ ...prev, category_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <span>{category.icon || '📁'}</span>
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="edit-first-payment-date">Data do Primeiro Pagamento</Label>
            <Input
              id="edit-first-payment-date"
              type="date"
              value={editInstallment.first_payment_date}
              onChange={(e) => setEditInstallment(prev => ({ ...prev, first_payment_date: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="edit-notes">Observações (opcional)</Label>
            <Input
              id="edit-notes"
              value={editInstallment.notes}
              onChange={(e) => setEditInstallment(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações sobre a compra"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdatePurchase}
              className="flex-1"
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de Edição de Parcela Individual */}
    <Dialog open={isEditInstallmentOpen} onOpenChange={setIsEditInstallmentOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Parcela</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {editingInstallment && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium">
                {editingInstallment.current_installment}ª parcela de {editingInstallment.purchase_name}
              </p>
              <p className="text-xs text-muted-foreground">
                Vencimento: {(() => {
                  const [year, month, day] = editingInstallment.first_payment_date.split('-').map(Number);
                  const firstDate = new Date(year, month - 1, day);
                  return format(addMonths(firstDate, editingInstallment.current_installment - 1), 'dd/MM/yyyy');
                })()}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="edit-single-installment-amount">Valor da Parcela</Label>
            <Input
              id="edit-single-installment-amount"
              value={editSingleInstallment.installment_amount}
              onChange={(e) => setEditSingleInstallment(prev => ({ ...prev, installment_amount: e.target.value }))}
              placeholder="0,00"
              type="text"
            />
          </div>

          <div>
            <Label htmlFor="edit-single-category">Categoria</Label>
            <Select 
              value={editSingleInstallment.category_id} 
              onValueChange={(value) => setEditSingleInstallment(prev => ({ ...prev, category_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <span>{category.icon || '📁'}</span>
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="edit-single-notes">Observações (opcional)</Label>
            <Input
              id="edit-single-notes"
              value={editSingleInstallment.notes}
              onChange={(e) => setEditSingleInstallment(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações sobre esta parcela"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditInstallmentOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateSingleInstallment}
              className="flex-1"
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};