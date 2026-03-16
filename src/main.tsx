import { StrictMode, useState, useEffect, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { SplashScreen } from '@capacitor/splash-screen';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

function Root() {
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const init = async () => {
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.warn('SplashScreen hide failed:', e);
      }
      setIsReady(true);
    };

    const timer = setTimeout(init, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#ff4e00] to-[#ff8a5c] animate-pulse" />
      </div>
    );
  }

  return <App ready={isReady} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#ff4e00] to-[#ff8a5c] animate-pulse" />
      </div>
    }>
      <Root />
    </Suspense>
  </StrictMode>,
);
