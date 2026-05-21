import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { LoginCredentials } from '@/types/auth';
import { Scale, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DemoNotice } from './DemoNotice';

export function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoSubmittingEmail, setDemoSubmittingEmail] = useState('');
  const demoAccounts = [
    ['Admin', 'admin@demo.justicelink.local'],
    ['Clerk', 'clerk@demo.justicelink.local'],
    ['Judge', 'judge@demo.justicelink.local'],
    ['Lawyer', 'lawyer@demo.justicelink.local'],
    ['Prosecutor', 'prosecutor@demo.justicelink.local'],
    ['Paralegal', 'paralegal@demo.justicelink.local'],
    ['Legal Aid', 'legalaid@demo.justicelink.local'],
    ['Partner Admin', 'partner@demo.justicelink.local'],
    ['Data Analyst', 'analyst@demo.justicelink.local'],
  ] as const;

  const loginErrorMessage = (errorValue: unknown) => (
    errorValue instanceof Error ? errorValue.message : 'Invalid email or password. Please try again.'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // basic client-side validation
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(credentials.email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (credentials.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(credentials);
      toast({
        title: "Login Successful",
        description: "Welcome to the Justice Link demo",
      });
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (label: string, email: string) => {
    const demoCredentials = { email, password: 'password', rememberMe: false };
    setCredentials(demoCredentials);
    setError('');
    setDemoSubmittingEmail(email);
    setIsSubmitting(true);
    try {
      await login(demoCredentials);
      toast({
        title: `${label} Demo Login`,
        description: 'Signed in with the local synthetic demo account',
      });
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setIsSubmitting(false);
      setDemoSubmittingEmail('');
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-3">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:col-span-1 flex-col justify-between bg-violet-800 text-white p-6">
        <div />
        <div className="flex flex-col items-center">
          <div className="h-40 w-40 rounded-full bg-white/10 flex items-center justify-center mb-6 border border-white/20">
            <Scale className="h-16 w-16 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-serif font-bold">Justice Link</h1>
            <p className="text-sm text-white/80">Local justice access demo</p>
          </div>
        </div>
        <div className="text-xs text-white/80">
          <p>For demo assistance, contact the local presentation operator.</p>
          <p>No official helpdesk or production system is connected.</p>
        </div>
      </div>

      {/* Right auth panel */}
  <div className="bg-gradient-subtle lg:col-span-2 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-4">
            <DemoNotice />
          </div>
          {/* Crest / Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Scale className="h-12 w-12 text-primary mr-3" />
              <div>
                <p className="text-sm text-muted-foreground mt-1">Welcome to the Justice Link local demo</p>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <Card className="shadow-elegant border-0">
            <CardHeader className="space-y-1 pb-4">
              <h2 className="text-2xl font-serif font-semibold text-center text-foreground">
                Secure Login
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                Enter your credentials to access the system
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter a demo account email"
                    value={credentials.email}
                    onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((s) => !s)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember"
                      checked={credentials.rememberMe}
                      onCheckedChange={(checked) => 
                        setCredentials(prev => ({ ...prev, rememberMe: checked as boolean }))
                      }
                    />
                    <Label htmlFor="remember" className="text-sm text-muted-foreground">
                      Remember me
                    </Label>
                  </div>
                  <Button type="button" variant="link" className="p-0 h-auto text-primary" onClick={() => toast({ title: 'Reset Password', description: 'Please contact your system administrator to reset your password.' })}>
                    Forgot password?
                  </Button>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-navy text-primary-foreground hover:opacity-90 transition-opacity"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>

              <div className="pt-2">
                <Button asChild variant="outline" className="w-full">
                  <a href="/citizen">Open Citizen Legal Access Portal</a>
                </Button>
              </div>

              <div className="rounded-md border bg-muted/40 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  <span>One-click local demo accounts</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {demoAccounts.map(([label, email]) => (
                    <Button
                      key={email}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto min-h-9 whitespace-normal px-2 py-2 text-xs"
                      disabled={isSubmitting}
                      onClick={() => handleDemoLogin(label, email)}
                    >
                      {demoSubmittingEmail === email ? 'Signing in...' : label}
                    </Button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Citizen access stays public through the citizen portal.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
