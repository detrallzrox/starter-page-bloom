import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { useAccountContext } from "@/hooks/useAccountContext";
import { supabase } from "@/integrations/supabase/client";
import { soundEffects } from "@/utils/soundEffects";
import { addMonths, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";
import { useFeatureUsageLimits } from "@/hooks/useFeatureUsageLimits";
import { usePermissions } from "@/hooks/usePermissions";
import { PremiumOverlay } from "./PremiumOverlay";

// Helper function to convert Base64 to Blob
const base64ToBlob = (base64: string, contentType: string = 'audio/webm'): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
};

interface VoiceRecognitionProps {
  onTransactionAdd: (transaction: {
    amount: number;
    description: string;
    category_id: string;
    type: 'expense' | 'income';
  }) => void;
}

export const VoiceRecognition = ({ onTransactionAdd }: VoiceRecognitionProps) => {
  const { isPremium } = useCurrentAccountPremium();
  const { canUse, incrementUsage, getRemainingUsage } = useFeatureUsageLimits();
  const { permissions, requestPermission } = usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { categories } = useTransactions();
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();

  const isAndroid = typeof window !== 'undefined' && !!window.Android;

  const handleInvestmentAction = async (investment: any) => {
    try {
      const userId = currentAccount?.id;
      
      const investmentTypeMap: { [key: string]: string } = {
        'reserva de emergência': 'Reserva de Emergência',
        'renda fixa': 'Renda Fixa',
        'ações': 'Ações',
        'fundos': 'Fundos Imobiliários',
        'fundos imobiliários': 'Fundos Imobiliários',
        'fundo imobiliário': 'Fundos Imobiliários',
        'tesouro direto': 'Tesouro Direto',
        'poupança': 'Renda Fixa',
        'outros': 'Reserva de Emergência'
      };
      
      const normalizedType = investment.investment_type.toLowerCase().trim();
      const savingsCategories = categories.filter(cat => cat.type === 'savings');
      let investmentCategory: any = null;
      
      investmentCategory = savingsCategories.find(cat => 
        cat.name.toLowerCase() === normalizedType
      );
      
      if (!investmentCategory) {
        investmentCategory = savingsCategories.find(cat => 
          cat.name.toLowerCase().includes(normalizedType) || 
          normalizedType.includes(cat.name.toLowerCase())
        );
      }
      
      if (!investmentCategory) {
        const categoryName = investmentTypeMap[normalizedType];
        if (categoryName) {
          investmentCategory = savingsCategories.find(cat => 
            cat.name === categoryName
          );
        }
      }

      let error: any = null;
      
      if (!investmentCategory) {
        const fallbackCategory = categories.find(cat => cat.type === 'savings' && cat.name === 'Reserva de Emergência');
        
        if (!fallbackCategory) {
          throw new Error(`Nenhuma categoria de investimento encontrada.`);
        }
        
        const result = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            amount: investment.amount,
            description: investment.description,
            type: 'savings',
            category_id: fallbackCategory.id,
            date: new Date().toISOString().split('T')[0],
          });
        error = result.error;
      } else {
        const result = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            amount: investment.amount,
            description: investment.description,
            type: 'savings',
            category_id: investmentCategory.id,
            date: new Date().toISOString().split('T')[0],
          });
        error = result.error;
      }

      if (error) throw error;

      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Investimento adicionado por áudio',
          message: `${investment.description} - R$ ${investment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          type: 'transaction'
        });

      toast({
        title: "Investimento registrado!",
        description: `R$ ${investment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${investment.description}`,
      });
    } catch (error: any) {
      console.error('Error creating investment:', error);
      toast({
        title: "Erro ao registrar investimento",
        description: "Não foi possível registrar o investimento",
        variant: "destructive",
      });
    }
  };

  const handleReminderAction = async (reminder: any) => {
    try {
      const userId = currentAccount?.id || user?.id;
      
      const today = new Date();
      let nextDate = new Date(today);
      
      if (reminder.frequency === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (reminder.frequency === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (reminder.frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      let categoryId = null;
      let defaultCategory = categories.find(cat => cat.name === 'Educação');
      
      if (!defaultCategory) {
        defaultCategory = categories.find(cat => cat.name === 'Outros');
      }
      
      if (!defaultCategory && categories.length > 0) {
        defaultCategory = categories[0];
      }
      
      if (defaultCategory) {
        categoryId = defaultCategory.id;
      }

      if (!categoryId) {
        throw new Error('Nenhuma categoria encontrada para o lembrete');
      }

      const reminderData = {
        user_id: userId,
        reminder_name: reminder.reminder_name,
        comment: reminder.comment,
        frequency: reminder.frequency,
        reminder_day: reminder.reminder_day,
        reminder_time: reminder.reminder_time || '19:50:00',
        recurring_enabled: true,
        is_recurring: true,
        notification_date: today.toISOString().split('T')[0],
        next_notification_date: nextDate.toISOString().split('T')[0],
        category: categoryId
      };

      const { error } = await supabase
        .from('bill_reminders')
        .insert(reminderData);

      if (error) {
        throw error;
      }
      
      toast({
        title: "Lembrete criado!",
        description: `${reminder.reminder_name} - ${reminder.frequency === 'daily' ? 'Diário' : reminder.frequency === 'weekly' ? 'Semanal' : 'Mensal'}`,
      });

      window.dispatchEvent(new CustomEvent('reminder-created'));
    } catch (error: any) {
      console.error('Error creating reminder:', error);
      toast({
        title: "Erro ao criar lembrete",
        description: "Não foi possível criar o lembrete",
        variant: "destructive",
      });
    }
  };

  const handleSubscriptionAction = async (subscription: any) => {
    try {
      const userId = currentAccount?.id;

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          name: subscription.name,
          amount: subscription.amount,
          renewal_day: subscription.renewal_day,
          category: subscription.category,
          logo_type: subscription.logo_type,
          last_charged: null
        });

      if (error) throw error;

      toast({
        title: "Assinatura criada!",
        description: `${subscription.name} - R$ ${subscription.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (dia ${subscription.renewal_day})`,
      });
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      toast({
        title: "Erro ao criar assinatura",
        description: "Não foi possível criar a assinatura",
        variant: "destructive",
      });
    }
  };

  const handleBudgetAction = async (budget: any) => {
    try {
      const userId = currentAccount?.id;
      
      const today = new Date();
      let periodStart: Date;
      let periodEnd: Date;

      if (budget.period_type === 'monthly') {
        periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
        periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      } else if (budget.period_type === 'weekly') {
        const dayOfWeek = today.getDay();
        periodStart = new Date(today.setDate(today.getDate() - dayOfWeek));
        periodEnd = new Date(today.setDate(periodStart.getDate() + 6));
      } else {
        periodStart = today;
        periodEnd = today;
      }

      const { error } = await supabase
        .from('category_budgets')
        .insert({
          user_id: userId,
          category_id: budget.category_id,
          budget_amount: budget.budget_amount,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          period_type: budget.period_type,
          auto_renew: false
        });

      if (error) throw error;

      toast({
        title: "Orçamento criado!",
        description: `R$ ${budget.budget_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para a categoria selecionada`,
      });
    } catch (error: any) {
      console.error('Error creating budget:', error);
      toast({
        title: "Erro ao criar orçamento",
        description: "Não foi possível criar o orçamento",
        variant: "destructive",
      });
    }
  };

  const handleInstallmentPurchase = async (transaction: any, installmentData: { count: number; value: number }) => {
    try {
      const userId = currentAccount?.id;
      const totalInstallments = installmentData.count;
      const installmentAmount = installmentData.value;
      const totalAmount = transaction.amount;
      
      let firstPaymentDate: string;
      if (transaction.payment_day) {
        const now = toZonedTime(new Date(), 'America/Sao_Paulo');
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = transaction.payment_day.toString().padStart(2, '0');
        firstPaymentDate = `${year}-${month}-${day}`;
      } else {
        const now = toZonedTime(new Date(), 'America/Sao_Paulo');
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        firstPaymentDate = `${year}-${month}-${day}`;
      }
      
      const [year, month, day] = firstPaymentDate.split('-').map(Number);
      const firstDateLocal = new Date(year, month - 1, day);
      const lastPaymentDate = format(addMonths(firstDateLocal, totalInstallments - 1), 'yyyy-MM-dd');
      
      const installmentsToCreate = [];
      
      for (let i = 0; i < totalInstallments; i++) {
        installmentsToCreate.push({
          user_id: userId,
          purchase_name: transaction.description,
          total_amount: totalAmount,
          installment_amount: installmentAmount,
          total_installments: totalInstallments,
          current_installment: i + 1,
          first_payment_date: firstPaymentDate,
          last_payment_date: lastPaymentDate,
          category_id: transaction.category_id,
          is_paid: false
        });
      }

      const { error: installmentError } = await supabase
        .from('installments')
        .insert(installmentsToCreate);

      if (installmentError) throw installmentError;

      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Cartão de crédito adicionado por áudio',
          message: `${transaction.description} - ${totalInstallments}x de R$ ${installmentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          type: 'installment'
        });
      
      toast({
        title: "Cartão de crédito criado!",
        description: `${totalInstallments} parcelas de R$ ${installmentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} criadas`,
      });
    } catch (error: any) {
      console.error('Error creating installment purchase:', error);
      toast({
        title: "Erro ao criar cartão de crédito",
        description: "Não foi possível criar o cartão de crédito",
        variant: "destructive",
      });
    }
  };

  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          
          const { data, error } = await supabase.functions.invoke('smart-voice-processor', {
            body: {
              audio: base64Audio,
              categories: categories.map(cat => ({ 
                id: cat.id, 
                name: cat.name, 
                type: cat.type 
              }))
            }
          });

        setIsProcessing(false);

        if (error) {
          throw error;
        }

        if (!data || !data.action_type) {
          toast({
            title: "Nenhuma ação identificada",
            description: "Não foi possível extrair informações do áudio",
            variant: "destructive",
          });
          return;
        }

        const { action_type } = data;
        
        if (!isPremium) {
          await incrementUsage('voice');
        }

        if (action_type === 'transaction') {
          const { transaction } = data;
          
          if (!transaction.amount || !transaction.description || !transaction.category_id || !transaction.type) {
            toast({
              title: "Dados incompletos",
              description: "Não foi possível extrair todas as informações necessárias",
              variant: "destructive",
            });
            return;
          }

          if ((transaction.installments && transaction.installments.count > 1) || 
              transaction.payment_method === 'Cartão de Crédito') {
            await handleInstallmentPurchase(transaction, transaction.installments || { count: 1, value: transaction.amount });
          } else {
            onTransactionAdd({
              amount: transaction.amount,
              description: transaction.description,
              category_id: transaction.category_id,
              type: transaction.type
            });

            let description = `${transaction.type === 'income' ? 'Receita' : 'Despesa'}: R$ ${transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${transaction.description}`;
            
            if (transaction.family_source) {
              description += ` (da ${transaction.family_source})`;
            }

            toast({
              title: "Transação adicionada!",
              description,
            });
          }
        } else if (action_type === 'investment') {
          await handleInvestmentAction(data.investment);
        } else if (action_type === 'reminder') {
          await handleReminderAction(data.reminder);
        } else if (action_type === 'subscription') {
          await handleSubscriptionAction(data.subscription);
        } else if (action_type === 'budget') {
          await handleBudgetAction(data.budget);
        }
        } catch (processingError) {
          console.error('Error processing audio:', processingError);
          setIsProcessing(false);
          toast({
            title: "Erro no processamento",
            description: "Erro interno ao processar o áudio",
            variant: "destructive",
          });
        }
      };
    } catch (error) {
      console.error('Error reading audio file:', error);
      setIsProcessing(false);
      toast({
        title: "Erro",
        description: "Erro ao processar o áudio",
        variant: "destructive",
      });
    }
  }, [categories, currentAccount, isPremium, onTransactionAdd, toast, user, incrementUsage]);

  // This useEffect handles the callback from the native Android code
  useEffect(() => {
    if (isAndroid) {
      window.onAudioRecordingComplete = (base64Audio: string) => {
        console.log("🎤 Áudio recebido do Android (Base64).");
        if (base64Audio) {
          const audioBlob = base64ToBlob(base64Audio);
          processAudio(audioBlob);
        } else {
          console.error("Recebido áudio em Base64 vazio ou nulo do Android.");
          setIsProcessing(false);
          toast({
            title: "Erro na Gravação",
            description: "Não foi possível capturar o áudio. Tente novamente.",
            variant: "destructive",
          });
        }
      };
    }

    return () => {
      if (isAndroid) {
        window.onAudioRecordingComplete = undefined;
      }
    };
  }, [isAndroid, toast, processAudio]);

  const startRecording = async () => {
    try {
      soundEffects.microphone();

      if (isAndroid) {
        console.log("📱 Iniciando gravação de áudio nativa...");
        window.Android?.startAudioRecording();
        setIsRecording(true);
      } else {
        // Web implementation
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });

        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await processAudio(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      }

      // Common logic for both platforms
      timeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 30000);

      toast({
        title: "Gravação iniciada",
        description: "Mantenha pressionado para gravar... (máx. 30s)",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    soundEffects.success();
    setIsRecording(false);
    setIsProcessing(true);

    toast({
      title: "Processando áudio",
      description: "Analisando sua transação...",
    });

    if (isAndroid) {
      console.log("📱 Parando gravação de áudio nativa...");
      window.Android?.stopAudioRecording();
      // The rest of the logic is handled by the onAudioRecordingComplete callback
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
  }, [isAndroid]);

  const handlePressStart = async () => {
    if (isProcessing || isRecording) {
      return;
    }

    if (!isPremium && !canUse('voice')) {
      toast({
        title: "Limite atingido",
        description: "Você atingiu o limite de 3 usos gratuitos para a funcionalidade de voz. Faça upgrade para continuar!",
        variant: "destructive",
      });
      return;
    }

    const hasPermission = await requestPermission('microphone');
    if (!hasPermission) {
      toast({
        title: "Permissão do microfone negada",
        description: "Você precisa permitir o acesso ao microfone nas configurações do seu dispositivo.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isPremium) {
        await incrementUsage('voice');
    }
    startRecording();
  };

  const handlePressEnd = () => {
    if (isRecording) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      stopRecording();
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <PremiumOverlay isBlocked={!isPremium && !canUse('voice')} customIcon={Mic}>
      <Button
        variant="outline" 
        className="flex-col h-16 sm:h-20 space-y-1 sm:space-y-2 bg-gradient-to-br from-brand-purple/5 to-purple-600/15 border-brand-purple/20 hover:border-brand-purple/40 hover:bg-gradient-to-br hover:from-brand-purple/10 hover:to-purple-600/20 hover:shadow-glow transition-all duration-300 transform hover:scale-105 group select-none"
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        disabled={isProcessing || (!isPremium && !canUse('voice')) || permissions.microphone === 'denied'}
        style={{ userSelect: 'none', pointerEvents: isProcessing ? 'none' : 'auto' }}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-brand-purple" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4 sm:h-5 sm:w-5 text-destructive animate-pulse" />
        ) : (
          <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-brand-purple group-hover:scale-110 transition-transform duration-300 mt-1" />
        )}
        <div className="text-center">
          <span className="text-xs sm:text-sm text-brand-purple font-medium block">
            {isProcessing 
              ? "Processando..." 
              : isRecording 
              ? "Gravando..." 
              : permissions.microphone === 'denied' 
              ? "Microfone bloqueado"
              : "Gravar Áudio"}
          </span>
          {!isPremium && (
            <span className="text-[10px] text-muted-foreground">
              {getRemainingUsage('voice')} usos restantes • Premium
            </span>
          )}
        </div>
      </Button>
    </PremiumOverlay>
  );
};
