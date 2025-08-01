import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import MainApp from "./components/MainApp";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

const queryClient = new QueryClient();

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'sbu';
  sbu_name?: string;
}

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          console.log('User profile fetched:', profile);
          setUserProfile(profile as UserProfile);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            console.log('Initial profile fetch:', profile);
            setUserProfile(profile as UserProfile);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              session && userProfile ? (
                <Navigate to={userProfile.role === 'admin' ? '/admin/dashboard' : '/sbu/dashboard'} replace />
              ) : (
                <Auth />
              )
            } />
            <Route path="/admin/*" element={
              // Allow demo admin bypass or authenticated admin users
              <MainApp 
                userRole="admin" 
                userName={userProfile?.full_name || "Admin Demo"} 
                onSignOut={handleSignOut} 
              />
            } />
            <Route path="/sbu/*" element={
              session && userProfile?.role === 'sbu' ? (
                <MainApp 
                  userRole="sbu" 
                  userName={userProfile.full_name} 
                  currentSBU={userProfile.sbu_name}
                  onSignOut={handleSignOut} 
                />
              ) : (
                <Navigate to="/" replace />
              )
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
