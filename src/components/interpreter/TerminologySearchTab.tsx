
import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Star, 
  Clock, 
  Download, 
  Share2,
  Loader2, 
  BookMarked, 
  Languages
} from 'lucide-react';
import { useTerminologySearch, TerminologySearchResult } from '@/hooks/useTerminologySearch';

const LanguageSelect = ({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (value: string) => void;
}) => {
  const languages = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'Anglais' },
    { code: 'es', name: 'Espagnol' },
    { code: 'de', name: 'Allemand' },
    { code: 'it', name: 'Italien' },
    { code: 'pt', name: 'Portugais' },
    { code: 'ru', name: 'Russe' },
    { code: 'ar', name: 'Arabe' },
    { code: 'zh', name: 'Chinois' },
    { code: 'ja', name: 'Japonais' }
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background 
                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 focus-visible:border-purple-500"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
};

const SearchResultCard = ({
  result,
  isFavorite,
  onToggleFavorite
}: {
  result: TerminologySearchResult;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) => {
  return (
    <Card className="mb-4 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-medium">{result.term}</CardTitle>
            <CardDescription>
              {result.sourceLanguage} → {result.targetLanguage}
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleFavorite} 
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Star className={isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm whitespace-pre-line">{result.result}</div>
      </CardContent>
      <CardFooter className="pt-2 pb-2 flex justify-end gap-2">
        <Button variant="outline" size="sm" title="Partager">
          <Share2 className="w-4 h-4 mr-2" />
          Partager
        </Button>
        <Button variant="outline" size="sm" title="Télécharger">
          <Download className="w-4 h-4 mr-2" />
          Exporter
        </Button>
      </CardFooter>
    </Card>
  );
};

export const TerminologySearchTab = ({ profile }: { profile: any }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [context, setContext] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('fr');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState('search');
  const [currentResult, setCurrentResult] = useState<TerminologySearchResult | null>(null);
  
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const {
    searchTerminology,
    searchHistory,
    favorites,
    toggleFavorite,
    isSearching,
    isLoadingHistory,
    isLoadingFavorites
  } = useTerminologySearch(profile?.id);

  useEffect(() => {
    // Focus search input on component mount
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Terme manquant",
        description: "Veuillez saisir un terme à rechercher",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await searchTerminology({
        term: searchTerm,
        sourceLanguage,
        targetLanguage,
        context: context.trim() || undefined
      });
      
      setCurrentResult(result);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const isTermFavorite = (term: string) => {
    return favorites.some(fav => fav.term === term);
  };

  const handleToggleFavorite = (item: TerminologySearchResult) => {
    const isFav = isTermFavorite(item.term);
    toggleFavorite({ item, isFavorite: isFav });
  };

  const handleHistoryItemClick = (item: TerminologySearchResult) => {
    setSearchTerm(item.term);
    setSourceLanguage(item.sourceLanguage);
    setTargetLanguage(item.targetLanguage);
    setCurrentResult(item);
    setActiveTab('search');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center">
          <Languages className="mr-2 h-6 w-6 text-primary" />
          Recherche Terminologique
        </h1>
        <p className="text-muted-foreground">
          Recherchez des termes techniques et leur traduction pour préparer vos missions d'interprétariat
        </p>
      </div>
      
      <Tabs defaultValue="search" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="search" className="flex items-center">
            <Search className="w-4 h-4 mr-2" />
            Recherche
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex items-center">
            <BookMarked className="w-4 h-4 mr-2" />
            Favoris
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Terme à rechercher</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Langue source</label>
                  <LanguageSelect value={sourceLanguage} onChange={setSourceLanguage} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Langue cible</label>
                  <LanguageSelect value={targetLanguage} onChange={setTargetLanguage} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Terme technique ou expression</label>
                <Input
                  ref={searchInputRef}
                  placeholder="Saisissez un terme à rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Contexte (optionnel)
                </label>
                <Textarea
                  placeholder="Ajoutez du contexte pour une recherche plus précise..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !searchTerm.trim()}
                className="w-full md:w-auto"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recherche en cours...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Rechercher
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {currentResult && (
            <SearchResultCard
              result={currentResult}
              isFavorite={isTermFavorite(currentResult.term)}
              onToggleFavorite={() => handleToggleFavorite(currentResult)}
            />
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historique de recherche</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : searchHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune recherche récente
                </div>
              ) : (
                <div className="space-y-2">
                  {searchHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleHistoryItemClick(item)}
                      className="p-3 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">{item.term}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.sourceLanguage} → {item.targetLanguage} • {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(item);
                        }}
                      >
                        <Star className={isTermFavorite(item.term) ? "fill-yellow-400 text-yellow-400" : "text-gray-400"} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites">
          <Card>
            <CardHeader>
              <CardTitle>Termes favoris</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingFavorites ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun terme favori
                </div>
              ) : (
                <div className="space-y-4">
                  {favorites.map((item) => (
                    <SearchResultCard
                      key={item.id}
                      result={item}
                      isFavorite={true}
                      onToggleFavorite={() => handleToggleFavorite(item)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
