import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { BottomNav } from './components/BottomNav';
import { SplashScreen } from './components/SplashScreen';
import { Home } from './pages/Home';
import { Scorecard } from './pages/Scorecard';
import { Wallet } from './pages/Wallet';
import { Profile } from './pages/Profile';
import { InviteHandler } from './pages/InviteHandler';
import { useSwipeBack } from './hooks/useSwipeBack';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useSwipeBack(); // Enable global swipe-to-back

  return (
    <div className="min-h-screen bg-brand-dark text-white font-sans antialiased selection:bg-brand-primary selection:text-black pb-safe">
      <div className="max-w-md mx-auto min-h-screen relative bg-brand-dark shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-1 flex flex-col relative">
          {children}
        </div>
        <BottomNav />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Start exit animation after 1 second
    const startExit = setTimeout(() => {
      setIsTransitioning(true);
    }, 1000);

    // Hide splash and start content fade-in after exit completes
    const hideSplash = setTimeout(() => {
      setShowSplash(false);
      setIsLoaded(true);
    }, 1500); // Logo finishes exiting at 1500ms

    return () => {
      clearTimeout(startExit);
      clearTimeout(hideSplash);
    };
  }, []);

  return (
    <AppProvider>
      <BrowserRouter>
        <div className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/play" element={<Scorecard />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/invite" element={<InviteHandler />} />
            </Routes>
          </Layout>
        </div>
        <SplashScreen isVisible={showSplash} isTransitioning={isTransitioning} />
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;