import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      if (authListener && authListener.data && authListener.data.subscription) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, []);

  const value = {
    session,
    user,
    loading,
    signIn: async (email, password) => {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) throw error;
      return data;
    },
    signUp: async (email, password, full_name, role_id) => {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setLoading(false);
        throw error;
      }
      // If signup is successful, insert profile data
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: full_name,
          role_id: role_id,
        });
        if (profileError) {
          setLoading(false);
          throw profileError;
        }
      }
      setLoading(false);
      return data;
    },
    signOut: async () => {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      setLoading(false);
      if (error) throw error;
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
