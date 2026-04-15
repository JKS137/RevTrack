import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Loader2 } from 'lucide-react';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ id: firebaseUser.uid, ...userDoc.data() } as UserProfile);
        } else {
          // Create new user profile
          const newUser: UserProfile = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Anonymous',
            email: firebaseUser.email || '',
            role: firebaseUser.email === 'shjan_abdul2@gmail.com' ? 'admin' : 'member', // Default admin for the main user
            is_active: true,
            created_at: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, loading, login, logout };
}

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await onLogin();
    } catch (error) {
      console.error("Login failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-neutral-200 text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">RevTrack</h1>
          <p className="text-neutral-500 mt-2">Revenue Leakage Prevention Platform</p>
        </div>
        
        <Button 
          onClick={handleLogin} 
          disabled={loading}
          className="w-full h-12 text-lg font-medium"
        >
          {loading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <LogIn className="mr-2 h-5 w-5" />
          )}
          Sign in with Google
        </Button>
        
        <p className="mt-6 text-xs text-neutral-400 uppercase tracking-widest">
          Secure Enterprise Access
        </p>
      </div>
    </div>
  );
}
