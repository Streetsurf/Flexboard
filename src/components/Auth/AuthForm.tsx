import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';

const AuthForm: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();

  const getErrorMessage = (error: any) => {
    console.log('Full error object:', error);
    
    // Handle Supabase auth errors more specifically
    if (error?.message?.includes('Invalid login credentials') || error?.message?.includes('invalid_credentials')) {
      return 'The email or password you entered is incorrect. Please double-check your credentials. If you recently signed up, make sure you\'ve confirmed your email address by clicking the link sent to your inbox.';
    }
    if (error?.message?.includes('Email not confirmed')) {
      return 'Please check your email and click the confirmation link before signing in.';
    }
    if (error?.message?.includes('User already registered')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (error?.message?.includes('Password should be at least')) {
      return 'Password must be at least 6 characters long.';
    }
    if (error?.message?.includes('Signup requires a valid password')) {
      return 'Please enter a valid password (at least 6 characters).';
    }
    if (error?.message?.includes('Unable to validate email address')) {
      return 'Please enter a valid email address.';
    }
    if (error?.message?.includes('Email rate limit exceeded')) {
      return 'Too many email attempts. Please wait a few minutes before trying again.';
    }
    if (error?.message?.includes('Signups not allowed')) {
      return 'New account registration is currently disabled. Please contact support.';
    }
    
    return error?.message || 'An unexpected error occurred. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

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
    // Clear form when switching modes
    setEmail('');
    setPassword('');
  };

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
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-3 rounded-md text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
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
                disabled={loading}
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
                disabled={loading}
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
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-2.5"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
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
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors duration-150"
              disabled={loading}
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
                • Make sure you're using the same email you registered with
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