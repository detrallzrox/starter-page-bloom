import { useState, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, PieChart as PieChartIcon, TrendingDown, Wallet } from 'lucide-react';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface MonthlyData {
  month: string;
  monthKey: string;
  expenses: number;
  income: number;
  periodRevenue: number;
  investedBalance: number;
  debtBalance: number;
}

interface InteractiveChartProps {
  categoryData: ChartData[];
  monthlyData: MonthlyData[];
  expenseCategoryData: ChartData[];
  incomeCategoryData: ChartData[];
  investmentCategoryData: ChartData[];
  filteredTransactions: any[];
}

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-xs font-bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const InteractiveChart = ({ 
  categoryData, 
  monthlyData, 
  expenseCategoryData, 
  incomeCategoryData, 
  investmentCategoryData, 
  filteredTransactions 
}: InteractiveChartProps) => {
  
  // Estados para controlar os seletores
  const [categoryDataType, setCategoryDataType] = useState<'expenses' | 'income' | 'investments'>('expenses');
  const [monthlyDataType, setMonthlyDataType] = useState<'expenses' | 'income' | 'investments'>('expenses');
  // Cores completamente distintas com bom contraste para texto branco
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

  // Obter dados da categoria baseado na seleção - Memoizado para performance
  const getCurrentCategoryData = useCallback(() => {
    switch (categoryDataType) {
      case 'income':
        return incomeCategoryData;
      case 'investments':
        return investmentCategoryData;
      default:
        return expenseCategoryData;
    }
  }, [categoryDataType, incomeCategoryData, investmentCategoryData, expenseCategoryData]);

  // Aplicar cores vibrantes aos dados das categorias - Memoizado para evitar recalculos
  const coloredCategoryData = useMemo(() => {
    return getCurrentCategoryData().map((item, index) => ({
      ...item,
      color: vibrantColors[index % vibrantColors.length]
    }));
  }, [getCurrentCategoryData, vibrantColors]);

  const CustomTooltip = ({ active, payload, coordinate }: any) => {
    if (active && payload && payload.length) {
      return null; // Desabilitar tooltip padrão para usar posicionamento customizado
    }
    return null;
  };

  // Obter dados mensais baseado na seleção - Memoizado para performance
  const getCurrentMonthlyData = useMemo(() => {
    switch (monthlyDataType) {
      case 'income':
        return monthlyData.map(data => ({ ...data, value: data.periodRevenue }));
      case 'investments':
        return monthlyData.map(data => ({ ...data, value: data.investedBalance }));
      default:
        return monthlyData.map(data => ({ ...data, value: data.expenses }));
    }
  }, [monthlyDataType, monthlyData]);

  // Memoizar BarTooltip para evitar recriação desnecessária
  const BarTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataTypeLabel = monthlyDataType === 'income' ? 'Receitas' : 
                           monthlyDataType === 'investments' ? 'Investimentos' : 'Despesas';

      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">
            {dataTypeLabel}: {payload[0].value.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
          </p>
        </div>
      );
    }
    return null;
  }, [monthlyDataType]);

  return (
    <Card className="lg:col-span-2 bg-gradient-card hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center">
          <PieChartIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Análise Financeira
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-2 text-xs sm:text-sm">
            <TabsTrigger value="categories" className="text-xs sm:text-sm">Por Categoria</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs sm:text-sm">Por Período</TabsTrigger>
          </TabsList>
          
           <TabsContent value="categories" className="mt-4">
             <div className="mb-4">
               <Select value={categoryDataType} onValueChange={(value: 'expenses' | 'income' | 'investments') => setCategoryDataType(value)}>
                 <SelectTrigger className="w-[200px]">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="expenses">
                     <div className="flex items-center gap-2">
                       <TrendingDown className="h-4 w-4 text-destructive" />
                       Despesas
                     </div>
                   </SelectItem>
                   <SelectItem value="income">
                     <div className="flex items-center gap-2">
                       <TrendingUp className="h-4 w-4 text-success" />
                       Receitas
                     </div>
                   </SelectItem>
                   <SelectItem value="investments">
                     <div className="flex items-center gap-2">
                       <Wallet className="h-4 w-4 text-blue-500" />
                       Investimentos
                     </div>
                   </SelectItem>
                 </SelectContent>
               </Select>
             </div>
              {coloredCategoryData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-8 gap-4">
                       <div className="w-full max-w-72 sm:max-w-80 h-64 sm:h-80 mx-auto lg:mx-0 overflow-hidden relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={coloredCategoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                              stroke="transparent"
                              strokeWidth={0}
                              style={{ outline: 'none' }}
                            >
                              {coloredCategoryData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.color} 
                                  stroke="transparent" 
                                  strokeWidth={0}
                                  style={{ outline: 'none' }}
                                />
                              ))}
                            </Pie>
                           
                         </PieChart>
                       </ResponsiveContainer>
                      
                      {/* Valor total no centro do gráfico */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center max-w-[100px] sm:max-w-[120px] px-2">
                          <div className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">
                            {categoryDataType === 'income' ? 'Total Receitas' : 
                             categoryDataType === 'investments' ? 'Total Investimentos' : 'Total Despesas'}
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-foreground leading-tight mt-1">
                            {coloredCategoryData.reduce((acc, item) => acc + item.value, 0).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </div>
                        </div>
                      </div>
                     </div>

                      {/* Lista de categorias */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-foreground text-sm">Categorias:</h4>
                        <div className="grid gap-3 sm:gap-2">
                          {coloredCategoryData
                            .map((entry, index) => {
                              const total = coloredCategoryData.reduce((acc, item) => acc + item.value, 0);
                              const percentage = ((entry.value / total) * 100);
                              return {
                                ...entry,
                                percentage,
                                originalIndex: index
                              };
                            })
                            .sort((a, b) => b.percentage - a.percentage)
                            .map((entry, index) => (
                              <div key={`legend-${entry.originalIndex}`} className="bg-background/50 rounded-lg p-3 border border-border/50 hover:bg-background/80 transition-colors">
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div
                                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm font-medium text-foreground truncate">
                                      {entry.name}
                                    </span>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-3">
                                    <div className="text-sm font-semibold text-foreground">
                                      {entry.value.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                      })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {entry.percentage.toFixed(1)}%
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                </div>
             ) : (
               <div className="h-80 flex items-center justify-center bg-muted/20 rounded-lg">
                 <div className="text-center space-y-2">
                   <PieChartIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                   <p className="text-sm text-muted-foreground">
                     Adicione transações para ver o gráfico
                   </p>
                 </div>
               </div>
             )}
          </TabsContent>
          
           <TabsContent value="monthly" className="mt-4">
             <div className="mb-4">
               <Select value={monthlyDataType} onValueChange={(value: 'expenses' | 'income' | 'investments') => setMonthlyDataType(value)}>
                 <SelectTrigger className="w-[200px]">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="expenses">
                     <div className="flex items-center gap-2">
                       <TrendingDown className="h-4 w-4 text-destructive" />
                       Despesas
                     </div>
                   </SelectItem>
                   <SelectItem value="income">
                     <div className="flex items-center gap-2">
                       <TrendingUp className="h-4 w-4 text-success" />
                       Receitas
                     </div>
                   </SelectItem>
                   <SelectItem value="investments">
                     <div className="flex items-center gap-2">
                       <Wallet className="h-4 w-4 text-blue-500" />
                       Investimentos
                     </div>
                   </SelectItem>
                 </SelectContent>
               </Select>
             </div>
             {getCurrentMonthlyData.length > 0 ? (
               <div className="space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-8 gap-4">
                     <div className="w-full max-w-none h-80 sm:h-96 lg:h-[500px] mx-auto lg:mx-0 overflow-hidden">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart 
                         data={getCurrentMonthlyData} 
                         margin={{ 
                           top: 20, 
                           right: 10, 
                           left: 10, 
                           bottom: 80 
                         }}
                       >
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis 
                           dataKey="month" 
                           fontSize={10}
                           tick={{ fontSize: 10 }}
                           interval={0}
                           angle={-45}
                           textAnchor="end"
                           height={80}
                         />
                         <YAxis 
                           fontSize={9}
                           tick={{ fontSize: 9 }}
                           width={50}
                           tickFormatter={(value) => 
                             value.toLocaleString('pt-BR', {
                               style: 'currency',
                               currency: 'BRL',
                               minimumFractionDigits: 0,
                               maximumFractionDigits: 0
                             })
                           }
                         />
                         <Tooltip content={<BarTooltip />} />
                         <Bar 
                           dataKey="value" 
                           fill={monthlyDataType === 'income' ? '#15803d' : 
                                 monthlyDataType === 'investments' ? '#3b82f6' : 
                                 'hsl(var(--destructive))'} 
                           name={monthlyDataType === 'income' ? 'Receitas' : 
                                 monthlyDataType === 'investments' ? 'Investimentos' : 'Despesas'}
                           radius={[2, 2, 0, 0]}
                         />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                   <div className="flex flex-col gap-2 lg:min-w-48">
                     {(() => {
                       const currentData = getCurrentMonthlyData;
                       const totalValue = currentData.reduce((sum, month) => sum + month.value, 0);
                       const dataTypeLabel = monthlyDataType === 'income' ? 'Receitas' : 
                                            monthlyDataType === 'investments' ? 'Investimentos' : 'Despesas';
                       const color = monthlyDataType === 'income' ? '#15803d' : 
                                    monthlyDataType === 'investments' ? '#3b82f6' : 
                                    'hsl(var(--destructive))';

                       return (
                         <div className="flex items-center justify-between w-full">
                           <div className="flex items-center gap-2">
                             <div
                               className="w-3 h-3 rounded-sm flex-shrink-0"
                               style={{ backgroundColor: color }}
                             />
                             <span className="text-sm">
                               {dataTypeLabel} Total
                             </span>
                           </div>
                           <span className="text-sm font-semibold">
                             {totalValue.toLocaleString('pt-BR', {
                               style: 'currency',
                               currency: 'BRL'
                             })}
                           </span>
                         </div>
                       );
                     })()}
                   </div>
                 </div>
               </div>
             ) : (
               <div className="h-96 flex items-center justify-center bg-muted/20 rounded-lg">
                 <div className="text-center space-y-2">
                   <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto" />
                   <p className="text-sm text-muted-foreground">
                     Dados mensais aparecerão aqui
                   </p>
                 </div>
               </div>
             )}
           </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};