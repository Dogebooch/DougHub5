import { useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface InsightTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
  minLength?: number;
}

const MIN_CHAR_DEFAULT = 20;

/**
 * InsightTextarea is the core learning input for the DougHub workflow.
 * It forces users to articulate what they've learned in their own words,
 * serving as the basis for clinical notebook entries.
 */
export function InsightTextarea({
  value,
  onChange,
  onValidChange,
  minLength = MIN_CHAR_DEFAULT,
}: InsightTextareaProps) {
  const charCount = value.length;
  const isValid = charCount >= minLength;

  // Notify parent of validation state changes
  useEffect(() => {
    onValidChange?.(isValid);
  }, [isValid, onValidChange]);

  const helperTextId = "insight-helper-text";

  return (
    <div className="rounded-lg border-2 border-primary/50 bg-accent/30 p-4 shadow-sm">
      {/* Header */}
      <Label 
        htmlFor="insight-textarea"
        className="text-base font-semibold tracking-wide text-foreground"
      >
        WHAT DID YOU LEARN?
      </Label>
      <p className="text-sm text-muted-foreground mt-1 mb-3">
        Write it in your own words. This becomes your notebook entry.
      </p>

      {/* Textarea */}
      <Textarea
        id="insight-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., CKD patients are more likely to die from CVD than progress to ESKD. Key takeaway: manage CV risk aggressively..."
        className="min-h-[150px] resize-y text-base bg-background/50 border-input"
        aria-describedby={helperTextId}
      />

      {/* Character counter / Validation message */}
      <div className="flex justify-end mt-2">
        <span
          id={helperTextId}
          className={cn(
            "text-xs font-medium transition-colors duration-200",
            isValid ? "text-muted-foreground" : "text-warning"
          )}
          role="status"
          aria-live="polite"
        >
          {isValid ? (
            `${charCount} chars`
          ) : (
            <>
              Min {minLength} characters <span className="opacity-70">[{charCount}]</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
