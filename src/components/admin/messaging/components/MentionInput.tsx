import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMention?: (userId: string) => void;
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

export const MentionInput = ({
  value,
  onChange,
  onMention,
  className = "",
  placeholder = "Type your message..."
}: MentionInputProps) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    if (showMentions) {
      fetchUsers();
    }
  }, [showMentions, mentionSearch]);

  const fetchUsers = async () => {
    try {
      // First get interpreter profiles
      const { data: interpreters, error: interpreterError } = await supabase
        .from('interpreter_profiles')
        .select('id, first_name, last_name, email')
        .ilike(
          mentionSearch ? 'first_name' : 'id',
          mentionSearch ? `${mentionSearch}%` : '%'
        )
        .limit(5);

      if (interpreterError) throw interpreterError;

      // Then get admin roles
      const { data: adminRoles, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminError) throw adminError;

      const adminIds = new Set(adminRoles?.map(role => role.user_id) || []);

      // Mark interpreters who are also admins
      const usersWithRoles = interpreters?.map(user => ({
        ...user,
        isAdmin: adminIds.has(user.id)
      })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart || 0;
    setCursorPosition(position);

    // Check if we should show mentions
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

  const handleMentionClick = (user: User) => {
    const beforeMention = value.slice(0, value.lastIndexOf('@'));
    const afterMention = value.slice(cursorPosition);
    const newValue = `${beforeMention}@${user.first_name} ${user.last_name}${afterMention}`;
    onChange(newValue);
    setShowMentions(false);
    if (onMention) {
      onMention(user.id);
    }
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
              {users.length === 0 && (
                <div className="text-center text-gray-500 py-2">
                  No users found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};