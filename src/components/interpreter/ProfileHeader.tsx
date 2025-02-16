
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProfileHeaderProps {
  firstName: string;
  lastName: string;
  status: "available" | "unavailable" | "pause" | "busy";
  profilePictureUrl?: string | null;
  onAvatarClick?: () => void;
  onDeletePicture?: () => void;
}

export const ProfileHeader = ({
  firstName,
  lastName,
  status,
  profilePictureUrl,
  onAvatarClick,
  onDeletePicture,
}: ProfileHeaderProps) => {
  const [isHovering, setIsHovering] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-interpreter-available";
      case "unavailable":
        return "bg-interpreter-unavailable";
      case "pause":
        return "bg-interpreter-pause";
      case "busy":
        return "bg-interpreter-busy";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar
          className="h-16 w-16 cursor-pointer"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onClick={onAvatarClick}
        >
          <AvatarImage src={profilePictureUrl || undefined} />
          <AvatarFallback>
            {firstName?.[0]}
            {lastName?.[0]}
          </AvatarFallback>
          {isHovering && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <Camera className="h-6 w-6 text-white" />
            </div>
          )}
        </Avatar>
        {profilePictureUrl && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={onAvatarClick}>
                <Camera className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDeletePicture}>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="flex flex-col items-start">
        <div className="text-xl font-semibold">
          {firstName} {lastName}
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${getStatusColor(status)}`}
          ></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {status === "available" && "Disponible"}
            {status === "unavailable" && "Indisponible"}
            {status === "pause" && "En pause"}
            {status === "busy" && "En appel"}
          </span>
        </div>
      </div>
    </div>
  );
};
