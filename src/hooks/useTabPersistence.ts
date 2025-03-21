
import { useState, useEffect, useCallback } from 'react';

export const useTabPersistence = (defaultTab: string, storageKey: string = 'adminActiveTab') => {
  // Get initial tab from localStorage or use default
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const savedTab = localStorage.getItem(storageKey);
      return savedTab || defaultTab;
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return defaultTab;
    }
  });

  // Create a wrapped setter that also updates localStorage
  const setAndPersistActiveTab = useCallback((newTab: string) => {
    setActiveTab(newTab);
    try {
      localStorage.setItem(storageKey, newTab);
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }, [storageKey]);

  // Update localStorage when tab changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, activeTab);
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }, [activeTab, storageKey]);

  return {
    activeTab,
    setActiveTab: setAndPersistActiveTab
  };
};
