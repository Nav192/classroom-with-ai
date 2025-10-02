import React, { createContext, useContext, useState, useEffect } from 'react';
// Assuming supabase client is initialized elsewhere, e.g., in services/supabaseClient.js
// import { supabase } from './services/supabaseClient'; 

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // This is a placeholder for actual authentication logic.
        // In a real application, you would fetch the user session from Supabase
        // or another authentication provider here.
        const fetchUser = async () => {
            try {
                // Example: Fetch user from Supabase
                // const { data: { user } } = await supabase.auth.getUser();
                // setUser(user);

                // For now, simulate a logged-in teacher user
                setUser({
                    id: 'a-teacher-uuid', // Replace with actual UUID from Supabase auth.uid()
                    role: 'teacher',
                    full_name: 'Teacher User',
                    email: 'teacher@example.com',
                });
            } catch (error) {
                console.error("Error fetching user:", error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();

        // In a real app, you'd also set up a listener for auth state changes
        // const { data: authListener } = supabase.auth.onAuthStateChange(
        //     (event, session) => {
        //         setUser(session?.user || null);
        //         setLoading(false);
        //     }
        // );
        // return () => {
        //     authListener.unsubscribe();
        // };

    }, []);

    const login = async (email, password) => {
        setLoading(true);
        try {
            // Example: Supabase login
            // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            // if (error) throw error;
            // setUser(data.user);

            // Simulate successful login
            setUser({
                id: 'a-teacher-uuid', // Replace with actual UUID
                role: 'teacher',
                full_name: 'Teacher User',
                email: email,
            });
            return { success: true };
        } catch (error) {
            console.error("Login error:", error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            // Example: Supabase logout
            // const { error } = await supabase.auth.signOut();
            // if (error) throw error;
            setUser(null);
            return { success: true };
        } catch (error) {
            console.error("Logout error:", error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};