
import { useState, useEffect } from 'react';

export const useTabPersistence = (defaultTab: string) => {
  // Get initial tab from localStorage or use default
  const [activeTab, setActiveTab] = useState<string>(() => {
    const savedTab = localStorage.getItem('adminActiveTab');
    return savedTab || defaultTab;
  });

  // Update localStorage when tab changes
  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  return {
    activeTab,
    setActiveTab
  };
};
