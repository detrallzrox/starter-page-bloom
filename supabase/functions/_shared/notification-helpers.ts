import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Obtém uma lista de IDs de usuários que devem ser notificados para um determinado evento de conta.
 * Isso inclui o proprietário da conta e todos os usuários com quem a conta foi compartilhada e aceita.
 * 
 * @param supabaseAdmin - O cliente Supabase com permissões de administrador.
 * @param ownerId - O ID do usuário proprietário da conta.
 * @returns Uma promessa que resolve para um array de IDs de usuário.
 */
export async function getUsersToNotify(supabaseAdmin: any, ownerId: string): Promise<string[]> {
  if (!ownerId) {
    console.warn('[getUsersToNotify] ownerId não fornecido. Retornando array vazio.');
    return [];
  }

  try {
    // Buscar todas as contas compartilhadas aceitas onde o usuário é o proprietário
    const { data: sharedAccounts, error: sharedError } = await supabaseAdmin
      .from('shared_accounts')
      .select('shared_with_id')
      .eq('owner_id', ownerId)
      .eq('status', 'accepted');

    if (sharedError) {
      console.error('[getUsersToNotify] Erro ao buscar contas compartilhadas:', sharedError);
      // Em caso de erro, notificar pelo menos o proprietário
      return [ownerId];
    }

    // Extrair os IDs dos usuários compartilhados
    const sharedUserIds = sharedAccounts?.map(sa => sa.shared_with_id) || [];

    // A lista de usuários a notificar inclui o proprietário e os usuários compartilhados
    const usersToNotify = [ownerId, ...sharedUserIds];

    // Remover duplicatas (embora improvável, é uma boa prática)
    const uniqueUserIds = [...new Set(usersToNotify)];

    console.log(`[getUsersToNotify] Usuários a notificar para o proprietário ${ownerId}:`, uniqueUserIds);

    return uniqueUserIds;
  } catch (error) {
    console.error('[getUsersToNotify] Erro inesperado:', error);
    // Garantir que o proprietário seja notificado mesmo em caso de falha
    return [ownerId];
  }
}