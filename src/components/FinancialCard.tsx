import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FinancialCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: "default" | "income" | "expense" | "balance";
  className?: string;
}

export const FinancialCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  variant = "default",
  className 
}: FinancialCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "income":
        return "border-success/20 bg-gradient-to-br from-success/5 to-success/10 hover:shadow-glow";
      case "expense":
        return "border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10";
      case "balance":
        return "border-primary/20 bg-gradient-primary/10 hover:shadow-primary";
      default:
        return "bg-gradient-card hover:shadow-md";
    }
  };

  const getValueColor = () => {
    switch (variant) {
      case "income":
        return "text-success";
      case "expense":
        return "text-destructive";
      case "balance":
        return "text-primary";
      default:
        return "text-foreground";
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-300 cursor-pointer hover:scale-105 h-full flex flex-col",
      getVariantStyles(),
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 min-h-[44px]">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-2 flex-1">
          {title}
        </CardTitle>
        {icon && (
          <div className={cn("text-muted-foreground flex-shrink-0", 
            variant === "income" && "text-success",
            variant === "expense" && "text-destructive",
            variant === "balance" && "text-primary"
          )}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-3 pb-3 flex-1 flex flex-col justify-center">
        <div className={cn(
          "font-bold financial-value leading-none whitespace-nowrap overflow-hidden text-ellipsis mb-1",
          "min-w-0 max-w-full",
          getValueColor()
        )}
        style={{
          fontSize: `clamp(0.875rem, ${Math.max(0.875, 1.75 - (value.length * 0.06))}rem, 1.75rem)`
        }}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-tight line-clamp-2">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
};