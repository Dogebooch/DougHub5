import { useCallback, useState } from 'react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function SettingsView() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const handlePurgeArchive = useCallback(async () => {
    if (!window.api?.sourceItems?.purgeRawPages) {
      toast({
        title: 'Purge Failed',
        description: 'API not available',
        variant: 'destructive',
      });
      return;
    }

    setIsPurging(true);
    try {
      const result = await window.api.sourceItems.purgeRawPages();
      
      if (result.error) {
        toast({
          title: 'Purge Failed',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Raw HTML Archive Purged',
          description: 'Successfully removed archived webpage data.',
        });
        setIsDialogOpen(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Purge Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsPurging(false);
    }
  }, [toast]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Storage Management</CardTitle>
          <CardDescription>Manage database and cached data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 pb-6 border-b border-border last:border-b-0 last:pb-0">
            <div>
              <h3 className="font-semibold mb-2">Purge Raw HTML Archive</h3>
              <p className="text-sm text-muted-foreground">
                DougHub stores the original webpage code from every question you capture. Purging this can free up significant disk space if your database becomes large.
              </p>
            </div>

            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Purge Now</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Purge Raw HTML Archive?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground mb-1">Why purge?</p>
                      <p>
                        If DougHub is taking up too much storage on your computer, you can safely remove the hidden 'raw' copies of the websites you've captured.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">What's kept:</p>
                      <p>
                        Your flashcards, study notes, images, and clinical summaries are <strong>completely safe</strong> and won't be affected.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">What's lost:</p>
                      <p>
                        Only the technical webpage source code used for processing is deleted. Most users will never need this data again.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPurging}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handlePurgeArchive}
                    disabled={isPurging}
                    className={cn(isPurging && 'opacity-50 cursor-not-allowed')}
                  >
                    {isPurging ? 'Purging...' : 'Purge Archive'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
