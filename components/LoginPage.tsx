
import React, { useState } from 'react';
import { useGameStore } from '../store';
import { Play } from 'lucide-react';
import clsx from 'clsx';

export const LoginPage: React.FC = () => {
  const login = useGameStore((state) => state.login);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await login();
      // Store will handle redirect to 'idle'
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
      {/* Background Animated Elements */}
      <div className="absolute inset-0 overflow-hidden z-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-8">
        <div className="bg-black/60 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-lg transform transition-all hover:scale-[1.01] hover:shadow-cyan-500/20">
          
          {/* Logo / Header */}
          <div className="text-center mb-10 space-y-4">
            <h1 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-cyan-400">
              NEON SURFER
            </h1>
            <p className="text-gray-400 font-medium tracking-wide text-sm">
              ACCESS THE DIGITAL VOID
            </p>
          </div>

          {/* Login Form / Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className={clsx(
                "group relative w-full bg-white text-gray-900 hover:bg-gray-100 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-4 transition-all duration-200 shadow-lg",
                loading ? "opacity-70 cursor-wait" : "hover:-translate-y-1"
              )}
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              <span className="text-lg">
                {loading ? 'Authenticating...' : 'Sign in with Google'}
              </span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-gray-500 text-xs uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <button
              onClick={() => useGameStore.setState({ status: 'idle' })}
              className="w-full bg-transparent border border-white/20 text-gray-300 hover:text-white hover:border-white/50 hover:bg-white/5 font-bold py-3 px-6 rounded-xl transition-all text-sm uppercase tracking-wider"
            >
              Play as Guest
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to the <span className="text-cyan-400 hover:underline cursor-pointer">Terms of Service</span> and <span className="text-cyan-400 hover:underline cursor-pointer">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
