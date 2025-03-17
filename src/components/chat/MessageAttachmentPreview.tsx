
import React from 'react';
import { File, X, FileText, Image, Film, Music, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from '@/utils/fileUtils';

interface MessageAttachmentPreviewProps {
  file: File;
  onDelete?: () => void;
}

export const MessageAttachmentPreview: React.FC<MessageAttachmentPreviewProps> = ({ 
  file, 
  onDelete 
}) => {
  const getFileIcon = () => {
    const type = file.type.split('/')[0];
    
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Film className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      case 'application':
        if (file.type === 'application/zip' || file.type === 'application/x-rar-compressed') {
          return <Archive className="h-4 w-4" />;
        }
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getPreviewUrl = () => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const previewUrl = getPreviewUrl();
  const truncatedName = file.name.length > 20 ? `${file.name.substring(0, 18)}...` : file.name;
  const fileSize = formatFileSize(file.size);

  return (
    <div className="flex items-center gap-2 bg-accent/40 rounded-md px-2 py-1.5 relative group">
      {previewUrl ? (
        <div className="h-6 w-6 rounded overflow-hidden">
          <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="h-6 w-6 flex items-center justify-center text-muted-foreground">
          {getFileIcon()}
        </div>
      )}
      
      <div className="flex flex-col">
        <span className="text-xs font-medium">{truncatedName}</span>
        <span className="text-[10px] text-muted-foreground">{fileSize}</span>
      </div>
      
      {onDelete && (
        <Button
          onClick={onDelete}
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 rounded-full opacity-70 hover:opacity-100 ml-1"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
