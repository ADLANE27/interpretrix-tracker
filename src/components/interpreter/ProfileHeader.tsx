import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ProfileHeaderProps {
  firstName: string;
  lastName: string;
  status: string;
  profilePictureUrl: string | null;
  onAvatarClick: () => void;
}

const statusConfig = {
  available: { color: "bg-interpreter-available text-white", label: "Disponible" },
  unavailable: { color: "bg-interpreter-unavailable text-white", label: "Indisponible" },
  pause: { color: "bg-interpreter-pause text-white", label: "En pause" },
  busy: { color: "bg-interpreter-busy text-white", label: "En appel" },
};

export const ProfileHeader = ({ 
  firstName, 
  lastName, 
  status, 
  profilePictureUrl, 
  onAvatarClick 
}: ProfileHeaderProps) => {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-12 w-12 cursor-pointer" onClick={onAvatarClick}>
          <AvatarImage src={profilePictureUrl || undefined} alt={`${firstName} ${lastName}`} />
          <AvatarFallback>{getInitials(firstName, lastName)}</AvatarFallback>
        </Avatar>
      </div>
      <div>
        <h2 className="text-2xl font-bold">Bonjour {firstName} {lastName}</h2>
        <Badge className={statusConfig[status as keyof typeof statusConfig].color}>
          {statusConfig[status as keyof typeof statusConfig].label}
        </Badge>
      </div>
    </div>
  );
};