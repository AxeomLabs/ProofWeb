import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  impersonating: boolean;
  impersonate: (userId: string) => Promise<void>;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  impersonating: false,
  impersonate: async () => {},
  stopImpersonating: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [realProfile, setRealProfile] = useState<any | null>(null);
  const [impersonatedProfile, setImpersonatedProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      
      if (fbUser) {
        setLoading(true);
        // Set up real-time listener for the user's profile
        const unsubscribeProfile = onSnapshot(doc(db, 'users', fbUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // SECURITY GUARD: If account is disabled by admin, force logout
            if (data.isDisabled) {
              console.warn("Account disabled. Signing out.");
              signOut(auth);
              setRealProfile(null);
            } else {
              setRealProfile(data);
            }
          } else {
            // Document doesn't exist. Let onboarding complete safely.
            setRealProfile(null);
          }
          setLoading(false);
        }, (err) => {
          console.error("Profile listener error:", err);
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setRealProfile(null);
        setImpersonatedProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const impersonate = async (userId: string) => {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setImpersonatedProfile({ id: docSnap.id, ...docSnap.data() });
    } else {
      console.error("User not found for impersonation");
    }
  };

  const stopImpersonating = () => {
    setImpersonatedProfile(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile: impersonatedProfile || realProfile, 
      loading,
      impersonating: !!impersonatedProfile,
      impersonate,
      stopImpersonating
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
