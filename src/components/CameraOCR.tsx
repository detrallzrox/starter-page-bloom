import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera as CameraIconUI, Loader2, X, Check, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { soundEffects } from '@/utils/soundEffects';
import { useQueryClient } from '@tanstack/react-query';
import { useAccountContext } from '@/hooks/useAccountContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrentAccountPremium } from '@/hooks/useCurrentAccountPremium';
import { useFeatureUsageLimits } from '@/hooks/useFeatureUsageLimits';

import { PremiumOverlay } from './PremiumOverlay';

interface ExtractedData {
  amount: string;
  description: string;
  fullText: string;
}

interface CameraOCRProps {
  onTransactionAdd: (transaction: {
    amount: number;
    description: string;
    category_id: string;
    type: 'expense' | 'income';
  }) => void;
}

export const CameraOCR = ({ onTransactionAdd }: CameraOCRProps) => {
  const { isPremium } = useCurrentAccountPremium();
  const { canUse, incrementUsage, getRemainingUsage } = useFeatureUsageLimits();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [editedAmount, setEditedAmount] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentAccount } = useAccountContext();
  const { categories } = useTransactions();
  const resetCapture = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setEditedAmount('');
    setEditedDescription('');
    setSelectedCategory('');
  };

  const compressImage = (imageDataUrl: string, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        const mimeType = canvas.toDataURL('image/webp').startsWith('data:image/webp') 
          ? 'image/webp' 
          : 'image/jpeg';
        
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        resolve(compressedDataUrl);
      };
      img.src = imageDataUrl;
    });
  };

  const processImage = useCallback(async (imageSource: string) => {
    if (!isPremium && !canUse('photo')) {
      toast({
        title: "Limite atingido",
        description: "Você atingiu o limite de 3 usos gratuitos. Faça upgrade para continuar!",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (!isPremium) {
        await incrementUsage('photo');
      }
      const compressedImage = await compressImage(imageSource);
      setCapturedImage(compressedImage);
      
      toast({
        title: "Processando imagem...",
        description: "Analisando dados da nota fiscal",
      });
      
      const { data, error } = await supabase.functions.invoke('process-receipt', {
        body: { 
          imageData: compressedImage,
          accountId: currentAccount?.id
        }
      });

      if (error) throw error;

      const transactionKey = `${data.transaction.amount}-${data.transaction.description.toLowerCase().trim()}-${Date.now()}`;
      const recentTransactions = JSON.parse(localStorage.getItem('recentPhotoTransactions') || '[]');
      
      const now = Date.now();
      const isDuplicate = recentTransactions.some((recent: any) => {
        const recentKey = `${recent.amount}-${recent.description.toLowerCase().trim()}`;
        const currentKey = `${data.transaction.amount}-${data.transaction.description.toLowerCase().trim()}`;
        return recentKey === currentKey && (now - recent.timestamp) < 30000;
      });
      
      if (isDuplicate) {
        toast({
          title: "Transação duplicada detectada",
          description: "Esta transação já foi processada recentemente",
          variant: "destructive",
        });
        resetCapture();
        setIsOpen(false);
        return;
      }
      
      const newTransaction = {
        amount: data.transaction.amount,
        description: data.transaction.description,
        timestamp: now,
        uniqueId: transactionKey
      };
      recentTransactions.push(newTransaction);
      
      const filteredTransactions = recentTransactions
        .filter((t: any) => (now - t.timestamp) < 300000)
        .slice(-5);
      
      localStorage.setItem('recentPhotoTransactions', JSON.stringify(filteredTransactions));
      
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['installments'] });

      setIsOpen(false);
      resetCapture();

      const isInstallmentPurchase = data.installments && data.installments.count > 1;
      
      toast({
        title: isInstallmentPurchase ? "Cartão de crédito criado!" : "Transação adicionada automaticamente!",
        description: isInstallmentPurchase 
          ? `Compra de R$ ${data.transaction.amount} em ${data.installments.count}x de R$ ${data.installments.value}`
          : `Despesa de R$ ${data.transaction.amount} registrada`,
      });
      
      soundEffects.success();
    } catch (error) {
      console.error('OCR/AI Error:', error);
      toast({
        title: "Processamento automático falhou",
        description: "Verifique e edite as informações manualmente",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast, queryClient, currentAccount, isPremium, canUse, incrementUsage]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    soundEffects.camera();
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageSource = e.target?.result as string;
      await processImage(imageSource);
    };
    reader.readAsDataURL(file);
  }, [processImage]);

  const handleOpenGallery = () => {
    fileInputRef.current?.click();
  };

  const handleSaveTransaction = () => {
    // Esta função agora é um fallback e pode ser removida se não for mais necessária
  };

  return (
    <PremiumOverlay isBlocked={!isPremium && !canUse('photo')} customIcon={CameraIconUI}>
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetCapture();
      }}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="flex-col h-16 sm:h-20 space-y-1 sm:space-y-2 bg-gradient-to-br from-brand-purple/5 to-purple-600/15 border-brand-purple/20 hover:border-brand-purple/40 hover:bg-gradient-to-br hover:from-brand-purple/10 hover:to-purple-600/20 hover:shadow-glow transition-all duration-300 transform hover:scale-105 group"
            disabled={!isPremium && !canUse('photo')}
          >
            <CameraIconUI className="h-4 w-4 sm:h-5 sm:w-5 text-brand-purple group-hover:scale-110 transition-transform duration-300 mt-1" />
            <div className="text-center">
              <span className="text-xs sm:text-sm text-brand-purple font-medium block">Foto</span>
              {!isPremium && (
                <span className="text-[10px] text-muted-foreground">
                  {getRemainingUsage('photo')} usos restantes • Premium
                </span>
              )}
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg mx-2 sm:mx-auto bg-gradient-to-br from-background via-background to-brand-purple/5 border border-brand-purple/20 shadow-2xl backdrop-blur-sm">
          <DialogHeader className="space-y-4 pb-6 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-brand-purple to-brand-purple/70 rounded-full flex items-center justify-center shadow-lg animate-fade-in">
              <CameraIconUI className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-brand-purple to-brand-purple/70 bg-clip-text text-transparent">
              Enviar Recibo
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-center max-w-sm mx-auto">
              Selecione uma imagem da sua galeria do Recibo / Nota fiscal para adicionar automaticamente
            </p>
          </DialogHeader>
          
          <div className="space-y-6">
            {!capturedImage ? (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button 
                  onClick={handleOpenGallery} 
                  disabled={isProcessing}
                  className="w-full h-12 bg-gradient-to-r from-brand-purple to-brand-purple/80 hover:from-brand-purple/90 hover:to-brand-purple/70 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <ImageIcon className="h-5 w-5 mr-2" />
                  )}
                  Escolher da Galeria
                </Button>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div className="relative overflow-hidden rounded-2xl border border-brand-purple/20 shadow-lg">
                  <img 
                    src={capturedImage} 
                    alt="Recibo capturado" 
                    className="w-full h-48 object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                
                {isProcessing && (
                  <div className="flex flex-col items-center justify-center space-y-4 p-8">
                    <Loader2 className="h-10 w-10 text-brand-purple animate-spin" />
                    <p className="text-lg font-semibold text-foreground">Analisando sua foto...</p>
                    <p className="text-sm text-muted-foreground">Aguarde um momento.</p>
                  </div>
                )}
                
                {extractedData && !isProcessing && (
                  <Card className="border border-brand-purple/20 bg-gradient-to-br from-card to-brand-purple/5 shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-foreground flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-brand-purple to-brand-purple/70 rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                        <span>Dados Extraídos</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="amount" className="text-sm font-medium text-foreground">
                            Valor (R$)
                          </Label>
                          <Input
                            id="amount"
                            value={editedAmount}
                            onChange={(e) => setEditedAmount(e.target.value)}
                            placeholder="0,00"
                            className="h-11 border-brand-purple/20 bg-background/80 backdrop-blur-sm focus:border-brand-purple/50 focus:ring-brand-purple/20 rounded-lg"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="description" className="text-sm font-medium text-foreground">
                            Descrição
                          </Label>
                          <Input
                            id="description"
                            value={editedDescription}
                            onChange={(e) => setEditedDescription(e.target.value)}
                            placeholder="Descrição da despesa"
                            className="h-11 border-brand-purple/20 bg-background/80 backdrop-blur-sm focus:border-brand-purple/50 focus:ring-brand-purple/20 rounded-lg"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="category" className="text-sm font-medium text-foreground">
                            Categoria
                          </Label>
                          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="h-11 border-brand-purple/20 bg-background/80 backdrop-blur-sm focus:border-brand-purple/50 focus:ring-brand-purple/20 rounded-lg">
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent className="border-brand-purple/20 bg-background/95 backdrop-blur-sm">
                              {categories
                                .filter(cat => cat.type === 'expense')
                                .map((category) => (
                                  <SelectItem key={category.id} value={category.id} className="hover:bg-brand-purple/10">
                                    <span className="flex items-center space-x-2">
                                      <span>{category.icon}</span>
                                      <span>{category.name}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex space-x-3 pt-4">
                        <Button 
                          onClick={handleSaveTransaction} 
                          className="flex-1 h-11 bg-gradient-to-r from-brand-purple to-brand-purple/80 hover:from-brand-purple/90 hover:to-brand-purple/70 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Confirmar & Salvar
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={resetCapture}
                          className="h-11 border-brand-purple/20 hover:border-brand-purple/40 hover:bg-brand-purple/5 rounded-lg transition-all duration-300"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Nova Foto
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PremiumOverlay>
  );
};
