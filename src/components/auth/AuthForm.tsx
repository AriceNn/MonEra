import { useState, type FormEvent } from 'react';
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { signIn, signUp, resetPassword } from '../../lib/supabase';

interface AuthFormProps {
  language?: 'tr' | 'en';
  onSuccess?: () => void;
}

type AuthMode = 'signin' | 'signup' | 'reset';

export function AuthForm({ language: providedLanguage, onSuccess }: AuthFormProps) {
  // Get language from props or localStorage settings
  const getLanguage = (): 'tr' | 'en' => {
    if (providedLanguage) return providedLanguage;
    try {
      const stored = localStorage.getItem('fintrack-settings');
      if (stored) {
        const settings = JSON.parse(stored);
        return settings.language || 'tr';
      }
    } catch (e) {
      // Ignore parse errors
    }
    return 'tr';
  };

  const language = getLanguage();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Enable dark mode by default for auth page
  useState(() => {
    document.documentElement.classList.add('dark');
  });

  const texts = {
    tr: {
      signin: 'Giriş Yap',
      signup: 'Kayıt Ol',
      reset: 'Şifremi Unuttum',
      email: 'E-posta',
      password: 'Şifre',
      confirmPassword: 'Şifre (Tekrar)',
      forgotPassword: 'Şifremi Unuttum',
      noAccount: 'Hesabın yok mu?',
      haveAccount: 'Hesabın var mı?',
      backToSignin: 'Giriş Yap',
      sendResetLink: 'Sıfırlama Linki Gönder',
      resetSuccess: 'Şifre sıfırlama linki e-postanıza gönderildi.',
      signupSuccess: 'Kayıt başarılı! E-postanızı kontrol edin.',
      invalidEmail: 'Geçerli bir e-posta adresi girin.',
      passwordMismatch: 'Şifreler eşleşmiyor.',
      passwordTooShort: 'Şifre en az 6 karakter olmalıdır.',
    },
    en: {
      signin: 'Sign In',
      signup: 'Sign Up',
      reset: 'Reset Password',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot Password?',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      backToSignin: 'Back to Sign In',
      sendResetLink: 'Send Reset Link',
      resetSuccess: 'Password reset link sent to your email.',
      signupSuccess: 'Signup successful! Please check your email.',
      invalidEmail: 'Please enter a valid email address.',
      passwordMismatch: 'Passwords do not match.',
      passwordTooShort: 'Password must be at least 6 characters.',
    },
  };

  const t = texts[language];

  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateEmail(email)) {
      setError(t.invalidEmail);
      return;
    }

    if (mode === 'reset') {
      setIsLoading(true);
      try {
        await resetPassword(email);
        setSuccess(t.resetSuccess);
        setEmail('');
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setError(t.passwordTooShort);
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        onSuccess?.();
      } else {
        await signUp(email, password);
        setSuccess(t.signupSuccess);
        setTimeout(() => {
          setMode('signin');
          setSuccess('');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl animate-spin-slow" />
      </div>
      
      {/* Content Card */}
      <Card className="w-full max-w-md p-6 md:p-8 shadow-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl relative z-10">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/50 animate-pulse-slow">
            <span className="text-3xl font-bold text-white">₺</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent mb-2">
            FinTrack
          </h1>
          <p className="text-sm md:text-base text-slate-400">
            {mode === 'reset' ? t.reset : mode === 'signup' ? t.signup : t.signin}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-3 transition-all backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-300 font-medium">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-3 transition-all backdrop-blur-sm">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-300 font-medium">{success}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 mt-3 pointer-events-none z-10 transition-all duration-300 group-focus-within:text-indigo-400 group-focus-within:scale-110">
              <Mail className="w-5 h-5 text-slate-500" />
            </div>
            <Input
              type="email"
              label={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={language === 'tr' ? 'ornek@email.com' : 'example@email.com'}
              required
              disabled={isLoading}
              className="pl-12"
            />
          </div>

          {mode !== 'reset' && (
            <>
              {/* Password Input */}
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 mt-3 pointer-events-none z-10 transition-all duration-300 group-focus-within:text-indigo-400 group-focus-within:scale-110">
                  <Lock className="w-5 h-5 text-slate-500" />
                </div>
                <Input
                  type="password"
                  label={t.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="pl-12"
                />
              </div>

              {/* Confirm Password Input (Signup only) */}
              {mode === 'signup' && (
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 mt-3 pointer-events-none z-10 transition-all duration-300 group-focus-within:text-indigo-400 group-focus-within:scale-110">
                    <Lock className="w-5 h-5 text-slate-500" />
                  </div>
                  <Input
                    type="password"
                    label={t.confirmPassword}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="pl-12"
                  />
                </div>
              )}
            </>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:via-indigo-600 hover:to-purple-500 shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:shadow-indigo-600/60 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{language === 'tr' ? 'Yükleniyor...' : 'Loading...'}</span>
              </div>
            ) : (
              mode === 'reset' ? t.sendResetLink : mode === 'signup' ? t.signup : t.signin
            )}
          </Button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 space-y-4">
          {mode === 'signin' && (
            <>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="block w-full text-center text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                {t.forgotPassword}
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500">
                    {language === 'tr' ? 'veya' : 'or'}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-slate-400 text-center">
                {t.noAccount}{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors underline decoration-indigo-500/30 hover:decoration-indigo-400"
                >
                  {t.signup}
                </button>
              </p>
            </>
          )}

          {mode === 'signup' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500">
                    {language === 'tr' ? 'zaten üye misin?' : 'already a member?'}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-slate-400 text-center">
                {t.haveAccount}{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors underline decoration-indigo-500/30 hover:decoration-indigo-400"
                >
                  {t.signin}
                </button>
              </p>
            </>
          )}

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="flex items-center justify-center gap-2 w-full text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              <span>←</span>
              <span>{t.backToSignin}</span>
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
