import { AppLayout } from '@/components/layout/AppLayout';

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <h1 className="text-4xl font-semibold text-foreground">Settings</h1>
      </div>
    </AppLayout>
  );
}
