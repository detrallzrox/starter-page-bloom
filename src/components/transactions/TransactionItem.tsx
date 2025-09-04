import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Coffee } from "lucide-react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

const getCategoryIcon = (icon: string | null) => {
  if (icon) {
    return <span className="text-sm sm:text-base">{icon}</span>;
  }
  return <Coffee className="h-3 w-3 sm:h-4 sm:w-4 text-white" />;
};

interface TransactionItemProps {
  transaction: any;
  categoryColor: string;
  onEdit: (transaction: any) => void;
  onDelete: (id: string) => void;
}

export const TransactionItem = ({ transaction, categoryColor, onEdit, onDelete }: TransactionItemProps) => {
  return (
    <div
      className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border bg-card/50 hover:bg-card/80 transition-all duration-200 group cursor-pointer shadow-sm hover:shadow-md"
      onClick={() => onEdit(transaction)}
    >
      {/* Icon */}
      <div 
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-lg"
        style={{ backgroundColor: categoryColor }}
      >
        {getCategoryIcon(transaction.categories?.icon)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Description */}
        <p className="font-semibold text-sm sm:text-base text-foreground truncate leading-tight">
          {transaction.description}
        </p>
        
        {/* Category and Date Row */}
        <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
          <Badge 
            variant="outline" 
            className="text-xs sm:text-sm w-fit px-2 py-1 font-medium border-2 text-center justify-center"
            style={{
              backgroundColor: `${categoryColor}15`,
              borderColor: categoryColor,
              color: categoryColor
            }}
          >
            {transaction.categories?.name || "Sem categoria"}
          </Badge>
          
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {format(toZonedTime(new Date(transaction.date + "T12:00:00"), "America/Sao_Paulo"), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3 flex-shrink-0">
        <div className={`font-bold text-sm sm:text-base text-right whitespace-nowrap ${
          transaction.type === "income" 
            ? "text-emerald-600 dark:text-emerald-400" 
            : transaction.type === "savings" 
              ? "text-blue-600 dark:text-blue-400" 
              : "text-red-600 dark:text-red-400"
        }`}>
          {transaction.type === "income" || transaction.type === "savings" ? "+" : "-"}R$ {Math.abs(transaction.amount).toLocaleString("pt-BR", { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })}
        </div>
      </div>
    </div>
  );
};