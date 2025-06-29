'use client';

import { useState } from 'react';
import { signIn, signUp, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'confirm';

export function SignInForm() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      await signIn({
        username: email,
        password,
      });
      // Auth context will handle the redirect
    } catch (error: any) {
      console.error('Sign in error:', error);
      setErrorMessage(error.message || 'サインインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });
      setSuccessMessage('確認コードがメールアドレスに送信されました');
      setMode('confirm');
    } catch (error: any) {
      console.error('Sign up error:', error);
      setErrorMessage(error.message || 'アカウント作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      await confirmSignUp({
        username: email,
        confirmationCode,
      });
      setSuccessMessage('アカウントが確認されました。サインインしてください。');
      setMode('signin');
      setConfirmationCode('');
    } catch (error: any) {
      console.error('Confirm sign up error:', error);
      setErrorMessage(error.message || 'アカウント確認に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      await resendSignUpCode({
        username: email,
      });
      setSuccessMessage('確認コードを再送信しました');
    } catch (error: any) {
      console.error('Resend code error:', error);
      setErrorMessage(error.message || 'コード再送信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {mode === 'signin' && 'サインイン'}
            {mode === 'signup' && 'アカウント作成'}
            {mode === 'confirm' && 'アカウント確認'}
          </CardTitle>
          <CardDescription>
            {mode === 'signin' && 'AIアシスタントにアクセスしてください'}
            {mode === 'signup' && '新しいアカウントを作成してください'}
            {mode === 'confirm' && 'メールに送信された確認コードを入力してください'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="mb-4">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                サインイン
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => setMode('signup')}
                disabled={isLoading}
              >
                アカウントをお持ちでない方はこちら
              </Button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  8文字以上、大文字・小文字・数字・記号を含む
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                アカウント作成
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => setMode('signin')}
                disabled={isLoading}
              >
                既にアカウントをお持ちの方はこちら
              </Button>
            </form>
          )}

          {mode === 'confirm' && (
            <form onSubmit={handleConfirmSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">確認コード</Label>
                <Input
                  id="code"
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="123456"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                確認
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendCode}
                disabled={isLoading}
              >
                コードを再送信
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => setMode('signin')}
                disabled={isLoading}
              >
                サインインに戻る
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}