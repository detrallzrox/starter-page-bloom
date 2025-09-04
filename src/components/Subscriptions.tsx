import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addMonths, startOfMonth, endOfMonth, isBefore, isAfter } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Smartphone, Plus, Trash2, Edit, CreditCard, AlertTriangle, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccountContext } from "@/hooks/useAccountContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { AdBanner } from "@/components/AdBanner";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";
import { useBalanceUpdater } from "@/hooks/useBalanceUpdater";
import { cn } from "@/lib/utils";

interface Subscription {
  id: string;
  name: string;
  amount: number;
  renewal_day: number;
  category: string;
  last_charged?: string;
  logo_type?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually';
  renewal_date?: string;
}

interface PaymentModalState {
  isOpen: boolean;
  selectedSubscriptions: string[];
  paymentMonth: Date;
  selectedFrequency?: 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually';
  showFrequencySelection: boolean;
}

const ICON_OPTIONS = [
  // Tecnologia e Streaming
  "📺", "🎵", "🎮", "📱", "💻", "🌐", "📡", "🎧", "📻", "📷", "📹", "💿", "💾", "💽", "🖥️", "🖨️", "⌨️", "🖱️",
  "📀", "🎥", "📽️", "🎞️", "📸", "📼", "🔍", "🔎", "💡", "🔦", "⚡", "🔌", "🎬",
  
  // Transporte e Veículos  
  "🚗", "🚕", "🚙", "🚌", "🚎", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛", "🚜", "🚲", "✈️", "🚁", "⛵", "🚤", "🚂", "🚃", "🚄", "🚅", "🚆", "🚇", "🚈", "🚉",
  
  // Casa e Moradia
  "🏠", "🏡", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "⛪",
  
  // Comida e Bebida
  "🍕", "🍔", "🌭", "🥪", "🌮", "🌯", "🥙", "🥚", "🍳", "🥞", "🥓", "🍗", "🍖", "🌭", "🍟", "🍿",
  "☕", "🍵", "🥤", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🍾", "🥛",
  
  // Saúde e Medicina
  "💊", "🏥", "⚕️", "💉", "🦷", "🧠", "💊", "🧪", "🔬",
  
  // Esportes e Fitness
  "🏀", "⚽", "🏈", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥅", "⛳", "🏄", "🏊", "🚴", "🧗", "🤸", "🏃", "🚶", "🧘",
  "🤾", "🤺", "⛷️", "🏂", "🤹", "🥊", "🤼", "🤽", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️",
  
  // Arte e Entretenimento
  "🎪", "🎨", "🖌️", "🖍️", "✏️", "🎭", "🎯", "🎲", "🃏", "🎰", "🎸", "🎹", "🥁", "🎤", "🎻", "🎺", "🎷",
  "🖼️", "📝",
  
  // Trabalho e Escritório
  "💼", "📂", "📁", "📋", "📌", "📍", "📎", "📏", "📐", "✂️", "🗑️", "📊", "📈", "📉",
  "📝", "📖", "📑", "📰", "📄", "📃", "📜", "📋", "📅", "📆", "📇", "💼", "📦", "📫", "📪", "📬", "📭", "📮",
  
  // Dinheiro e Finanças
  "💰", "💸", "💵", "💴", "💶", "💷", "💳", "💎", "⚖️", "🏦", "💹", "📊", "📈", "📉", "💱", "💲",
  
  // Ferramentas e Utilidades
  "🔧", "🔨", "⛏️", "🛠️", "🔩", "⚙️", "🔗", "🧰", "🔒", "🔓", "🔑",
  
  // Vestuário e Acessórios
  "👕", "👔", "👗", "👚", "👖", "👘", "👠", "👡", "👢", "👞", "👟", "👑", "🎩", "🧢", "👒", "🎓",
  "💍", "💎", "👑", "💼", "👜", "👝", "🎒", "💍", "⌚", "📱", "👓", "🌂", "☂️",
  
  // Natureza e Símbolos
  "🌟", "⭐", "🔥", "💫", "✨", "🌈", "☀️", "🌙", "⭐", "🌟", "💫", "⚡", "🔥", "💧", "❄️", "🌊",
  "🎈", "🎁", "🎀", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🎯", "🎲", "🧸", "🎂", "🎉", "🎊", "🎈"
];

const ICON_KEYWORDS = {
  "📺": ["tv", "televisao", "streaming", "netflix", "disney", "hbo", "prime"],
  "🎵": ["musica", "spotify", "apple", "deezer", "som", "audio"],
  "🎮": ["jogo", "game", "xbox", "playstation", "nintendo", "steam"],
  "📱": ["celular", "telefone", "mobile", "smartphone", "app"],
  "💻": ["computador", "notebook", "laptop", "software", "adobe"],
  "🚗": ["carro", "uber", "transporte", "combustivel", "gas"],
  "🏠": ["casa", "aluguel", "imovel", "moradia", "residencia"],
  "🍕": ["comida", "ifood", "delivery", "restaurante", "pizza"],
  "🛒": ["compras", "supermercado", "shopping", "varejo"],
  "💊": ["remedio", "farmacia", "saude", "medicamento"],
  "🏥": ["hospital", "medico", "consulta", "saude", "plano"],
  "✈️": ["viagem", "aviao", "turismo", "passagem", "hotel"],
  "🎬": ["cinema", "filme", "entretenimento", "netflix"],
  "📚": ["livro", "educacao", "curso", "escola", "estudo"],
  "💰": ["banco", "financeiro", "investimento", "dinheiro"],
  "🔒": ["seguranca", "seguro", "protecao", "antivirus"],
  "💳": ["cartao", "credito", "banco", "pagamento", "fatura"],
  "☕": ["cafe", "cafeteria", "bebida", "starbucks"],
  "🌐": ["internet", "web", "online", "digital", "site"]
};

const subscriptionCategories = [
  { value: 'streaming', label: 'Streaming', icon: '📺' },
  { value: 'music', label: 'Música', icon: '🎵' },
  { value: 'gaming', label: 'Jogos', icon: '🎮' },
  { value: 'productivity', label: 'Produtividade', icon: '💻' },
  { value: 'transport', label: 'Transporte', icon: '🚗' },
  { value: 'food', label: 'Alimentação', icon: '🍕' },
  { value: 'health', label: 'Saúde', icon: '💊' },
  { value: 'education', label: 'Educação', icon: '📚' },
  { value: 'finance', label: 'Financeiro', icon: '💰' },
  { value: 'other', label: 'Outros', icon: '📱' },
];

