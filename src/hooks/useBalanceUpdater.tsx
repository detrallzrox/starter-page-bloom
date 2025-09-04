import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountContext } from './useAccountContext';
import { useAuth } from './useAuth';

/**
 * Hook personalizado para gerenciar atualizações de saldo de forma robusta
 * Garante que TODOS os saldos sejam atualizados automaticamente em tempo real
 */
export const useBalanceUpdater = () => {
  const queryClient = useQueryClient();
  const { currentAccount } = useAccountContext();
  const { user } = useAuth();

  /**
   * Força uma atualização completa e agressiva de todos os dados relacionados ao saldo
   * Utiliza múltiplas estratégias para garantir que a UI seja atualizada
   */
  const forceCompleteBalanceUpdate = useCallback(async (delayMs: number = 150) => {
    if (!user || !currentAccount) {
      console.warn('⚠️ forceCompleteBalanceUpdate: User or account not available');
      return { success: false, error: 'User or account not available' };
    }

    console.log('🚀 FORCING COMPLETE BALANCE UPDATE for account:', currentAccount.id);
    
    try {
      // 1. Aguardar triggers do banco completarem
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // 2. Invalidar TODAS as queries relacionadas simultaneamente
      const invalidatePromises = [
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['installments'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['bill-reminders'] }),
        queryClient.invalidateQueries({ queryKey: ['category-budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
      ];
      
      // 3. Forçar refetch imediato das queries principais simultaneamente
      const refetchPromises = [
        queryClient.refetchQueries({ queryKey: ['transactions', currentAccount.id] }),
        queryClient.refetchQueries({ queryKey: ['installments', currentAccount.id] }),
        queryClient.refetchQueries({ queryKey: ['notifications', currentAccount.id] }),
        queryClient.refetchQueries({ queryKey: ['bill-reminders', currentAccount.id] }),
        queryClient.refetchQueries({ queryKey: ['category-budgets', currentAccount.id] }),
        queryClient.refetchQueries({ queryKey: ['subscriptions', currentAccount.id] }),
      ];
      
      // 4. Executar tudo em paralelo para máxima eficiência
      await Promise.all([...invalidatePromises, ...refetchPromises]);
      
      console.log('✅ IMMEDIATE BALANCE UPDATE completed successfully');
      
      // 5. Múltiplas tentativas de backup para garantir consistência
      setTimeout(async () => {
        console.log('🔄 SECONDARY BALANCE UPDATE (backup 1)...');
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['transactions', currentAccount.id] }),
          queryClient.refetchQueries({ queryKey: ['installments', currentAccount.id] }),
          queryClient.refetchQueries({ queryKey: ['notifications', currentAccount.id] }),
          queryClient.refetchQueries({ queryKey: ['bill-reminders', currentAccount.id] }),
          queryClient.refetchQueries({ queryKey: ['category-budgets', currentAccount.id] }),
          queryClient.refetchQueries({ queryKey: ['subscriptions', currentAccount.id] })
        ]);
      }, 400);
      
      setTimeout(async () => {
        console.log('🔄 TERTIARY BALANCE UPDATE (backup 2)...');
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['transactions', currentAccount.id] }),
          queryClient.refetchQueries({ queryKey: ['installments', currentAccount.id] }),
          queryClient.refetchQueries({ queryKey: ['notifications', currentAccount.id] }),
          queryClient.refetchQueries({ queryKey: ['bill-reminders', currentAccount.id] }),
          queryClient.refetchQueries({ queryKey: ['category-budgets', currentAccount.id] }),
          queryClient.refetchQueries({ queryKey: ['subscriptions', currentAccount.id] })
        ]);
      }, 800);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error in forceCompleteBalanceUpdate:', error);
      return { success: false, error };
    }
  }, [queryClient, currentAccount?.id, user]);

  /**
   * Força uma recalculação direta dos saldos via banco de dados
   */
  const forceBalanceRecalculation = useCallback(async () => {
    if (!user || !currentAccount) return { success: false, error: 'User or account not available' };
    
    console.log('🔄 FORCING DATABASE BALANCE RECALCULATION for account:', currentAccount.id);
    
    try {
      // Buscar dados frescos do banco
      const { data: freshProfile, error } = await supabase
        .from('profiles')
        .select('current_balance, investment_balance')
        .eq('user_id', currentAccount.id)
        .single();

      if (error) {
        console.error('❌ Error fetching fresh profile data:', error);
        return { success: false, error };
      }

      console.log('💰 FRESH BALANCE DATA from database:', {
        current_balance: freshProfile?.current_balance,
        investment_balance: freshProfile?.investment_balance
      });
      
      // Forçar atualização das queries com dados frescos
      await forceCompleteBalanceUpdate(50);
      
      return { success: true, data: freshProfile };
      
    } catch (error) {
      console.error('❌ Error in forceBalanceRecalculation:', error);
      return { success: false, error };
    }
  }, [currentAccount?.id, user, forceCompleteBalanceUpdate]);

  /**
   * Sistema de atualização multi-camada para garantir que NADA passe despercebido
   */
  const triggerMultiLayerUpdate = useCallback(async (context: string = 'unknown') => {
    console.log(`🎯 TRIGGERING MULTI-LAYER UPDATE - Context: ${context}`);
    
    // Camada 1: Atualização imediata
    await forceCompleteBalanceUpdate(100);
    
    // Camada 2: Atualização com dados frescos do banco
    setTimeout(async () => {
      console.log(`🔄 LAYER 2 UPDATE - Context: ${context}`);
      await forceBalanceRecalculation();
    }, 300);
    
    // Camada 3: Verificação final de consistência
    setTimeout(async () => {
      console.log(`🔄 LAYER 3 FINAL CHECK - Context: ${context}`);
      await forceCompleteBalanceUpdate(0);
    }, 800);
    
  }, [forceCompleteBalanceUpdate, forceBalanceRecalculation]);

  return {
    forceCompleteBalanceUpdate,
    forceBalanceRecalculation,
    triggerMultiLayerUpdate
  };
};