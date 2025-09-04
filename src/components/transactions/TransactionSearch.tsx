import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface TransactionSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  transactionCount: number;
}

export const TransactionSearch = ({ searchTerm, onSearchChange, transactionCount }: TransactionSearchProps) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Header Section */}
      <div className="flex flex-col space-y-1">
        <h3 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
          Transações Recentes
        </h3>
        {transactionCount > 0 && (
          <span className="text-sm md:text-base text-muted-foreground font-medium">
            {transactionCount} transaç{transactionCount !== 1 ? "ões" : "ão"}
          </span>
        )}
      </div>
      
      {/* Search Section - Always below header for better placeholder visibility */}
      <div className="relative w-full max-w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          placeholder="Buscar por descrição, categoria, valor..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4 h-11 md:h-12 w-full text-sm md:text-base bg-background/80 border-2 focus:border-primary/50 transition-all duration-200 rounded-lg shadow-sm focus:shadow-md min-w-0"
        />
      </div>
    </div>
  );
};