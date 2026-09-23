import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export type BackgroundDensity = 'quiet' | 'normal' | 'expressive';

interface InspireBackgroundContextType {
  density: BackgroundDensity;
  setDensity: (density: BackgroundDensity) => void;
}

const InspireBackgroundContext = createContext<InspireBackgroundContextType>({
  density: 'quiet',
  setDensity: () => {},
});

export const InspireBackgroundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const getDefaultDensity = (pathname: string): BackgroundDensity => {
    if (pathname.includes('/dashboard')) return 'quiet';
    if (pathname.includes('/submit')) return 'quiet';
    if (pathname.includes('/profile')) return 'quiet';
    if (pathname.includes('/register')) return 'normal';
    if (pathname.includes('/guidelines')) return 'normal';
    if (pathname.includes('/community')) return 'normal';
    return 'quiet';
  };

  const [density, setDensity] = useState<BackgroundDensity>(() => getDefaultDensity(location.pathname));

  useEffect(() => {
    setDensity(getDefaultDensity(location.pathname));
  }, [location.pathname]);

  return (
    <InspireBackgroundContext.Provider value={{ density, setDensity }}>
      {children}
    </InspireBackgroundContext.Provider>
  );
};

export const useInspireBackground = (overrideDensity?: BackgroundDensity) => {
  const context = useContext(InspireBackgroundContext);
  useEffect(() => {
    if (overrideDensity) {
      context.setDensity(overrideDensity);
    }
  }, [overrideDensity]);
  return context;
};
