
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Tab {
  id: string;
  label: string;
}

interface TabNavigationPanelProps {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}

export const TabNavigationPanel: React.FC<TabNavigationPanelProps> = ({
  tabs,
  activeTab,
  setActiveTab,
  onLogout,
  isMenuOpen,
  setIsMenuOpen,
}) => {
  const isMobile = useIsMobile();

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setIsMenuOpen(false);
  };

  return (
    <div className="flex justify-between items-center sticky top-0 backdrop-blur-sm z-20 py-3 px-4 sm:px-6 border-b border-[#2a3854] shadow-sm bg-slate-50">
      {isMobile ? (
        <div className="flex items-center gap-3 w-full">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="touch-target">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px]">
              <div className="flex flex-col gap-1.5 mt-6">
                {tabs.map(tab => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    className="justify-start h-11"
                    onClick={() => handleTabChange(tab.id)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex-1 text-lg font-semibold">
            {tabs.find(tab => tab.id === activeTab)?.label}
          </div>
        </div>
      ) : (
        <div className="flex gap-4 items-center flex-1">
          <TabsList className="bg-muted/50 flex-1 gap-1">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex-1 px-6"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      )}
      <Button variant="outline" onClick={onLogout} className="gap-2 shrink-0">
        <LogOut className="h-4 w-4" />
        {!isMobile && "Se déconnecter"}
      </Button>
    </div>
  );
};