export const Subscriptions = () => {
  const { isPremium } = useCurrentAccountPremium();
  const [isOpen, setIsOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [newSubscription, setNewSubscription] = useState({
    name: '',
    amount: '',
    renewal_day: '',
    category: '',
    logo_type: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually',
    renewal_date: undefined as Date | undefined,
  });
  const [iconSearch, setIconSearch] = useState('');
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>({
    isOpen: false,
    selectedSubscriptions: [],
    paymentMonth: new Date(),
    selectedFrequency: undefined,
    showFrequencySelection: false
  });
  const [paidSubscriptionsThisMonth, setPaidSubscriptionsThisMonth] = useState<string[]>([]);
  const [lastPaymentDates, setLastPaymentDates] = useState<Record<string, string>>({});
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const { addTransaction } = useTransactions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { triggerMultiLayerUpdate } = useBalanceUpdater();

  useEffect(() => {
    if (user && currentAccount) {
      loadSubscriptions();
      calculateOutstandingBalance();
      loadPaidSubscriptionsThisMonth();
    }
  }, [user, currentAccount]);

  const loadPaidSubscriptionsThisMonth = async () => {
    try {
      const startOfCurrentMonth = startOfMonth(new Date());
      const endOfCurrentMonth = endOfMonth(new Date());

      const { data: transactions } = await supabase
        .from('transactions')
        .select('description, date')
        .eq('user_id', currentAccount?.id)
        .eq('type', 'expense')
        .gte('date', format(startOfCurrentMonth, 'yyyy-MM-dd'))
        .lte('date', format(endOfCurrentMonth, 'yyyy-MM-dd'))
        .like('description', 'Pagamento - %');

      const paidSubscriptionNames = transactions?.map(t => 
        t.description.replace('Pagamento - ', '')
      ) || [];
      
      const paidIds = subscriptions
        .filter(sub => paidSubscriptionNames.includes(sub.name))
        .map(sub => sub.id);
      
      setPaidSubscriptionsThisMonth(paidIds);

      // Carregar datas dos últimos pagamentos
      await loadLastPaymentDates();
    } catch (error) {
      console.error('Erro ao carregar pagamentos do mês:', error);
    }
  };

  const loadLastPaymentDates = async () => {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('description, date')
        .eq('user_id', currentAccount?.id)
        .eq('type', 'expense')
        .like('description', 'Pagamento - %')
        .order('date', { ascending: false });

      const paymentDates: Record<string, string> = {};
      
      subscriptions.forEach(subscription => {
        const lastPaymentTransaction = transactions?.find(t => 
          t.description === `Pagamento - ${subscription.name}`
        );
        
        if (lastPaymentTransaction) {
          paymentDates[subscription.id] = lastPaymentTransaction.date;
        }
      });

      setLastPaymentDates(paymentDates);
    } catch (error) {
      console.error('Erro ao carregar datas dos últimos pagamentos:', error);
    }
  };

  const calculateOutstandingBalance = async () => {
    const today = new Date();
    let totalOutstanding = 0;

    for (const subscription of subscriptions) {
      if (isSubscriptionOverdue(subscription)) {
        totalOutstanding += subscription.amount;
      }
    }

    setOutstandingBalance(totalOutstanding);
  };

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', currentAccount?.id)
        .order('renewal_day');
      
      if (error) throw error;
      
      // Mapear os dados e garantir que frequency sempre tenha um valor válido
      const mappedSubscriptions = (data || []).map(subscription => ({
        ...subscription,
        frequency: (subscription.frequency as 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually') || 'monthly'
      }));
      
      setSubscriptions(mappedSubscriptions);
    } catch (error) {
      console.error('Erro ao carregar assinaturas:', error);
    }
  };

  const handleAddSubscription = async () => {
    if (!newSubscription.name || !newSubscription.amount || !newSubscription.renewal_date || !newSubscription.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos incluindo a data",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(newSubscription.amount.replace(',', '.'));
    if (isNaN(amount)) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor numérico válido",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🚀 INSERINDO ASSINATURA COM FREQUÊNCIA:', newSubscription.frequency);
      console.log('📅 DATA DA ÚLTIMA COBRANÇA:', newSubscription.renewal_date!.toISOString());
      
      // A data selecionada é a data da ÚLTIMA cobrança (já paga)
      // O renewal_day é extraído da data selecionada para cálculos futuros
      const { error } = await supabase.from('subscriptions').insert({
        user_id: currentAccount?.id,
        name: newSubscription.name,
        amount,
        renewal_day: newSubscription.renewal_date!.getDate(),
        category: newSubscription.category,
        logo_type: newSubscription.logo_type || '📱',
        frequency: newSubscription.frequency,
        // Definir last_charged com a data selecionada pelo usuário (última cobrança já paga)
        last_charged: newSubscription.renewal_date!.toISOString(),
      });

      if (error) throw error;

      // Não enviar notificação push na criação - apenas na data de renovação

      toast({
        title: "Assinatura adicionada!",
        description: "Você receberá notificação na renovação",
      });

      setNewSubscription({ name: '', amount: '', renewal_day: '', category: '', logo_type: '', frequency: 'monthly', renewal_date: undefined });
      setIconSearch('');
      setIsOpen(false);
      loadSubscriptions();
      calculateOutstandingBalance();
      loadPaidSubscriptionsThisMonth();
      // Invalida queries para atualizar UI em tempo real
      queryClient.invalidateQueries({ queryKey: ['transactions', currentAccount?.id] });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar assinatura",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditSubscription = async () => {
    if (!editingSubscription) return;

    try {
      console.log('🔄 EDITANDO ASSINATURA COM FREQUÊNCIA:', editingSubscription.frequency);
      const { error } = await supabase
        .from('subscriptions')
        .update({
          name: editingSubscription.name,
          amount: editingSubscription.amount,
          renewal_day: editingSubscription.renewal_day,
          category: editingSubscription.category,
          logo_type: editingSubscription.logo_type || '📱',
          frequency: editingSubscription.frequency || 'monthly',
          last_charged: editingSubscription.last_charged,
        })
        .eq('id', editingSubscription.id);

      if (error) throw error;

      toast({
        title: "Assinatura atualizada",
        description: "As informações foram atualizadas com sucesso",
      });

      setEditingSubscription(null);
      loadSubscriptions();
      calculateOutstandingBalance();
      loadPaidSubscriptionsThisMonth();
      queryClient.invalidateQueries({ queryKey: ['transactions', currentAccount?.id] });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar assinatura",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: "Assinatura removida",
        description: "A assinatura foi cancelada com sucesso",
      });

      loadSubscriptions();
      calculateOutstandingBalance();
      loadPaidSubscriptionsThisMonth();
      // Invalida queries para atualizar UI em tempo real
      queryClient.invalidateQueries({ queryKey: ['transactions', currentAccount?.id] });
    } catch (error: any) {
      toast({
        title: "Erro ao remover assinatura",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePaySubscription = async (subscriptionId: string, paymentMonth?: Date) => {
    try {
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      if (!subscription) return;

      // Verificar se pode pagar baseado na frequência
      if (!canPaySubscription(subscription)) {
        const frequencyNames = {
          daily: 'diariamente',
          weekly: 'semanalmente',
          monthly: 'mensalmente',
          semiannually: 'semestralmente',
          annually: 'anualmente'
        };
        
        toast({
          title: "Pagamento não permitido",
          description: `Esta assinatura só pode ser paga ${frequencyNames[subscription.frequency]}. Aguarde o período correto.`,
          variant: "destructive",
        });
        return;
      }

      // Buscar perfil atual do usuário para verificar saldo
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_balance')
        .eq('user_id', currentAccount?.id)
        .single();

      if (!profile || profile.current_balance < subscription.amount) {
        toast({
          title: "Saldo insuficiente",
          description: "Você não tem saldo suficiente para pagar esta assinatura",
          variant: "destructive",
        });
        return;
      }

      // Buscar categoria de despesa padrão ou criar uma
      const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('name', 'Assinaturas')
        .eq('type', 'expense')
        .limit(1);

      let categoryId = categories?.[0]?.id;
      
      if (!categoryId) {
        const { data: newCategory } = await supabase
          .from('categories')
          .insert({
            name: 'Assinaturas',
            type: 'expense',
            icon: '📱',
            color: '#9333ea',
            user_id: currentAccount?.id
          })
          .select()
          .single();
        
        categoryId = newCategory?.id;
      }

      const brazilTimeZone = 'America/Sao_Paulo';
      const currentDateTime = toZonedTime(new Date(), brazilTimeZone);
      const paymentDate = paymentMonth ? format(paymentMonth, 'yyyy-MM-dd') : format(currentDateTime, 'yyyy-MM-dd');

      // Adicionar transação de despesa (irá automaticamente reduzir o saldo atual)
      addTransaction({
        amount: subscription.amount,
        description: `Pagamento - ${subscription.name}`,
        category_id: categoryId,
        type: 'expense',
        date: paymentDate,
        notes: `Pagamento de assinatura ${subscription.name} - ${format(paymentMonth || new Date(), 'MMMM/yyyy', { locale: ptBR })}`
      });

      // Calcular a data da próxima cobrança ATUAL (antes do pagamento)
      const currentNextRenewal = getNextRenewalDate(subscription.renewal_day, subscription.frequency, subscription.last_charged);
      
      console.log('🔄 INDIVIDUAL PAYMENT LOGIC:', {
        subscriptionName: subscription.name,
        frequency: subscription.frequency,
        renewalDay: subscription.renewal_day,
        currentLastCharged: subscription.last_charged,
        currentNextRenewal: currentNextRenewal.toISOString(),
        paymentDate: paymentDate
      });
      
      // Atualizar last_charged da assinatura usando a data da próxima cobrança atual
      await supabase
        .from('subscriptions')
        .update({ last_charged: currentNextRenewal.toISOString() })
        .eq('id', subscriptionId);
        
      console.log('✅ Individual payment - Updated last_charged to:', currentNextRenewal.toISOString());

      toast({
        title: "Pagamento registrado",
        description: `Pagamento de ${subscription.name} foi registrado como despesa e deduzido do saldo atual`,
      });

      // Forçar atualização imediata e agressiva do saldo atual
      await triggerMultiLayerUpdate('subscription-payment');
      
      // Atualização adicional específica para garantir que o saldo apareça na UI
      setTimeout(async () => {
        // Invalidar qualquer cache do saldo atual
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['balance'] });
        
        // Forçar recalculo dos componentes que mostram saldo
        window.dispatchEvent(new CustomEvent('balance-updated'));
        
        // Força uma nova busca dos dados do perfil
        await triggerMultiLayerUpdate('subscription-payment-secondary');
      }, 300);
      
      loadSubscriptions();
      calculateOutstandingBalance();
      loadPaidSubscriptionsThisMonth();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar pagamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePayAllSubscriptions = async () => {
    try {
      const subscriptionsToPay = subscriptions.filter(s => 
        paymentModal.selectedSubscriptions.includes(s.id)
      );

      let successCount = 0;
      let duplicateCount = 0;
      let insufficientBalance = false;

      for (const subscription of subscriptionsToPay) {
        // Verificar se pode pagar baseado na frequência
        if (!canPaySubscription(subscription)) {
          duplicateCount++;
          console.log(`Assinatura ${subscription.name} não pode ser paga ainda baseado na frequência ${subscription.frequency}`);
          continue;
        }

        // Verificar saldo antes de tentar pagar
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_balance')
          .eq('user_id', currentAccount?.id)
          .single();

        if (!profile || profile.current_balance < subscription.amount) {
          insufficientBalance = true;
          break;
        }

        try {
          // Criar a lógica interna de pagamento sem duplicar verificações
          // Buscar categoria de despesa padrão ou criar uma
          const { data: categories } = await supabase
            .from('categories')
            .select('*')
            .eq('name', 'Assinaturas')
            .eq('type', 'expense')
            .limit(1);

          let categoryId = categories?.[0]?.id;
          
          if (!categoryId) {
            const { data: newCategory } = await supabase
              .from('categories')
              .insert({
                name: 'Assinaturas',
                type: 'expense',
                icon: '📱',
                color: '#9333ea',
                user_id: currentAccount?.id
              })
              .select()
              .single();
            
            categoryId = newCategory?.id;
          }

          const paymentDate = format(paymentModal.paymentMonth, 'yyyy-MM-dd');

          // Adicionar transação de despesa
          addTransaction({
            amount: subscription.amount,
            description: `Pagamento - ${subscription.name}`,
            category_id: categoryId,
            type: 'expense',
            date: paymentDate,
            notes: `Pagamento de assinatura ${subscription.name} - ${format(paymentModal.paymentMonth, 'MMMM/yyyy', { locale: ptBR })}`
          });

          // Calcular a data da próxima cobrança ATUAL (antes do pagamento)
          const currentNextRenewal = getNextRenewalDate(subscription.renewal_day, subscription.frequency, subscription.last_charged);
          
          console.log('🔄 PAYMENT LOGIC:', {
            subscriptionName: subscription.name,
            frequency: subscription.frequency,
            renewalDay: subscription.renewal_day,
            currentLastCharged: subscription.last_charged,
            currentNextRenewal: currentNextRenewal.toISOString(),
            paymentDate: paymentDate
          });
          
          // O last_charged deve ser a data da próxima cobrança atual
          // Assim, a próxima cobrança será calculada corretamente baseada nessa data
          await supabase
            .from('subscriptions')
            .update({ last_charged: currentNextRenewal.toISOString() })
            .eq('id', subscription.id);
            
          console.log('✅ Updated last_charged to:', currentNextRenewal.toISOString());

          successCount++;
        } catch (error) {
          console.error(`Erro ao pagar ${subscription.name}:`, error);
        }
      }

      // Atualizar dados após todos os pagamentos
      if (successCount > 0) {
        await triggerMultiLayerUpdate('bulk-subscription-payment');
        loadSubscriptions();
        calculateOutstandingBalance();
        loadPaidSubscriptionsThisMonth();
      }

      setPaymentModal({
        isOpen: false,
        selectedSubscriptions: [],
        paymentMonth: new Date(),
        selectedFrequency: undefined,
        showFrequencySelection: false
      });

      if (insufficientBalance) {
        toast({
          title: "Saldo insuficiente",
          description: `Você não tem saldo suficiente para pagar algumas assinaturas. ${successCount} foram pagas.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Pagamentos processados",
          description: duplicateCount > 0 
            ? `${successCount} assinatura(s) foram pagas. ${duplicateCount} já estavam pagas neste mês.`
            : `${successCount} assinatura(s) foram pagas`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao processar pagamentos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openPayAllModal = () => {
    setPaymentModal({
      isOpen: true,
      selectedSubscriptions: [],
      paymentMonth: new Date(),
      selectedFrequency: undefined,
      showFrequencySelection: true
    });
  };

  const handleFrequencySelection = (frequency: 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually') => {
    const subscriptionsForFrequency = subscriptions.filter(sub => 
      sub.frequency === frequency && isSubscriptionOverdue(sub)
    );
    setPaymentModal(prev => ({
      ...prev,
      selectedFrequency: frequency,
      selectedSubscriptions: subscriptionsForFrequency.map(s => s.id),
      showFrequencySelection: false
    }));
  };

  const canPaySubscription = (subscription: Subscription) => {
    const today = toZonedTime(new Date(), 'America/Sao_Paulo');
    
    // Se nunca foi cobrada, pode pagar
    if (!subscription.last_charged) {
      return true;
    }
    
    const lastChargedDate = new Date(subscription.last_charged);
    
    // Verificar baseado na frequência
    switch (subscription.frequency) {
      case 'daily':
        // Pode pagar se passou pelo menos 1 dia desde o último pagamento
        const oneDayLater = new Date(lastChargedDate);
        oneDayLater.setDate(oneDayLater.getDate() + 1);
        return today >= oneDayLater;
        
      case 'weekly':
        // Pode pagar se passaram pelo menos 7 dias desde o último pagamento
        const oneWeekLater = new Date(lastChargedDate);
        oneWeekLater.setDate(oneWeekLater.getDate() + 7);
        return today >= oneWeekLater;
        
      case 'monthly':
        // Pode pagar se passou pelo menos 1 mês desde o último pagamento
        const oneMonthLater = new Date(lastChargedDate);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        return today >= oneMonthLater;
        
      case 'semiannually':
        // Pode pagar se passaram pelo menos 6 meses desde o último pagamento
        const sixMonthsLater = new Date(lastChargedDate);
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
        return today >= sixMonthsLater;
        
      case 'annually':
        // Pode pagar se passou pelo menos 1 ano desde o último pagamento
        const oneYearLater = new Date(lastChargedDate);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        return today >= oneYearLater;
        
      default:
        return true;
    }
  };

  const isSubscriptionOverdue = (subscription: Subscription) => {
    const today = toZonedTime(new Date(), 'America/Sao_Paulo');
    const isPaidThisMonth = paidSubscriptionsThisMonth.includes(subscription.id);
    
    // Se já foi paga este mês, não está atrasada
    if (isPaidThisMonth) return false;
    
    // Calcular a próxima data de renovação baseada na data da última cobrança e frequência
    const nextRenewalDate = getNextRenewalDate(subscription.renewal_day, subscription.frequency, subscription.last_charged);
    
    // A assinatura está em atraso apenas APÓS a data de renovação passar (não no dia da renovação)
    const nextRenewalEndOfDay = new Date(nextRenewalDate);
    nextRenewalEndOfDay.setHours(23, 59, 59, 999);
    
    return isAfter(today, nextRenewalEndOfDay);
  };

  const getCategoryInfo = (category: string) => {
    return subscriptionCategories.find(cat => cat.value === category) || subscriptionCategories[subscriptionCategories.length - 1];
  };

  const getNextRenewalDate = (renewal_day: number, frequency: 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually' = 'monthly', lastPaymentDate?: string) => {
    const today = toZonedTime(new Date(), 'America/Sao_Paulo');
    
    console.log('🗓️ CALCULATING NEXT RENEWAL DATE:', { renewal_day, frequency, lastPaymentDate, today: today.toISOString() });
    
    // Se há uma data de última cobrança, SEMPRE usar ela como base para o cálculo
    // Isso significa que a última cobrança já foi paga e precisamos calcular a próxima
    if (lastPaymentDate) {
      const baseDate = new Date(lastPaymentDate);
      console.log('📅 Using last CHARGED date as base (already paid):', baseDate.toISOString());
      
      let nextDate = new Date(baseDate);
      
      if (frequency === 'daily') {
        nextDate.setDate(baseDate.getDate() + 1);
        console.log('📅 DAILY: Next renewal 1 day after last charge:', nextDate.toISOString());
      } else if (frequency === 'weekly') {
        nextDate.setDate(baseDate.getDate() + 7);
        console.log('📅 WEEKLY: Next renewal 7 days after last charge:', nextDate.toISOString());
      } else if (frequency === 'monthly') {
        nextDate.setMonth(baseDate.getMonth() + 1);
        nextDate.setDate(baseDate.getDate());
        console.log('📅 MONTHLY: Next renewal 1 month after last charge:', nextDate.toISOString());
      } else if (frequency === 'semiannually') {
        nextDate.setMonth(baseDate.getMonth() + 6);
        nextDate.setDate(baseDate.getDate());
        console.log('📅 SEMIANNUALLY: Next renewal 6 months after last charge:', nextDate.toISOString());
      } else if (frequency === 'annually') {
        nextDate.setFullYear(baseDate.getFullYear() + 1);
        nextDate.setMonth(baseDate.getMonth());
        nextDate.setDate(baseDate.getDate());
        console.log('📅 ANNUALLY: Next renewal 1 year after last charge:', nextDate.toISOString());
      }
      
      return nextDate;
    }
    
    // Para assinaturas sem data de última cobrança, calcular baseado no renewal_day
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let nextDate: Date;

    if (frequency === 'monthly') {
      // Se o dia de renovação já passou este mês, usar o próximo mês
      if (currentDay > renewal_day) {
        const nextMonth = currentMonth + 1;
        if (nextMonth > 11) {
          nextDate = new Date(currentYear + 1, 0, renewal_day);
        } else {
          nextDate = new Date(currentYear, nextMonth, renewal_day);
        }
      } else {
        // Se o dia de renovação ainda não chegou este mês, usar este mês
        nextDate = new Date(currentYear, currentMonth, renewal_day);
      }
      console.log('📅 FALLBACK MONTHLY: Next renewal calculated for day', renewal_day, ':', nextDate.toISOString());
    } else if (frequency === 'daily') {
      nextDate = new Date(today);
      nextDate.setDate(today.getDate() + 1);
      console.log('📅 FALLBACK DAILY: Next renewal tomorrow:', nextDate.toISOString());
    } else if (frequency === 'weekly') {
      nextDate = new Date(today);
      nextDate.setDate(today.getDate() + 7);
      console.log('📅 FALLBACK WEEKLY: Next renewal in 7 days:', nextDate.toISOString());
    } else if (frequency === 'semiannually') {
      // Se o dia de renovação já passou este mês, usar 6 meses a partir de agora
      if (currentDay >= renewal_day) {
        const nextMonth = currentMonth + 6;
        const targetYear = nextMonth > 11 ? currentYear + 1 : currentYear;
        const targetMonth = nextMonth > 11 ? nextMonth - 12 : nextMonth;
        nextDate = new Date(targetYear, targetMonth, renewal_day);
      } else {
        // Se o dia ainda não chegou, usar este mês + 6 meses
        const nextMonth = currentMonth + 6;
        const targetYear = nextMonth > 11 ? currentYear + 1 : currentYear;
        const targetMonth = nextMonth > 11 ? nextMonth - 12 : nextMonth;
        nextDate = new Date(targetYear, targetMonth, renewal_day);
      }
      console.log('📅 FALLBACK SEMIANNUALLY: Next renewal calculated:', nextDate.toISOString());
    } else if (frequency === 'annually') {
      // Se o dia de renovação já passou este mês, usar o próximo ano
      if (currentDay >= renewal_day) {
        nextDate = new Date(currentYear + 1, currentMonth, renewal_day);
      } else {
        // Se o dia ainda não chegou, usar este ano
        nextDate = new Date(currentYear, currentMonth, renewal_day);
      }
      console.log('📅 FALLBACK ANNUALLY: Next renewal calculated:', nextDate.toISOString());
    } else {
      // Default para monthly
      nextDate = new Date(currentYear, currentMonth, renewal_day);
    }

    return nextDate;
  };

  const getCurrentMonthRenewalDate = (renewal_day: number) => {
    const today = toZonedTime(new Date(), 'America/Sao_Paulo');
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    return new Date(currentYear, currentMonth, renewal_day);
  };

  const filteredSubscriptions = subscriptions.filter(subscription =>
    subscription.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Listener para eventos customizados de abertura de modal
  useEffect(() => {
    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener('open-subscriptions-modal', handleOpenModal);
    return () => window.removeEventListener('open-subscriptions-modal', handleOpenModal);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-col h-16 sm:h-20 space-y-1 sm:space-y-2 bg-gradient-to-br from-brand-purple/5 to-purple-600/15 border-brand-purple/20 hover:border-brand-purple/40 hover:bg-gradient-to-br hover:from-brand-purple/10 hover:to-purple-600/20 hover:shadow-glow transition-all duration-300 transform hover:scale-105 group">
          <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-brand-purple group-hover:scale-110 transition-transform duration-300" />
          <span className="text-xs sm:text-sm text-center text-brand-purple font-medium">Assinaturas</span>
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
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            
            <div className="text-center">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-brand-purple to-purple-600 bg-clip-text text-transparent">
                Gerenciar Assinaturas
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Organize e controle todas suas assinaturas em um só lugar
              </p>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 p-4 sm:p-6">
          {/* Formulário elegante para adicionar nova assinatura */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl border border-border/50 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-purple-500/3 to-brand-purple/5"></div>
            <div className="relative z-10 p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-purple/10 to-brand-purple/20 border border-brand-purple/30 flex items-center justify-center">
                  <Plus className="h-7 w-7 text-brand-purple" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-brand-purple via-purple-600 to-brand-purple bg-clip-text text-transparent">
                    Adicionar Nova Assinatura
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Cadastre uma nova assinatura para controle automático
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                      Nome da Assinatura <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={newSubscription.name}
                      onChange={(e) => setNewSubscription(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Netflix Premium, Spotify, Disney+"
                      className="h-12 border-2 bg-white/80 backdrop-blur-sm focus:shadow-brand-purple transition-all duration-300 focus:border-brand-purple hover:border-purple-600/50"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                      Valor Mensal (R$) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        value={newSubscription.amount}
                        onChange={(e) => setNewSubscription(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="29,90"
                        className="h-12 pl-8 border-2 bg-white/80 backdrop-blur-sm focus:shadow-brand-purple transition-all duration-300 focus:border-brand-purple hover:border-purple-600/50"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                      Data da última cobrança <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={newSubscription.renewal_date ? newSubscription.renewal_date.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const dateString = e.target.value;
                        if (dateString) {
                          const [year, month, day] = dateString.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          setNewSubscription(prev => ({ ...prev, renewal_date: date, renewal_day: day.toString() }));
                        } else {
                          setNewSubscription(prev => ({ ...prev, renewal_date: undefined, renewal_day: '' }));
                        }
                      }}
                      className="h-12 border-2 bg-white/80 backdrop-blur-sm focus:shadow-brand-purple transition-all duration-300 focus:border-brand-purple hover:border-purple-600/50"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                      Frequência <span className="text-destructive">*</span>
                    </Label>
                    <Select value={newSubscription.frequency} onValueChange={(value) => setNewSubscription(prev => ({ ...prev, frequency: value as 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually' }))}>
                      <SelectTrigger className="h-12 border-2 bg-white/80 backdrop-blur-sm focus:shadow-brand-purple transition-all duration-300 focus:border-brand-purple hover:border-purple-600/50">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-md border-2 border-brand-purple/20">
                        <SelectItem value="daily" className="text-sm hover:bg-brand-purple/10">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🗓️</span>
                            <span>Diariamente</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="weekly" className="text-sm hover:bg-brand-purple/10">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📅</span>
                            <span>Semanalmente</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="monthly" className="text-sm hover:bg-brand-purple/10">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📆</span>
                            <span>Mensalmente</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="semiannually" className="text-sm hover:bg-brand-purple/10">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📋</span>
                            <span>Semestralmente</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="annually" className="text-sm hover:bg-brand-purple/10">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📊</span>
                            <span>Anualmente</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                      Categoria <span className="text-destructive">*</span>
                    </Label>
                    <Select value={newSubscription.category} onValueChange={(value) => setNewSubscription(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger className="h-12 border-2 bg-white/80 backdrop-blur-sm focus:shadow-brand-purple transition-all duration-300 focus:border-brand-purple hover:border-purple-600/50">
                        <SelectValue placeholder="Escolha uma categoria" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-md border-2 border-brand-purple/20">
                        {subscriptionCategories.map(category => (
                          <SelectItem key={category.value} value={category.value} className="text-sm hover:bg-brand-purple/10">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{category.icon}</span>
                              <span>{category.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success"></span>
                      Próxima cobrança
                    </Label>
                    <div className="h-12 border-2 bg-gradient-to-r from-success/5 to-emerald-500/5 border-success/30 rounded-lg flex items-center px-4">
                      <CalendarIcon className="h-4 w-4 text-success mr-2" />
                      <span className="text-sm font-medium text-success">
                        {newSubscription.renewal_date && newSubscription.frequency ? 
                          format(getNextRenewalDate(
                            parseInt(newSubscription.renewal_day) || new Date().getDate(), 
                            newSubscription.frequency, 
                            newSubscription.renewal_date.toISOString()
                          ), 'dd/MM/yyyy', { locale: ptBR }) 
                          : 'Selecione a data da última cobrança e frequência'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Seletor de Ícone moderno */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success"></span>
                    Escolha um Ícone
                  </Label>
                  
                  {/* Campo de busca elegante */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Input
                      placeholder="Buscar ícone (streaming, música, app, netflix...)"
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      className="pl-12 h-12 border-2 bg-white/80 backdrop-blur-sm transition-all duration-300"
                    />
                  </div>
                  
                   {/* Grid de ícones premium */}
                   <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border-2 border-muted/30 p-4 sm:p-6">
                     <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-transparent to-purple-500/5"></div>
                     <div className="relative z-10">
                       <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 gap-2 sm:gap-3 max-h-64 overflow-y-auto custom-scrollbar">
                         {ICON_OPTIONS.filter(icon => {
                           if (iconSearch === '') return true;
                           const keywords = ICON_KEYWORDS[icon] || [];
                           const searchTerm = iconSearch.toLowerCase().trim();
                           return keywords.some(keyword => keyword.toLowerCase().includes(searchTerm));
                         }).map((icon, index) => (
                           <button
                             key={`${icon}-${index}`}
                             type="button"
                             onClick={() => setNewSubscription(prev => ({ ...prev, logo_type: icon }))}
                             className={cn(
                               "aspect-square min-h-[40px] min-w-[40px] h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-base sm:text-xl transition-all duration-300 border-2 flex-shrink-0",
                               "transform hover:scale-110 active:scale-95 shadow-md hover:shadow-xl",
                               newSubscription.logo_type === icon 
                                 ? 'bg-gradient-to-br from-brand-purple to-purple-600 border-brand-purple text-white shadow-glow scale-110' 
                                 : 'bg-white/90 border-border/30 hover:border-brand-purple/50 hover:bg-brand-purple/10'
                             )}
                             title={`Selecionar ${icon}`}
                           >
                             {icon}
                           </button>
                         ))}
                       </div>
                      
                      {ICON_OPTIONS.filter(icon => {
                        if (iconSearch === '') return true;
                        const keywords = ICON_KEYWORDS[icon] || [];
                        const searchTerm = iconSearch.toLowerCase().trim();
                        return keywords.some(keyword => keyword.toLowerCase().includes(searchTerm));
                      }).length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 mx-auto bg-muted/30 rounded-2xl flex items-center justify-center mb-4">
                            <Search className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                          <p className="text-muted-foreground font-medium">Nenhum ícone encontrado</p>
                          <p className="text-sm text-muted-foreground/70 mt-1">
                            Tente termos como "streaming", "música", "netflix", "spotify"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {newSubscription.logo_type && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-brand-purple/10 to-purple-500/10 border border-brand-purple/20">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center">
                        <span className="text-2xl">{newSubscription.logo_type}</span>
                      </div>
                      <div>
                        <p className="font-medium text-brand-purple">Ícone selecionado</p>
                        <p className="text-sm text-muted-foreground">Perfeito! Este será o ícone da sua assinatura</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleAddSubscription} 
                    className="flex-1 h-14 text-base font-semibold bg-gradient-to-r from-brand-purple via-purple-600 to-brand-purple hover:shadow-glow transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-white"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Adicionar Assinatura
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsOpen(false)}
                    className="flex-1 h-14 text-base font-semibold"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Lista elegante de assinaturas */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl border border-border/50 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-purple-500/3 to-brand-purple/5"></div>
            <div className="relative z-10 p-6 sm:p-8">
              {/* Header da lista */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-purple/10 to-purple-500/20 border border-brand-purple/30 flex items-center justify-center">
                    <Smartphone className="h-7 w-7 text-brand-purple" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-brand-purple via-purple-600 to-brand-purple bg-clip-text text-transparent">
                      Suas Assinaturas
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {subscriptions.length > 0 ? `${subscriptions.length} assinatura${subscriptions.length > 1 ? 's' : ''} cadastrada${subscriptions.length > 1 ? 's' : ''}` : 'Nenhuma assinatura cadastrada'}
                    </p>
                  </div>
                </div>
                
                {/* Ações da lista */}
                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                  {subscriptions.length > 0 && (
                    <div className="relative flex-1 lg:flex-initial min-w-[250px]">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Buscar assinatura..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-11 border-2 bg-white/80 backdrop-blur-sm"
                      />
                    </div>
                  )}
                  {subscriptions.length > 0 && (
                    <Button 
                      size="sm" 
                      onClick={openPayAllModal}
                      className="bg-gradient-to-r from-success via-emerald-600 to-success hover:shadow-glow h-11 px-4 font-medium"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pagar Todas
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Conteúdo da lista */}
              {subscriptions.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-muted/30 to-muted/10 rounded-3xl flex items-center justify-center mb-6">
                    <Smartphone className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground mb-2">Nenhuma assinatura cadastrada</p>
                  <p className="text-sm text-muted-foreground/70">
                    Adicione sua primeira assinatura para começar a organizar seus gastos mensais
                  </p>
                </div>
              ) : filteredSubscriptions.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-muted/30 to-muted/10 rounded-3xl flex items-center justify-center mb-6">
                    <Search className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground mb-2">Nenhuma assinatura encontrada</p>
                  <p className="text-sm text-muted-foreground/70">
                    Não encontramos resultados para "{searchTerm}"
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSubscriptions.map((subscription, index) => {
                    const categoryInfo = getCategoryInfo(subscription.category);
                    // Usar o last_charged da assinatura diretamente
                    const nextRenewal = getNextRenewalDate(subscription.renewal_day, subscription.frequency, subscription.last_charged);
                    const currentMonthRenewalDate = getCurrentMonthRenewalDate(subscription.renewal_day);
                    const today = new Date();
                    const isOverdue = isSubscriptionOverdue(subscription);
                    
                    return (
                      <div 
                        key={subscription.id} 
                        className={cn(
                          "group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1",
                          isOverdue 
                            ? "bg-gradient-to-r from-warning/10 via-orange-500/5 to-warning/10 border-warning/30 hover:border-warning/50" 
                            : "bg-gradient-to-r from-background via-background/95 to-background/90 border-border/30 hover:border-brand-purple/40"
                        )}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        <div className="relative z-10 p-6">
                          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                            {/* Ícone e info principal */}
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-gray-50 border-2 border-border/30 flex items-center justify-center text-2xl shadow-lg flex-shrink-0">
                                {subscription.logo_type || categoryInfo.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-lg font-bold text-foreground truncate mb-1">
                                  {subscription.name}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <span className="font-semibold text-brand-purple">
                                    R$ {subscription.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    /{subscription.frequency === 'daily' ? 'dia' : subscription.frequency === 'weekly' ? 'semana' : subscription.frequency === 'monthly' ? 'mês' : subscription.frequency === 'semiannually' ? 'semestre' : 'ano'}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {subscription.frequency === 'daily' ? 'Cobrança diária' : 
                                     subscription.frequency === 'weekly' ? 'Cobrança semanal' : 
                                     subscription.frequency === 'monthly' ? 'Cobrança mensal' : 
                                     subscription.frequency === 'semiannually' ? 'Cobrança semestral' : 
                                     'Cobrança anual'}
                                  </span>
                                </div>
                                <p className={cn(
                                  "text-sm font-medium flex items-center gap-1",
                                  isOverdue ? "text-warning" : "text-muted-foreground"
                                )}>
                                  <CalendarIcon className="h-4 w-4" />
                                  {isOverdue ? 'Vencida: ' : 'Próxima cobrança: '}
                                  {format(toZonedTime(nextRenewal, 'America/Sao_Paulo'), 'dd/MM/yyyy', { locale: ptBR })}
                                </p>
                                
                                 {/* Informações adicionais */}
                                 <div className="flex flex-wrap gap-4 mt-3">
                                    {lastPaymentDates[subscription.id] && (
                                      <p className="text-xs text-success bg-success/10 px-2 py-1 rounded-lg border border-success/20">
                                        Último pagamento: {(() => {
                                          const paymentDate = lastPaymentDates[subscription.id];
                                          // Se a data contém 'T', é um ISO string com timezone, senão é yyyy-MM-dd
                                          if (paymentDate.includes('T')) {
                                            return format(new Date(paymentDate), 'dd/MM/yyyy', { locale: ptBR });
                                          } else {
                                            return format(toZonedTime(new Date(paymentDate + 'T12:00:00'), 'America/Sao_Paulo'), 'dd/MM/yyyy', { locale: ptBR });
                                          }
                                        })()}
                                      </p>
                                    )}
                                 </div>
                              </div>
                            </div>
                            
                            {/* Status e ações */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                               <Badge className={cn(
                                 "px-4 py-2 text-sm font-medium border-2 text-center flex items-center gap-1",
                                 isOverdue 
                                   ? "bg-orange-500 border-orange-500 text-white hover:bg-orange-500" 
                                   : "bg-white border-white text-success hover:bg-white hover:border-white"
                               )}>
                                 {isOverdue ? (
                                   <>
                                     <AlertTriangle className="h-4 w-4" />
                                     Em atraso
                                   </>
                                 ) : '✅ Ativa'}
                               </Badge>
                              
                                 <div className="flex gap-2">
                                   <Button
                                     size="sm"
                                     onClick={() => handlePaySubscription(subscription.id)}
                                     disabled={!canPaySubscription(subscription)}
                                     className="bg-gradient-to-r from-success via-emerald-600 to-success hover:shadow-glow transition-all duration-300 transform hover:scale-105 h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                   >
                                     <CreditCard className="h-4 w-4 mr-1" />
                                     <span>Pagar</span>
                                   </Button>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => handleDeleteSubscription(subscription.id)}
                                   className="border-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-300 h-10"
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cards de resumo elegantes */}
          {subscriptions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-purple/10 via-purple-500/5 to-brand-purple/15 border border-brand-purple/20 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-transparent to-transparent"></div>
                <div className="relative z-10 p-6 text-center">
                  <div className="w-12 h-12 mx-auto bg-gradient-to-br from-brand-purple to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Valor Médio Mensal das Assinaturas
                  </p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-brand-purple via-purple-600 to-brand-purple bg-clip-text text-transparent">
                    R$ {subscriptions.reduce((total, sub) => {
                      switch (sub.frequency) {
                        case 'daily': return total + (sub.amount * 30);
                        case 'weekly': return total + (sub.amount * 4);
                        case 'monthly': return total + sub.amount;
                        case 'semiannually': return total + (sub.amount / 6);
                        case 'annually': return total + (sub.amount / 12);
                        default: return total + sub.amount;
                      }
                    }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              {outstandingBalance > 0 && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-warning/10 via-orange-500/5 to-warning/15 border border-warning/20 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-transparent to-transparent"></div>
                  <div className="relative z-10 p-6 text-center">
                    <div className="w-12 h-12 mx-auto bg-gradient-to-br from-warning to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Saldo devedor
                    </p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-warning via-orange-600 to-warning bg-clip-text text-transparent">
                      R$ {outstandingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
            {/* Banner de Anúncios - apenas para contas gratuitas */}
            {!isPremium && (
              <div className="mt-8 rounded-2xl overflow-hidden border border-border/30">
                <AdBanner refreshInterval={45} />
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Modal de Pagamento de Todas as Assinaturas */}
      <Dialog open={paymentModal.isOpen} onOpenChange={(open) => setPaymentModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-auto bg-gradient-modal-bg backdrop-blur-xl border-0 shadow-modal animate-modal-in max-h-[95vh] overflow-y-auto">
          {/* Header elegante */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-success/10 via-emerald-500/5 to-success/15 border border-success/20 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-success/20 via-transparent to-transparent"></div>
            {/* Botão de fechar */}
            <button
              onClick={() => setPaymentModal(prev => ({ 
                ...prev, 
                isOpen: false, 
                showFrequencySelection: false,
                selectedFrequency: undefined,
                selectedSubscriptions: []
              }))}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
            <DialogHeader className="relative z-10 text-center space-y-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-br from-success to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg animate-glow-pulse">
                <CreditCard className="h-6 w-6 sm:h-10 sm:w-10 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-success via-emerald-600 to-success bg-clip-text text-transparent text-center">
                  {paymentModal.showFrequencySelection ? 'Selecionar Frequência' : paymentModal.selectedFrequency ? `Pagar Assinaturas ${
                    paymentModal.selectedFrequency === 'daily' ? 'Diárias' :
                    paymentModal.selectedFrequency === 'weekly' ? 'Semanais' :
                    paymentModal.selectedFrequency === 'monthly' ? 'Mensais' :
                    paymentModal.selectedFrequency === 'semiannually' ? 'Semestrais' :
                    paymentModal.selectedFrequency === 'annually' ? 'Anuais' : ''
                  }` : 'Pagar Assinaturas'}
                </DialogTitle>
                <p className="text-muted-foreground text-sm sm:text-base mt-2 text-center">
                  {paymentModal.showFrequencySelection 
                    ? 'Escolha a frequência das assinaturas que deseja pagar'
                    : 'Efetue o pagamento de múltiplas assinaturas de uma só vez'
                  }
                </p>
              </div>
            </DialogHeader>
          </div>
          
          <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
            {/* Seleção de frequência */}
            {paymentModal.showFrequencySelection && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl border border-border/50 shadow-lg p-4 sm:p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-transparent to-transparent"></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-purple/10 to-purple-500/20 border border-brand-purple/30 flex items-center justify-center">
                      <CalendarIcon className="h-6 w-6 text-brand-purple" />
                    </div>
                    <div className="text-center">
                      <Label className="text-lg font-bold text-foreground text-center">Selecionar Frequência</Label>
                      <p className="text-sm text-muted-foreground text-center">Escolha a frequência das assinaturas que deseja pagar</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { value: 'daily', label: 'Diariamente', icon: '📅' },
                      { value: 'weekly', label: 'Semanalmente', icon: '📋' },
                      { value: 'monthly', label: 'Mensalmente', icon: '🗓️' },
                      { value: 'semiannually', label: 'Semestralmente', icon: '📊' },
                      { value: 'annually', label: 'Anualmente', icon: '📈' }
                    ].map((freq) => {
                      const subscriptionsCount = subscriptions.filter(sub => 
                        sub.frequency === freq.value && isSubscriptionOverdue(sub)
                      ).length;
                      return (
                        <Button
                          key={freq.value}
                          variant="outline"
                          onClick={() => handleFrequencySelection(freq.value as any)}
                          disabled={subscriptionsCount === 0}
                          className="h-20 flex flex-col items-center justify-center gap-2 border-2 hover:border-brand-purple/50 hover:bg-brand-purple/5 transition-all duration-300"
                        >
                          <span className="text-2xl">{freq.icon}</span>
                          <div className="text-center">
                            <div className="font-medium">{freq.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {subscriptionsCount} assinatura{subscriptionsCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Resultado da seleção de frequência */}
            {!paymentModal.showFrequencySelection && paymentModal.selectedFrequency && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl border border-border/50 shadow-lg p-4 sm:p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-transparent to-transparent"></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success/10 to-emerald-500/20 border border-success/30 flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-success" />
                    </div>
                    <div className="text-center">
                      <Label className="text-lg font-bold text-foreground text-center">
                        Assinaturas {
                          paymentModal.selectedFrequency === 'daily' ? 'Diárias' :
                          paymentModal.selectedFrequency === 'weekly' ? 'Semanais' :
                          paymentModal.selectedFrequency === 'monthly' ? 'Mensais' :
                          paymentModal.selectedFrequency === 'semiannually' ? 'Semestrais' :
                          paymentModal.selectedFrequency === 'annually' ? 'Anuais' : ''
                        } Não Pagas
                      </Label>
                      <p className="text-sm text-muted-foreground text-center">
                        {paymentModal.selectedSubscriptions.length} assinatura{paymentModal.selectedSubscriptions.length !== 1 ? 's' : ''} pendente{paymentModal.selectedSubscriptions.length !== 1 ? 's' : ''} de pagamento
                      </p>
                    </div>
                  </div>
                  
                  {paymentModal.selectedSubscriptions.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-muted/30 to-muted/10 rounded-3xl flex items-center justify-center mb-4">
                        <Smartphone className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-lg font-medium">
                        Todas as assinaturas desta frequência já foram pagas!
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 max-h-64 sm:max-h-80 overflow-y-auto custom-scrollbar mb-6">
                        {subscriptions
                          .filter(s => paymentModal.selectedSubscriptions.includes(s.id))
                          .map((subscription, index) => {
                            const categoryInfo = getCategoryInfo(subscription.category);
                            return (
                              <div key={subscription.id} className="flex items-center gap-4 p-4 bg-background/50 rounded-xl border border-border/50 backdrop-blur-sm">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-purple/10 to-purple-500/20 border border-brand-purple/30 flex items-center justify-center">
                                  <span className="text-xl">{subscription.logo_type || categoryInfo.icon}</span>
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-foreground">{subscription.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    R$ {subscription.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{
                                      subscription.frequency === 'daily' ? 'dia' :
                                      subscription.frequency === 'weekly' ? 'semana' :
                                      subscription.frequency === 'monthly' ? 'mês' :
                                      subscription.frequency === 'semiannually' ? 'semestre' :
                                      subscription.frequency === 'annually' ? 'ano' : 'mês'
                                    }
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      
                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-purple/5 via-transparent to-brand-purple/10 border border-brand-purple/20 p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-foreground">Total do pagamento:</span>
                          <span className="text-2xl font-bold bg-gradient-to-r from-brand-purple via-purple-600 to-brand-purple bg-clip-text text-transparent">
                            R$ {subscriptions
                              .filter(s => paymentModal.selectedSubscriptions.includes(s.id))
                              .reduce((total, s) => total + s.amount, 0)
                              .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
             
             {/* Botões de ação */}
             {!paymentModal.showFrequencySelection && (
             <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
               <Button
                 variant="outline"
                 onClick={() => setPaymentModal(prev => ({ 
                   ...prev, 
                   isOpen: false, 
                   showFrequencySelection: false,
                   selectedFrequency: undefined,
                   selectedSubscriptions: []
                 }))}
                 className="flex-1 h-12 border-2 hover:bg-muted/50 transition-all duration-300"
               >
                 Cancelar
               </Button>
               {paymentModal.selectedFrequency && (
                 <Button
                   variant="outline"
                   onClick={() => setPaymentModal(prev => ({ 
                     ...prev, 
                     showFrequencySelection: true,
                     selectedFrequency: undefined,
                     selectedSubscriptions: []
                   }))}
                   className="flex-1 h-12 border-2 hover:bg-muted/50 transition-all duration-300"
                 >
                   ← Voltar
                 </Button>
               )}
               <Button
                 onClick={handlePayAllSubscriptions}
                 disabled={paymentModal.selectedSubscriptions.length === 0}
                 className="flex-1 h-12 bg-gradient-to-r from-success via-emerald-600 to-success hover:shadow-glow transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <CreditCard className="h-5 w-5 mr-2" />
                 Pagar {paymentModal.selectedSubscriptions.length} Assinatura{paymentModal.selectedSubscriptions.length !== 1 ? 's' : ''}
               </Button>
             </div>
             )}
           </div>
         </DialogContent>
      </Dialog>

      {/* Modal de Edição elegante */}
      <Dialog open={!!editingSubscription} onOpenChange={() => setEditingSubscription(null)}>
        <DialogContent className="max-w-2xl mx-auto bg-gradient-modal-bg backdrop-blur-xl border-0 shadow-modal animate-modal-in">
          {/* Header elegante */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-purple/10 via-purple-500/5 to-brand-purple/15 border border-brand-purple/20 p-6 mb-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-purple/20 via-transparent to-transparent"></div>
            <DialogHeader className="relative z-10 text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-brand-purple to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-glow-pulse">
                <Edit className="h-10 w-10 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-brand-purple via-purple-600 to-brand-purple bg-clip-text text-transparent">
                  Editar Assinatura
                </DialogTitle>
                <p className="text-muted-foreground text-sm sm:text-base mt-2">
                  {editingSubscription?.name && `Edite as informações de ${editingSubscription.name}`}
                </p>
              </div>
            </DialogHeader>
          </div>
          
          {editingSubscription && (
            <div className="space-y-8 p-6">
              {/* Formulário de edição */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl border border-border/50 shadow-lg p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-transparent to-transparent"></div>
                <div className="relative z-10 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                        Nome da Assinatura <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={editingSubscription.name}
                        onChange={(e) => setEditingSubscription(prev => prev ? { ...prev, name: e.target.value } : null)}
                        placeholder="Ex: Netflix Premium, Spotify"
                        className="h-12 border-2 bg-white/80 backdrop-blur-sm focus:shadow-glow transition-all duration-300"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                        Valor Mensal (R$) <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={editingSubscription.amount}
                          onChange={(e) => setEditingSubscription(prev => prev ? { ...prev, amount: parseFloat(e.target.value) } : null)}
                          className="h-12 pl-8 border-2 bg-white/80 backdrop-blur-sm focus:shadow-glow transition-all duration-300"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                        Data da última cobrança <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={
                          editingSubscription.last_charged 
                            ? new Date(editingSubscription.last_charged).toISOString().split('T')[0]
                            : editingSubscription.renewal_day 
                              ? (() => {
                                  const today = new Date();
                                  const year = today.getFullYear();
                                  const month = today.getMonth();
                                  const date = new Date(year, month, editingSubscription.renewal_day);
                                  return date.toISOString().split('T')[0];
                                })()
                              : ''
                        }
                        onChange={(e) => {
                          const dateString = e.target.value;
                          if (dateString) {
                            const selectedDate = new Date(dateString);
                            setEditingSubscription(prev => prev ? { 
                              ...prev, 
                              renewal_day: selectedDate.getDate(),
                              last_charged: selectedDate.toISOString()
                            } : null);
                          }
                        }}
                        
                        className="h-12 border-2 bg-white/80 backdrop-blur-sm focus:shadow-glow transition-all duration-300"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                        Frequência <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        value={editingSubscription.frequency || 'monthly'} 
                        onValueChange={(value) => setEditingSubscription(prev => prev ? { ...prev, frequency: value as 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually' } : null)}
                      >
                        <SelectTrigger className="h-12 border-2 bg-white/80 backdrop-blur-sm focus:shadow-glow transition-all duration-300">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-md border-2">
                          <SelectItem value="daily" className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🗓️</span>
                              <span>Diariamente</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="weekly" className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📅</span>
                              <span>Semanalmente</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="monthly" className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📆</span>
                              <span>Mensalmente</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="semiannually" className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📋</span>
                              <span>Semestralmente</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="annually" className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📊</span>
                              <span>Anualmente</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
                        Categoria <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        value={editingSubscription.category} 
                        onValueChange={(value) => setEditingSubscription(prev => prev ? { ...prev, category: value } : null)}
                      >
                        <SelectTrigger className="h-12 border-2 bg-white/80 backdrop-blur-sm focus:shadow-glow transition-all duration-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-md border-2">
                          {subscriptionCategories.map(category => (
                            <SelectItem key={category.value} value={category.value} className="text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{category.icon}</span>
                                <span>{category.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-success"></span>
                        Próxima cobrança
                      </Label>
                      <div className="h-12 border-2 bg-gradient-to-r from-success/5 to-emerald-500/5 border-success/30 rounded-lg flex items-center px-4">
                        <CalendarIcon className="h-4 w-4 text-success mr-2" />
                        <span className="text-sm font-medium text-success">
                          {editingSubscription.last_charged && editingSubscription.frequency ? 
                            format(getNextRenewalDate(
                              editingSubscription.renewal_day, 
                              editingSubscription.frequency, 
                              editingSubscription.last_charged
                            ), 'dd/MM/yyyy', { locale: ptBR }) 
                            : 'Selecione a data da última cobrança e frequência'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Prévia da assinatura */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-muted/30 to-muted/10 border border-muted/30">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-border/30 flex items-center justify-center text-2xl">
                        {editingSubscription.logo_type || getCategoryInfo(editingSubscription.category).icon}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-foreground">{editingSubscription.name || 'Nome da assinatura'}</h4>
                                         <p className="text-sm text-muted-foreground">
                           R$ {editingSubscription.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} • 
                           {editingSubscription.frequency === 'daily' ? 'Diariamente' : editingSubscription.frequency === 'weekly' ? 'Semanalmente' : editingSubscription.frequency === 'monthly' ? 'Mensalmente' : editingSubscription.frequency === 'semiannually' ? 'Semestralmente' : 'Anualmente'} • 
                           Renova dia {editingSubscription.renewal_day}
                         </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Botões de ação */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingSubscription(null)}
                  className="flex-1 h-12 border-2 hover:bg-muted/50 transition-all duration-300"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleEditSubscription}
                  className="flex-1 h-12 bg-gradient-to-r from-brand-purple via-purple-600 to-brand-purple hover:shadow-glow transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};