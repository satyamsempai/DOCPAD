import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
}

export function SearchInput({
  value,
  onChange,
  onFocus,
  placeholder = "Search by Patient ID (best) or patient name…",
  className,
  isLoading,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search 
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-all",
          isLoading && "animate-pulse"
        )} 
        size={20} 
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className={cn(
          "pl-12 h-14 text-base border-2 focus-visible:ring-2 focus-visible:ring-primary transition-all",
          className
        )}
        aria-label="Search patients"
      />
    </div>
  );
}
