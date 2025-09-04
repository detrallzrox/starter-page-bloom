import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { useCurrentAccountPremium } from '@/hooks/useCurrentAccountPremium';
import { useFeatureUsageLimits } from '@/hooks/useFeatureUsageLimits';
import { PremiumOverlay } from './PremiumOverlay';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  categories?: {
    name: string;
  };
  payment_method?: string;
  notes?: string;
}

interface DateRange {
  from?: Date;
  to?: Date;
}

interface ExportDataProps {
  transactions: Transaction[];
  dateRange: DateRange;
  filterType: string;
  currentBalance?: number;
  investmentBalance?: number;
  debtBalance?: number;
}

export const ExportData = ({ 
  transactions, 
  dateRange, 
  filterType,
  currentBalance = 0,
  investmentBalance = 0,
  debtBalance = 0
}: ExportDataProps) => {
  const { isPremium } = useCurrentAccountPremium();
  const { canUse, incrementUsage, getRemainingUsage } = useFeatureUsageLimits();
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getFilterDescription = () => {
    if (filterType === 'all') return 'Todas as transações';
    if (filterType === 'custom' && dateRange.from && dateRange.to) {
      const from = format(toZonedTime(dateRange.from, 'America/Sao_Paulo'), 'dd/MM/yyyy', { locale: ptBR });
      const to = format(toZonedTime(dateRange.to, 'America/Sao_Paulo'), 'dd/MM/yyyy', { locale: ptBR });
      return `Período: ${from} a ${to}`;
    }
    const filterNames = {
      today: 'Hoje',
      week: 'Esta semana',
      month: 'Este mês',
      year: 'Este ano'
    };
    return filterNames[filterType as keyof typeof filterNames] || 'Período selecionado';
  };

  const calculateTotals = () => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const savings = transactions.filter(t => t.type === 'savings').reduce((sum, t) => sum + t.amount, 0);
    
    return { 
      income, 
      expenses, 
      savings,
      balance: income - expenses,
      currentBalance,
      investmentBalance,
      debtBalance
    };
  };



  const exportToExcel = async () => {
    if (!isPremium && !canUse('export')) {
      toast({
        title: "Limite atingido",
        description: "Você atingiu o limite de 3 exportações gratuitas. Faça upgrade para continuar!",
        variant: "destructive",
      });
      return;
    }
    
    setIsExporting(true);
    try {
      const totals = calculateTotals();
      const workbook = XLSX.utils.book_new();
      
      // === ABA 1: RESUMO COMPLETO ===
      const summaryData = [
        ['', '', '', '', '', '', '', '', '', ''], // Linha vazia para espaçamento
        ['', '', '💰 RELATÓRIO FINANCEIRO COMPLETO - FINAUDY', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', `📅 ${getFilterDescription()}`, '', '', '', '', '', '', ''],
        ['', '', `🕐 Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '💼 SALDOS ATUAIS', '', '', '📊 RESUMO DO PERÍODO', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', 'Categoria', 'Valor (R$)', '', 'Métrica', 'Quantidade', 'Percentual', '', '', ''],
        ['', '💰 Saldo Atual', totals.currentBalance, '', '📋 Total de Transações', transactions.length, '100%', '', '', ''],
        ['', '📈 Saldo Investido', totals.investmentBalance, '', '💰 Receitas', transactions.filter(t => t.type === 'income').length, transactions.length > 0 ? `${((transactions.filter(t => t.type === 'income').length / transactions.length) * 100).toFixed(1)}%` : '0%', '', '', ''],
        ['', '💳 Saldo Devedor', totals.debtBalance, '', '💸 Despesas', transactions.filter(t => t.type === 'expense').length, transactions.length > 0 ? `${((transactions.filter(t => t.type === 'expense').length / transactions.length) * 100).toFixed(1)}%` : '0%', '', '', ''],
        ['', '', '', '', '💎 Investimentos', transactions.filter(t => t.type === 'savings').length, transactions.length > 0 ? `${((transactions.filter(t => t.type === 'savings').length / transactions.length) * 100).toFixed(1)}%` : '0%', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '📊 FLUXO DO PERÍODO', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '💚 Receitas do Período', totals.income, '', '', '', '', '', '', ''],
        ['', '💸 Despesas do Período', totals.expenses, '', '', '', '', '', '', ''],
        ['', '💎 Investimentos do Período', totals.savings, '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '🏆 SALDO LÍQUIDO DO PERÍODO', totals.balance, '', '💡 STATUS', totals.balance >= 0 ? '✅ POSITIVO' : '⚠️ NEGATIVO', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '']
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Configurar largura das colunas
      summarySheet['!cols'] = [
        { wch: 2 }, { wch: 30 }, { wch: 20 }, { wch: 3 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 3 }, { wch: 2 }
      ];
      
      // === FORMATAÇÃO PRINCIPAL DO TÍTULO ===
      // Título principal (C2:I2)
      for (let col = 2; col <= 8; col++) {
        const cell = XLSX.utils.encode_cell({ r: 1, c: col });
        summarySheet[cell] = summarySheet[cell] || { v: '' };
        summarySheet[cell].s = {
          font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1E3A8A" } }, // Azul escuro elegante
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thick", color: { rgb: "1E40AF" } },
            bottom: { style: "thick", color: { rgb: "1E40AF" } },
            left: { style: "thin", color: { rgb: "1E40AF" } },
            right: { style: "thin", color: { rgb: "1E40AF" } }
          }
        };
      }
      
      // === FORMATAÇÃO DO PERÍODO E DATA ===
      // Período (C4:I4)
      for (let col = 2; col <= 8; col++) {
        const cell = XLSX.utils.encode_cell({ r: 3, c: col });
        summarySheet[cell] = summarySheet[cell] || { v: '' };
        summarySheet[cell].s = {
          font: { bold: true, sz: 12, color: { rgb: "1E40AF" } },
          fill: { fgColor: { rgb: "EFF6FF" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "BFDBFE" } },
            bottom: { style: "thin", color: { rgb: "BFDBFE" } },
            left: { style: "thin", color: { rgb: "BFDBFE" } },
            right: { style: "thin", color: { rgb: "BFDBFE" } }
          }
        };
      }
      
      // Data de geração (C5:I5)
      for (let col = 2; col <= 8; col++) {
        const cell = XLSX.utils.encode_cell({ r: 4, c: col });
        summarySheet[cell] = summarySheet[cell] || { v: '' };
        summarySheet[cell].s = {
          font: { italic: true, sz: 10, color: { rgb: "6B7280" } },
          fill: { fgColor: { rgb: "F8FAFC" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
          }
        };
      }
      
      // === CABEÇALHOS DAS SEÇÕES ===
      // Seção Resumo Financeiro (B8:D8)
      for (let col = 1; col <= 3; col++) {
        const cell = XLSX.utils.encode_cell({ r: 7, c: col });
        summarySheet[cell] = summarySheet[cell] || { v: '' };
        summarySheet[cell].s = {
          font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "7C3AED" } }, // Roxo moderno
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thick", color: { rgb: "5B21B6" } },
            bottom: { style: "thick", color: { rgb: "5B21B6" } },
            left: { style: "medium", color: { rgb: "5B21B6" } },
            right: { style: "medium", color: { rgb: "5B21B6" } }
          }
        };
      }
      
      // Seção Análise Estatística (E8:G8)
      for (let col = 4; col <= 6; col++) {
        const cell = XLSX.utils.encode_cell({ r: 7, c: col });
        summarySheet[cell] = summarySheet[cell] || { v: '' };
        summarySheet[cell].s = {
          font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "059669" } }, // Verde esmeralda
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thick", color: { rgb: "047857" } },
            bottom: { style: "thick", color: { rgb: "047857" } },
            left: { style: "medium", color: { rgb: "047857" } },
            right: { style: "medium", color: { rgb: "047857" } }
          }
        };
      }
      
      // === CABEÇALHOS DAS TABELAS ===
      // Cabeçalhos Resumo Financeiro (B10:C10)
      ['B10', 'C10'].forEach(cell => {
        summarySheet[cell].s = {
          font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "6366F1" } }, // Indigo vibrante
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "medium", color: { rgb: "4F46E5" } },
            bottom: { style: "medium", color: { rgb: "4F46E5" } },
            left: { style: "thin", color: { rgb: "4F46E5" } },
            right: { style: "thin", color: { rgb: "4F46E5" } }
          }
        };
      });
      
      // Cabeçalhos Estatísticas (E10:G10)
      ['E10', 'F10', 'G10'].forEach(cell => {
        summarySheet[cell].s = {
          font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "10B981" } }, // Verde menta
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "medium", color: { rgb: "059669" } },
            bottom: { style: "medium", color: { rgb: "059669" } },
            left: { style: "thin", color: { rgb: "059669" } },
            right: { style: "thin", color: { rgb: "059669" } }
          }
        };
      });
      
      // === DADOS FINANCEIROS COM CORES ESPECÍFICAS ===
      // Receitas (B11:C11)
      ['B11', 'C11'].forEach(cell => {
        summarySheet[cell].s = {
          font: { bold: true, sz: 11, color: { rgb: "047857" } },
          fill: { fgColor: { rgb: "D1FAE5" } }, // Verde claro
          alignment: { horizontal: cell === 'B11' ? "center" : "right", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "10B981" } },
            bottom: { style: "thin", color: { rgb: "10B981" } },
            left: { style: "thin", color: { rgb: "10B981" } },
            right: { style: "thin", color: { rgb: "10B981" } }
          }
        };
      });
      
      // Despesas (B12:C12)
      ['B12', 'C12'].forEach(cell => {
        summarySheet[cell].s = {
          font: { bold: true, sz: 11, color: { rgb: "DC2626" } },
          fill: { fgColor: { rgb: "FEE2E2" } }, // Vermelho claro
          alignment: { horizontal: cell === 'B12' ? "center" : "right", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "EF4444" } },
            bottom: { style: "thin", color: { rgb: "EF4444" } },
            left: { style: "thin", color: { rgb: "EF4444" } },
            right: { style: "thin", color: { rgb: "EF4444" } }
          }
        };
      });
      
      
      // === SALDO LÍQUIDO COM DESTAQUE ESPECIAL ===
      ['B16', 'C16'].forEach(cell => {
        summarySheet[cell].s = {
          font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: totals.balance >= 0 ? "059669" : "DC2626" } },
          alignment: { horizontal: cell === 'B16' ? "center" : "right", vertical: "center" },
          border: {
            top: { style: "thick", color: { rgb: totals.balance >= 0 ? "047857" : "B91C1C" } },
            bottom: { style: "thick", color: { rgb: totals.balance >= 0 ? "047857" : "B91C1C" } },
            left: { style: "thick", color: { rgb: totals.balance >= 0 ? "047857" : "B91C1C" } },
            right: { style: "thick", color: { rgb: totals.balance >= 0 ? "047857" : "B91C1C" } }
          }
        };
      });
      
      // === DADOS DAS ESTATÍSTICAS ===
      for (let row = 11; row <= 14; row++) {
        ['E', 'F', 'G'].forEach(col => {
          const cell = col + row;
          if (summarySheet[cell]) {
            summarySheet[cell].s = {
              font: { sz: 11, color: { rgb: "374151" }, bold: col === 'E' },
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "D1D5DB" } },
                bottom: { style: "thin", color: { rgb: "D1D5DB" } },
                left: { style: "thin", color: { rgb: "D1D5DB" } },
                right: { style: "thin", color: { rgb: "D1D5DB" } }
              },
              fill: { fgColor: { rgb: row % 2 === 0 ? "F3F4F6" : "FFFFFF" } }
            };
          }
        });
      }
      
      // === STATUS COM COR ESPECIAL ===
      ['E16', 'F16'].forEach(cell => {
        summarySheet[cell].s = {
          font: { bold: true, sz: 12, color: { rgb: totals.balance >= 0 ? "047857" : "DC2626" } },
          fill: { fgColor: { rgb: totals.balance >= 0 ? "ECFDF5" : "FEF2F2" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "medium", color: { rgb: totals.balance >= 0 ? "10B981" : "EF4444" } },
            bottom: { style: "medium", color: { rgb: totals.balance >= 0 ? "10B981" : "EF4444" } },
            left: { style: "thin", color: { rgb: totals.balance >= 0 ? "10B981" : "EF4444" } },
            right: { style: "thin", color: { rgb: totals.balance >= 0 ? "10B981" : "EF4444" } }
          }
        };
      });
      
      // Formatação de moeda para todos os valores monetários
      ['C11', 'C12', 'C13', 'C18', 'C19', 'C20', 'C22'].forEach(cell => {
        if (summarySheet[cell] && typeof summarySheet[cell].v === 'number') {
          summarySheet[cell].z = '"R$ "#,##0.00';
        }
      });
      
      // Mesclar células
      summarySheet['!merges'] = [
        { s: { r: 1, c: 2 }, e: { r: 1, c: 8 } }, // Título principal
        { s: { r: 3, c: 2 }, e: { r: 3, c: 8 } }, // Período
        { s: { r: 4, c: 2 }, e: { r: 4, c: 8 } }, // Data de geração
        { s: { r: 7, c: 1 }, e: { r: 7, c: 3 } }, // Seção Resumo Financeiro
        { s: { r: 7, c: 4 }, e: { r: 7, c: 6 } }  // Seção Análise Estatística
      ];
      
      XLSX.utils.book_append_sheet(workbook, summarySheet, '📊 Resumo Completo');


      
      // === ABA 2: TRANSAÇÕES DETALHADAS ===
      const transactionHeaders = ['📅 Data', '📝 Descrição', '🏷️ Categoria', '💱 Tipo', '💰 Valor', '💳 Pagamento', '📋 Observações'];
      
      const transactionData = [
        ['', '', '', '', '', '', '', '', ''], // Linha vazia
        ['', '', '📋 TRANSAÇÕES DETALHADAS - FINAUDY', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['', '', `📅 ${getFilterDescription()}`, '', '', '', '', '', ''],
        ['', '', `🕐 Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['', ...transactionHeaders, '', ''], // Cabeçalhos
        ...transactions.map(transaction => [
          '',
          format(toZonedTime(new Date(transaction.date + 'T12:00:00'), 'America/Sao_Paulo'), 'dd/MM/yyyy', { locale: ptBR }),
          transaction.description || '-',
          transaction.categories?.name || 'Outros',
          transaction.type === 'income' ? '💰 Receita' : '💸 Despesa',
          transaction.amount,
          transaction.payment_method || '-',
          transaction.notes || '-',
          ''
        ])
      ];
      
      const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
      
      // Configurar largura das colunas
      transactionSheet['!cols'] = [
        { wch: 2 }, { wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 30 }, { wch: 2 }
      ];
      
      // === FORMATAÇÃO DO TÍTULO PRINCIPAL ===
      // Título (C2:H2)
      for (let col = 2; col <= 7; col++) {
        const cell = XLSX.utils.encode_cell({ r: 1, c: col });
        transactionSheet[cell] = transactionSheet[cell] || { v: '' };
        transactionSheet[cell].s = {
          font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1E3A8A" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thick", color: { rgb: "1E40AF" } },
            bottom: { style: "thick", color: { rgb: "1E40AF" } },
            left: { style: "thin", color: { rgb: "1E40AF" } },
            right: { style: "thin", color: { rgb: "1E40AF" } }
          }
        };
      }
      
      // === FORMATAÇÃO DO PERÍODO E DATA ===
      // Período (C4:H4)
      for (let col = 2; col <= 7; col++) {
        const cell = XLSX.utils.encode_cell({ r: 3, c: col });
        transactionSheet[cell] = transactionSheet[cell] || { v: '' };
        transactionSheet[cell].s = {
          font: { bold: true, sz: 12, color: { rgb: "1E40AF" } },
          fill: { fgColor: { rgb: "EFF6FF" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "BFDBFE" } },
            bottom: { style: "thin", color: { rgb: "BFDBFE" } },
            left: { style: "thin", color: { rgb: "BFDBFE" } },
            right: { style: "thin", color: { rgb: "BFDBFE" } }
          }
        };
      }
      
      // Data de geração (C5:H5)
      for (let col = 2; col <= 7; col++) {
        const cell = XLSX.utils.encode_cell({ r: 4, c: col });
        transactionSheet[cell] = transactionSheet[cell] || { v: '' };
        transactionSheet[cell].s = {
          font: { italic: true, sz: 10, color: { rgb: "6B7280" } },
          fill: { fgColor: { rgb: "F8FAFC" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
          }
        };
      }
      
      // === CABEÇALHOS DAS COLUNAS COM GRADIENTE ===
      // Cabeçalhos das colunas (B7:H7)
      for (let col = 1; col <= 7; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 6, c: col });
        transactionSheet[cellAddress].s = {
          font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "6366F1" } }, // Indigo moderno
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thick", color: { rgb: "4F46E5" } },
            bottom: { style: "thick", color: { rgb: "4F46E5" } },
            left: { style: "thin", color: { rgb: "4F46E5" } },
            right: { style: "thin", color: { rgb: "4F46E5" } }
          }
        };
      }
      
      // === DADOS DAS TRANSAÇÕES COM FORMATAÇÃO AVANÇADA ===
      for (let row = 7; row < transactionData.length; row++) {
        for (let col = 1; col <= 7; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (transactionSheet[cellAddress]) {
            transactionSheet[cellAddress].s = {
              font: { sz: 10, color: { rgb: "374151" } },
              alignment: { 
                horizontal: col === 5 ? "right" : col === 1 ? "center" : "left",
                vertical: "center"
              },
              border: {
                top: { style: "thin", color: { rgb: "D1D5DB" } },
                bottom: { style: "thin", color: { rgb: "D1D5DB" } },
                left: { style: "thin", color: { rgb: "D1D5DB" } },
                right: { style: "thin", color: { rgb: "D1D5DB" } }
              },
              fill: { fgColor: { rgb: row % 2 === 0 ? "F9FAFB" : "FFFFFF" } }
            };
            
            // === COLORIR TIPOS DE TRANSAÇÃO COM CORES VIBRANTES ===
            if (col === 4) { // Coluna do tipo
              const value = transactionSheet[cellAddress].v;
              if (typeof value === 'string') {
                if (value.includes('Receita')) {
                  transactionSheet[cellAddress].s.fill = { fgColor: { rgb: "DCFCE7" } };
                  transactionSheet[cellAddress].s.font = { color: { rgb: "047857" }, bold: true, sz: 11 };
                  transactionSheet[cellAddress].s.border = {
                    top: { style: "thin", color: { rgb: "10B981" } },
                    bottom: { style: "thin", color: { rgb: "10B981" } },
                    left: { style: "thin", color: { rgb: "10B981" } },
                    right: { style: "thin", color: { rgb: "10B981" } }
                  };
                } else if (value.includes('Despesa')) {
                  transactionSheet[cellAddress].s.fill = { fgColor: { rgb: "FEE2E2" } };
                  transactionSheet[cellAddress].s.font = { color: { rgb: "DC2626" }, bold: true, sz: 11 };
                  transactionSheet[cellAddress].s.border = {
                    top: { style: "thin", color: { rgb: "EF4444" } },
                    bottom: { style: "thin", color: { rgb: "EF4444" } },
                    left: { style: "thin", color: { rgb: "EF4444" } },
                    right: { style: "thin", color: { rgb: "EF4444" } }
                  };
                }
              }
            }
            
            // === DESTAQUE PARA VALORES MONETÁRIOS ===
            if (col === 5) { // Coluna do valor
              transactionSheet[cellAddress].s.font = { color: { rgb: "1F2937" }, bold: true, sz: 11 };
              transactionSheet[cellAddress].s.fill = { fgColor: { rgb: "F3F4F6" } };
            }
            
            // === FORMATAÇÃO ESPECIAL PARA DATAS ===
            if (col === 1) { // Coluna da data
              transactionSheet[cellAddress].s.font = { color: { rgb: "4F46E5" }, bold: true, sz: 10 };
              transactionSheet[cellAddress].s.fill = { fgColor: { rgb: "EEF2FF" } };
            }
          }
        }
      }
      
      // === FORMATAÇÃO DOS VALORES MONETÁRIOS ===
      for (let row = 7; row < transactionData.length; row++) {
        const valueCell = XLSX.utils.encode_cell({ r: row, c: 5 });
        if (transactionSheet[valueCell] && typeof transactionSheet[valueCell].v === 'number') {
          transactionSheet[valueCell].z = '"R$ "#,##0.00';
        }
      }
      
      // === MESCLAR CÉLULAS PARA LAYOUT PROFISSIONAL ===
      transactionSheet['!merges'] = [
        { s: { r: 1, c: 2 }, e: { r: 1, c: 7 } }, // Título principal
        { s: { r: 3, c: 2 }, e: { r: 3, c: 7 } }, // Período
        { s: { r: 4, c: 2 }, e: { r: 4, c: 7 } }  // Data de geração
      ];
      
      XLSX.utils.book_append_sheet(workbook, transactionSheet, '📋 Transações');
      
      // Increment usage for free users on successful export
      if (!isPremium) {
        await incrementUsage('export');
      }

      // Salvar arquivo
      XLSX.writeFile(workbook, `relatorio-finaudy-${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
      
      toast({
        title: "Excel completo exportado com sucesso!",
        description: "Relatório com múltiplas abas: resumo, transações, análise de categorias e análise mensal.",
      });
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast({
        title: "Erro ao exportar Excel",
        description: "Não foi possível gerar o arquivo Excel.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!isPremium && !canUse('export')) {
      toast({
        title: "Limite atingido",
        description: "Você atingiu o limite de 3 exportações gratuitas. Faça upgrade para continuar!",
        variant: "destructive",
      });
      return;
    }
    
    setIsExporting(true);
    try {
      const totals = calculateTotals();
      const doc = new jsPDF();
      
      // Cores do tema
      const primaryColor: [number, number, number] = [79, 70, 229];
      const textColor: [number, number, number] = [51, 65, 85];
      const lightGray: [number, number, number] = [248, 250, 252];
      
      // Cabeçalho
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text('Relatório de Transações - Finaudy', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(getFilterDescription(), 105, 28, { align: 'center' });
      
      // Data de geração
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 20, 45);
      
      // Resumo financeiro completo
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Resumo Financeiro Completo', 20, 60);
      
      const summaryData = [
        ['Saldo Atual', formatCurrency(totals.currentBalance)],
        ['Saldo Investido', formatCurrency(totals.investmentBalance)],
        ['Saldo Devedor', formatCurrency(totals.debtBalance)],
        ['', ''], // Linha vazia
        ['Receitas do Período', formatCurrency(totals.income)],
        ['Despesas do Período', formatCurrency(totals.expenses)],
        ['Investimentos do Período', formatCurrency(totals.savings)],
        ['Saldo Líquido do Período', formatCurrency(totals.balance)]
      ];
      
      autoTable(doc, {
        startY: 65,
        head: [['Categoria', 'Valor']],
        body: summaryData,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        bodyStyles: {
          textColor: textColor
        },
        alternateRowStyles: {
          fillColor: lightGray
        },
        margin: { left: 20, right: 20 }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 20;
      
      // Verificar se precisa de nova página para transações
      if (currentY + 80 > doc.internal.pageSize.height - 30) {
        doc.addPage();
        currentY = 20;
      } else {
        currentY += 20;
      }

      // Tabela de transações
      const finalY = currentY;
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Transações', 20, finalY);
      
      const transactionTableData = transactions.map(transaction => [
        format(toZonedTime(new Date(transaction.date + 'T12:00:00'), 'America/Sao_Paulo'), 'dd/MM/yyyy', { locale: ptBR }),
        transaction.description || '-',
        transaction.categories?.name || 'Outros',
        transaction.type === 'income' ? 'Receita' : 'Despesa',
        formatCurrency(transaction.amount),
        transaction.payment_method || '-'
      ]);
      
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Método']],
        body: transactionTableData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        bodyStyles: {
          textColor: textColor
        },
        alternateRowStyles: {
          fillColor: lightGray
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Data
          1: { cellWidth: 40 }, // Descrição
          2: { cellWidth: 30 }, // Categoria
          3: { cellWidth: 25 }, // Tipo
          4: { cellWidth: 30 }, // Valor
          5: { cellWidth: 30 }, // Método
        },
        margin: { left: 20, right: 20 },
        didDrawPage: (data: any) => {
          // Rodapé
          const pageHeight = doc.internal.pageSize.height;
          doc.setTextColor(128, 128, 128);
          doc.setFontSize(8);
          doc.text('Finaudy - Gestão Financeira Inteligente', 105, pageHeight - 10, { align: 'center' });
        }
      });
      
      // Increment usage for free users on successful export
      if (!isPremium) {
        await incrementUsage('export');
      }

      doc.save(`relatorio-completo-finaudy-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
      
      toast({
        title: "PDF completo exportado com sucesso!",
        description: "Relatório com gráficos e análises detalhadas foi baixado.",
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro ao exportar PDF",
        description: "Não foi possível gerar o arquivo PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-gradient-card hover:shadow-md transition-all duration-300 rounded-xl border backdrop-blur-sm">
      {/* Premium Overlay para contas gratuitas que atingiram limite */}
      <PremiumOverlay 
        isBlocked={!isPremium && !canUse('export')}
        className="rounded-xl"
      >
        <div className="relative overflow-hidden">
          {/* Decorative gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>
        
        {/* Header content */}
        <div className="p-4 sm:p-6 pb-0">
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            {/* Icon with animated glow */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-lg animate-pulse">
              <Download className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Exportar Dados
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Baixe seus dados em formatos profissionais
            </p>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="px-4 sm:px-6 py-4">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl p-3 sm:p-4 border border-blue-200/30 dark:border-blue-800/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-blue-700 dark:text-blue-300 text-xs sm:text-sm truncate">
                📊 {getFilterDescription()}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {transactions.length} transações • Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {transactions.length > 0 ? "✅ Pronto" : "⚠️ Sem dados"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Buttons Section */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Excel Export */}
          <div className="group relative">
            <Button 
              variant="outline" 
              disabled={isExporting || transactions.length === 0}
              className="w-full h-16 sm:h-20 flex-col gap-1 sm:gap-2 border-2 hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] group-hover:shadow-lg text-xs sm:text-sm"
              onClick={exportToExcel}
            >
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white group-hover:shadow-lg transition-all duration-300">
                <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs sm:text-sm">
                  {isExporting ? 'Exportando...' : 'Exportar Excel'}
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Planilha completa com gráficos
                </p>
                {!isPremium && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {getRemainingUsage('export')} usos restantes • Premium
                  </p>
                )}
              </div>
            </Button>
            
            {/* Loading indicator for Excel */}
            {isExporting && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs sm:text-sm font-medium text-green-600">Processando...</span>
                </div>
              </div>
            )}
          </div>

          {/* PDF Export */}
          <div className="group relative">
            <Button 
              variant="outline" 
              disabled={isExporting || transactions.length === 0}
              className="w-full h-16 sm:h-20 flex-col gap-1 sm:gap-2 border-2 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] group-hover:shadow-lg text-xs sm:text-sm"
              onClick={exportToPDF}
            >
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-500 to-pink-600 text-white group-hover:shadow-lg transition-all duration-300">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs sm:text-sm">
                  {isExporting ? 'Exportando...' : 'Exportar PDF'}
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Relatório profissional formatado
                </p>
                {!isPremium && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {getRemainingUsage('export')} usos restantes • Premium
                  </p>
                )}
              </div>
            </Button>
            
            {/* Loading indicator for PDF */}
            {isExporting && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs sm:text-sm font-medium text-red-600">Gerando PDF...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features highlight */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/10 dark:to-emerald-950/10 rounded-lg p-3 border border-green-200/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500 flex items-center justify-center">
                <FileSpreadsheet className="h-3 w-3 text-white" />
              </div>
              <span className="font-semibold text-green-700 dark:text-green-300 text-xs sm:text-sm">Excel</span>
            </div>
            <ul className="space-y-1 text-green-600 dark:text-green-400 text-xs">
              <li>• Resumo executivo completo</li>
              <li>• Todas as transações detalhadas</li>
              <li>• Formatação profissional</li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/10 dark:to-pink-950/10 rounded-lg p-3 border border-red-200/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500 flex items-center justify-center">
                <FileText className="h-3 w-3 text-white" />
              </div>
              <span className="font-semibold text-red-700 dark:text-red-300 text-xs sm:text-sm">PDF</span>
            </div>
            <ul className="space-y-1 text-red-600 dark:text-red-400 text-xs">
              <li>• Layout profissional</li>
              <li>• Relatório executivo</li>
              <li>• Pronto para impressão</li>
            </ul>
          </div>
        </div>

        {/* Usage limit info for free users */}
        {!isPremium && (
          <div className="mt-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/10 dark:to-yellow-950/10 rounded-lg p-3 border border-amber-200/30">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                <span className="text-xs text-white font-bold">!</span>
              </div>
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Plano gratuito: {getRemainingUsage('export')} exportações restantes {getRemainingUsage('export') === 0 ? '(Limite atingido)' : '• Função Premium'}
              </span>
            </div>
          </div>
        )}
      </div>
      </PremiumOverlay>
    </div>
  );
};