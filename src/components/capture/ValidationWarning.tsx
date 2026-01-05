import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Lightbulb } from "lucide-react";
import { ValidationResult } from "@/types/ai";

interface ValidationWarningProps {
  validation: ValidationResult;
}

export function ValidationWarning({ validation }: ValidationWarningProps) {
  if (validation.isValid && validation.warnings.length === 0) {
    return null;
  }

  return (
    <div className="ml-8 space-y-2">
      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <ul className="list-disc list-inside space-y-0.5">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Suggestions */}
      {validation.suggestions.length > 0 && (
        <Alert className="py-2 border-info/30 bg-info/10">
          <Lightbulb className="h-4 w-4 text-info-foreground" />
          <AlertDescription className="text-xs text-info-foreground">
            <ul className="list-disc list-inside space-y-0.5">
              {validation.suggestions.map((suggestion, i) => (
                <li key={i}>{suggestion}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
