'use client';

import { useAuth } from '@/contexts/AuthContext';
import { SignInForm } from './SignInForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { isAuthenticated, isLoading, isAdmin, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignInForm />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg border bg-card p-8 text-center">
          <h2 className="mb-4 text-xl font-semibold">アクセス権限がありません</h2>
          <p className="text-muted-foreground">
            この機能を利用するには管理者権限が必要です。
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}