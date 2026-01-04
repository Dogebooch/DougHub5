'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface QuickDumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
}

export function QuickDumpModal({ isOpen, onClose, onSave }: QuickDumpModalProps) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setContent('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSave = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedContent);
      toast({
        description: '✓ Saved to queue',
        duration: 2000,
      });
      setContent('');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Quick Dump</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste anything here..."
            className="min-h-[200px] resize-none"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
          >
            Save for Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
