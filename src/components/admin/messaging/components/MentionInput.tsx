import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Languages } from "lucide-react";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMention?: (userId: string) => void;
  onLanguageMention?: (language: string) => void;
  className?: string;
  placeholder?: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  isAdmin?: boolean;
}

interface LanguageCount {
  language: string;
  count: number;
}

export const MentionInput = ({
  value,
  onChange,
  onMention,
  onLanguageMention,
  className = "",
  placeholder = "Type your message..."
}: MentionInputProps) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [languages, setLanguages] = useState<LanguageCount[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (showMentions) {
      fetchUsersAndLanguages();
    }
  }, [showMentions, mentionSearch]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      setIsAdmin(userRole?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const extractTargetLanguages = (languages: string[]): Map<string, number> => {
    const targetLanguages = new Map<string, number>();
    
    languages.forEach(langPair => {
      const [_, target] = langPair.split('→').map(s => s.trim());
      if (target) {
        targetLanguages.set(target, (targetLanguages.get(target) || 0) + 1);
      }
    });
    
    return targetLanguages;
  };

  const fetchUsersAndLanguages = async () => {
    try {
      console.log('Fetching users and languages with search term:', mentionSearch);
      
      const { data: interpreters, error: interpreterError } = await supabase
        .from('interpreter_profiles')
        .select('id, first_name, last_name, email, languages')
        .or(`first_name.ilike.%${mentionSearch}%,last_name.ilike.%${mentionSearch}%`);

      if (interpreterError) throw interpreterError;

      const { data: adminRoles, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminError) throw adminError;

      const adminIds = new Set(adminRoles?.map(role => role.user_id) || []);

      const usersWithRoles = interpreters?.map(user => ({
        ...user,
        isAdmin: adminIds.has(user.id)
      })) || [];

      setUsers(usersWithRoles);

      if (isAdmin) {
        const targetLanguageCounts = new Map<string, number>();
        
        interpreters?.forEach(interpreter => {
          const interpreterTargetLangs = extractTargetLanguages(interpreter.languages);
          interpreterTargetLangs.forEach((count, lang) => {
            const normalizedLang = lang.toLowerCase();
            const normalizedSearch = mentionSearch.toLowerCase();
            
            if (!mentionSearch || normalizedLang.includes(normalizedSearch)) {
              targetLanguageCounts.set(lang, (targetLanguageCounts.get(lang) || 0) + count);
            }
          });
        });

        const languageList = Array.from(targetLanguageCounts.entries())
          .map(([language, count]) => ({
            language,
            count
          }))
          .sort((a, b) => a.language.localeCompare(b.language));

        console.log('Language counts:', languageList);
        setLanguages(languageList);
      }
    } catch (error) {
      console.error('Error fetching users and languages:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart || 0;
    setCursorPosition(position);

    const lastAtSymbol = newValue.lastIndexOf('@', position);
    if (lastAtSymbol !== -1) {
      const nextSpace = newValue.indexOf(' ', lastAtSymbol);
      const searchEnd = nextSpace === -1 ? newValue.length : nextSpace;
      if (position > lastAtSymbol && position <= searchEnd) {
        setShowMentions(true);
        setMentionSearch(newValue.slice(lastAtSymbol + 1, searchEnd));
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    onChange(newValue);
  };

  const handleMentionClick = (item: User | LanguageCount) => {
    const beforeMention = value.slice(0, value.lastIndexOf('@'));
    const afterMention = value.slice(cursorPosition);
    
    if ('first_name' in item) {
      const newValue = `${beforeMention}@${item.first_name} ${item.last_name}${afterMention}`;
      onChange(newValue);
      if (onMention) {
        onMention(item.id);
      }
    } else {
      const newValue = `${beforeMention}@${item.language}${afterMention}`;
      onChange(newValue);
      if (onLanguageMention) {
        onLanguageMention(item.language);
      }
    }
    setShowMentions(false);
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={handleInputChange}
        className={className}
        placeholder={placeholder}
      />
      {showMentions && (
        <div className="absolute bottom-full left-0 w-full bg-white border rounded-md shadow-lg mb-1 z-50">
          <ScrollArea className="h-[200px]">
            <div className="p-2 space-y-1">
              {users.map((user) => (
                <button
                  key={user.id}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center justify-between"
                  onClick={() => handleMentionClick(user)}
                >
                  <span>
                    {user.first_name} {user.last_name}
                    {user.isAdmin && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </button>
              ))}
              
              {isAdmin && languages.map((lang) => (
                <button
                  key={lang.language}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center justify-between"
                  onClick={() => handleMentionClick(lang)}
                >
                  <span className="flex items-center">
                    <Languages className="h-4 w-4 mr-2 text-gray-500" />
                    {lang.language}
                  </span>
                  <span className="text-xs text-gray-500">
                    {lang.count} interpreter{lang.count !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
              
              {users.length === 0 && languages.length === 0 && (
                <div className="text-center text-gray-500 py-2">
                  No results found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};