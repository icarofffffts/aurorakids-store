import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
    title: string;
    value: string;
    change?: string;
    changeType?: "positive" | "negative" | "neutral";
    icon: LucideIcon;
    variant?: "primary" | "secondary" | "accent" | "success";
}

const variantStyles = {
    primary: "gradient-primary",
    secondary: "gradient-secondary",
    accent: "gradient-accent",
    success: "gradient-success",
};

export function MetricCard({
    title,
    value,
    change,
    changeType = "neutral",
    icon: Icon,
    variant = "primary",
}: MetricCardProps) {
    return (
        <div className="bg-card rounded-xl p-5 shadow-soft animate-slide-up border border-border/50 hover:shadow-elevated transition-all duration-300">
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    {change && (
                        <p
                            className={cn(
                                "text-xs font-medium",
                                changeType === "positive" && "text-green-600",
                                changeType === "negative" && "text-red-500",
                                changeType === "neutral" && "text-muted-foreground"
                            )}
                        >
                            {change}
                        </p>
                    )}
                </div>
                <div
                    className={cn(
                        "p-3 rounded-xl",
                        variantStyles[variant]
                    )}
                >
                    <Icon className="h-5 w-5 text-white" />
                </div>
            </div>
        </div>
    );
}
