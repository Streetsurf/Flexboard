import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Loader2, AlertCircle, CheckCircle, Info, Clock, Mail } from 'lucide-react';

const AuthForm: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false);
  
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();

  // Countdown timer for rate limit
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (rateLimitSeconds > 0) {
      interval = setInterval(() => {
        setRateLimitSeconds(prev => {
          if (prev <= 1) {
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [rateLimitSeconds]);

  const extractRateLimitSeconds = (errorMessage: string): number => {
    const match = errorMessage.match(/after (\d+) seconds?/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const getErrorMessage = (error: any) => {
    console.log('Full error object:', error);
    
    // Handle rate limiting with countdown
    if (error?.message?.includes('For security purposes, you can only request this after') || 
        error?.message?.includes('over_email_send_rate_limit')) {
      const seconds = extractRateLimitSeconds(error.message);
      setRateLimitSeconds(seconds);
      setIsEmailNotConfirmed(false);
      return `Too many attempts. Please wait ${seconds} seconds before trying again.`;
    }
    
    // Handle email not confirmed error specifically - check multiple possible formats
    if (error?.message?.includes('Email not confirmed') || 
        error?.code === 'email_not_confirmed' ||
        error?.message?.toLowerCase().includes('email not confirmed') ||
        (error?.status === 400 && error?.body && JSON.stringify(error.body).includes('email_not_confirmed'))) {
      setIsEmailNotConfirmed(true);
      return 'Your email address has not been confirmed yet. Please check your email inbox (including spam/junk folder) and click the confirmation link before signing in.';
    }
    
    // Handle Supabase auth errors more specifically
    if (error?.message?.includes('Invalid login credentials') || error?.message?.includes('invalid_credentials')) {
      setIsEmailNotConfirmed(false);
      return 'The email or password you entered is incorrect. Please double-check your credentials. If you recently signed up, make sure you\'ve confirmed your email address by clicking the link sent to your inbox.';
    }
    if (error?.message?.includes('User already registered')) {
      setIsEmailNotConfirmed(false);
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (error?.message?.includes('Password should be at least')) {
      setIsEmailNotConfirmed(false);
      return 'Password must be at least 6 characters long.';
    }
    if (error?.message?.includes('Signup requires a valid password')) {
      setIsEmailNotConfirmed(false);
      return 'Please enter a valid password (at least 6 characters).';
    }
    if (error?.message?.includes('Unable to validate email address')) {
      setIsEmailNotConfirmed(false);
      return 'Please enter a valid email address.';
    }
    if (error?.message?.includes('Signups not allowed')) {
      setIsEmailNotConfirmed(false);
      return 'New account registration is currently disabled. Please contact support.';
    }
    
    setIsEmailNotConfirmed(false);
    return error?.message || 'An unexpected error occurred. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if rate limited
    if (rateLimitSeconds > 0) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    setIsEmailNotConfirmed(false);

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        setSuccess('Account created successfully! Please check your email (including spam folder) and click the confirmation link before signing in.');
        setError('');
        // Clear form after successful signup
        setEmail('');
        setPassword('');
      } else {
        await signIn(email.trim(), password);
        navigate('/');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(getErrorMessage(err));
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setSuccess('');
    setRateLimitSeconds(0);
    setIsEmailNotConfirmed(false);
    // Clear form when switching modes
    setEmail('');
    setPassword('');
  };

  const isRateLimited = rateLimitSeconds > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <h2 className="mt-6 text-xl lg:text-2xl font-semibold text-gray-900">
            Welcome to FlexBoard
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>
        
        <form className="mt-6 space-y-5 bg-white p-6 lg:p-7 rounded-lg shadow-sm border border-gray-200" onSubmit={handleSubmit}>
          {error && (
            <div className={`border px-3 py-3 rounded-md text-sm flex items-start space-x-2 ${
              isEmailNotConfirmed
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : isRateLimited 
                ? 'bg-orange-50 border-orange-200 text-orange-600' 
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              {isEmailNotConfirmed ? (
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : isRateLimited ? (
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <span>{error}</span>
                {isRateLimited && (
                  <div className="mt-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="bg-orange-200 rounded-full h-2 w-16 overflow-hidden">
                        <div 
                          className="bg-orange-500 h-full transition-all duration-1000 ease-linear"
                          style={{ width: `${((60 - rateLimitSeconds) / 60) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono">{rateLimitSeconds}s</span>
                    </div>
                  </div>
                )}
                {isEmailNotConfirmed && (
                  <div className="mt-3 text-xs">
                    <div className="bg-amber-100 border border-amber-200 rounded-md p-2">
                      <p className="font-medium mb-1">What to do next:</p>
                      <ul className="list-disc list-inside space-y-1 text-amber-600">
                        <li>Check your email inbox for "{email}"</li>
                        <li>Look in your spam/junk folder if not found</li>
                        <li>Click the "Confirm your email" link</li>
                        <li>Return here and try signing in again</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-3 py-3 rounded-md text-sm flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {!isSignUp && !error && !success && (
            <div className="bg-blue-50 border border-blue-200 text-blue-600 px-3 py-3 rounded-md text-sm flex items-start space-x-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>First time signing in?</strong> Make sure to confirm your email address first by clicking the link sent to your inbox after signing up.
              </span>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="Enter your email"
                disabled={loading || isRateLimited}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter your password"
                minLength={6}
                disabled={loading || isRateLimited}
              />
              {isSignUp && (
                <p className="mt-1.5 text-xs text-gray-500">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isRateLimited}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-2.5"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRateLimited ? (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Wait {rateLimitSeconds}s
              </>
            ) : (
              <>
                {isSignUp ? <UserPlus className="w-4 h-4 mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                {isSignUp ? 'Sign up' : 'Sign in'}
              </>
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleModeSwitch}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || isRateLimited}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {!isSignUp && (
            <div className="text-center">
              <p className="text-xs text-gray-500 mt-4">
                <strong>Troubleshooting sign-in issues:</strong><br />
                • Verify your email and password are correct<br />
                • Check if you've confirmed your email after signing up<br />
                • Look in your spam folder for the confirmation email<br />
                • Make sure you're using the same email you registered with<br />
                • Wait if you see a rate limit message (security feature)
              </p>
            </div>
          )}

          {isSignUp && (
            <div className="text-center">
              <p className="text-xs text-gray-500 mt-4">
                <strong>Important:</strong> After signing up, you'll receive a confirmation email. You must click the link in that email before you can sign in. Check your spam folder if you don't see it within a few minutes.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthForm;