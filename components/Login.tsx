import React, { useState } from 'react';
import { Hexagon, ArrowRight, Lock, Mail, Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          createdAt: new Date().toISOString(),
          role: 'user' // Default role
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // onLogin will be triggered by the auth state listener in App.tsx
    } catch (err: any) {
      console.error(err);
      let msg = 'An unexpected error occurred.';

      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Try logging in.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password login is not enabled in Firebase Console.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password.';
      } else if (err.message) {
        msg = err.message;
      }

      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-2xl overflow-hidden border border-slate-200">

        {/* Header Section */}
        <div className="bg-white p-10 text-center relative overflow-hidden border-b border-slate-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-full h-24 flex items-center justify-center mb-2">
              <img src="/lucilla-logo.png" alt="Lucilla CRM" className="w-full h-full object-contain" />
            </div>
            <p className="text-slate-500 text-xs font-semibold tracking-[0.3em] uppercase opacity-80">Business Management Solutions</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-10 pt-8">
          <h2 className="text-xl font-bold text-slate-800 mb-8 text-center tracking-tight">
            {isSignUp ? 'Create your account' : 'Sign in to Lucilla Suite'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all font-medium"
                  required
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all font-medium"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-semibold border border-red-100 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-none font-bold shadow-xl shadow-slate-200 hover:shadow-slate-300 transform active:scale-[0.99] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'} <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {!isSignUp && (
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@lucillacrm.com');
                  setPassword('password123');
                }}
                className="w-full mt-2 text-slate-400 hover:text-slate-600 py-2 font-bold text-[10px] uppercase tracking-[0.2em] transition-all"
              >
                Auto-fill Test Account
              </button>
            )}
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-xs text-slate-500 font-bold hover:text-slate-900 tracking-wider uppercase transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Create one'}
            </button>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">
              SECURE ENTERPRISE ACCESS<br />
              LUCILLA SUITE v1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;