import { useState } from "react";
import { Search, Bookmark, Clock, X, Download, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTerminologySearch } from "@/hooks/useTerminologySearch";
import { SavedTerm, TermSearch } from "@/types/terminology";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LanguageCombobox } from "./LanguageCombobox";
import { LANGUAGES } from "@/lib/constants";

interface TerminologyTabProps {
  userId?: string;
}

export const TerminologyTab = ({ userId }: TerminologyTabProps) => {
  const [term, setTerm] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState<string>("Français");
  const [targetLanguage, setTargetLanguage] = useState<string>("Anglais");
  const [searchResult, setSearchResult] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("search");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  
  const { toast } = useToast();
  
  const {
    searchTerm,
    saveTerm,
    deleteSavedTerm,
    searchHistory,
    savedTerms,
    isSearching,
    isHistoryLoading,
    isSavedTermsLoading,
  } = useTerminologySearch(userId);

  const handleSearch = async () => {
    if (!term.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un terme à rechercher",
        variant: "destructive"
      });
      return;
    }

    setSearchResult("");
    setSearchError(null);
    setDetailsExpanded(false);
    
    try {
      console.log("Initiating search for term:", term.trim());
      const result = await searchTerm({
        term: term.trim(),
        sourceLanguage,
        targetLanguage,
      });
      
      console.log("Search result received:", result);
      
      if (result && result.result) {
        setSearchResult(result.result);
        setSearchError(null);
        setDetailsExpanded(true);
      } else {
        setSearchError("Aucun résultat de traduction reçu");
        toast({
          title: "Problème de recherche",
          description: "La recherche n'a pas retourné de résultat",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Search error in component:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur de recherche inconnue";
      setSearchError(errorMessage);
    }
  };

  const handleSaveTerm = async () => {
    if (!userId || !term || !searchResult) return;

    try {
      await saveTerm({
        id: "", // Will be generated by the database
        user_id: userId,
        term: term.trim(),
        result: searchResult,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving term:", error);
    }
  };

  const exportToCSV = () => {
    if (!savedTerms || savedTerms.length === 0) {
      toast({
        title: "Information",
        description: "Aucun terme à exporter",
      });
      return;
    }

    let csv = "Terme,Résultat,Langue source,Langue cible,Date\n";
    
    savedTerms.forEach(term => {
      const formattedDate = new Date(term.created_at).toLocaleDateString();
      const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
      csv += `${escapeCsv(term.term)},${escapeCsv(term.result)},${escapeCsv(term.source_language)},${escapeCsv(term.target_language)},${escapeCsv(formattedDate)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "termes-sauvegardés.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUseHistoryItem = (item: TermSearch) => {
    setTerm(item.term);
    setSourceLanguage(item.source_language);
    setTargetLanguage(item.target_language);
    setSearchResult(item.result);
    setSearchError(null);
    setActiveTab("search");
    setDetailsExpanded(true);
  };

  const renderTermItem = (item: TermSearch | SavedTerm, isSaved: boolean = false) => (
    <Card key={item.id} className="mb-2 overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <div className="font-semibold text-primary">{item.term}</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {item.source_language} → {item.target_language}
                </Badge>
                {isSaved ? (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-red-500 hover:text-red-700"
                    onClick={() => deleteSavedTerm(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-amber-500 hover:text-amber-600"
                    onClick={() => handleUseHistoryItem(item)}
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="link" size="sm">
                  Voir l'analyse détaillée
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 whitespace-pre-wrap p-4 bg-muted rounded-md overflow-auto max-h-[500px] text-sm">
                  {item.result}
                </div>
              </CollapsibleContent>
            </Collapsible>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(item.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-4">Recherche Terminologique</h2>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="search">Recherche</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="saved">Favoris</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="flex-1 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <LanguageCombobox
                languages={LANGUAGES}
                value={sourceLanguage}
                onChange={setSourceLanguage}
                placeholder="Langue source"
                emptyMessage="Aucune langue trouvée"
                allLanguagesOption={false}
              />
            </div>

            <div>
              <LanguageCombobox
                languages={LANGUAGES}
                value={targetLanguage}
                onChange={setTargetLanguage}
                placeholder="Langue cible"
                emptyMessage="Aucune langue trouvée"
                allLanguagesOption={false}
              />
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Rechercher un terme..."
                className="w-full"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4 mr-2" />}
              Rechercher
            </Button>
          </div>

          {searchError && (
            <Card className="mb-4 border-red-200">
              <CardContent className="p-4">
                <div className="text-red-500">
                  <p className="font-medium">Erreur de recherche:</p>
                  <p>{searchError}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {searchResult && !searchError && (
            <Card className="mb-4 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between mb-2">
                  <h3 className="text-lg font-semibold">{term}</h3>
                  <Button variant="outline" size="sm" onClick={handleSaveTerm}>
                    <Star className="h-4 w-4 mr-2 text-yellow-500" />
                    Favoris
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {sourceLanguage} → {targetLanguage}
                </div>
                
                <Accordion
                  type="single"
                  collapsible
                  defaultValue={detailsExpanded ? "analysis" : undefined}
                  className="w-full"
                >
                  <AccordionItem value="analysis">
                    <AccordionTrigger className="font-semibold text-primary">
                      Analyse linguistique détaillée
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted p-4 rounded-md whitespace-pre-wrap overflow-auto max-h-[500px] text-sm">
                        {searchResult}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 overflow-auto flex-1">
          {isHistoryLoading ? (
            <div className="flex justify-center items-center h-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : searchHistory && searchHistory.length > 0 ? (
            <div>
              {searchHistory.map(item => renderTermItem(item))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Votre historique de recherche s'affichera ici
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4 overflow-auto flex-1">
          {isSavedTermsLoading ? (
            <div className="flex justify-center items-center h-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter CSV
                </Button>
              </div>
              {savedTerms && savedTerms.length > 0 ? (
                <div>
                  {savedTerms.map(term => renderTermItem(term, true))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun terme favori. Enregistrez des termes depuis la recherche.
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
