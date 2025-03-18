
import React from 'react';
import { FileText, FileImage, File, Download, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { TRANSLATIONS } from "@/constants/languages";

interface AttachmentProps {
  url: string;
  filename: string;
  type?: string; // Added type property to match usage in UnifiedMessageList
  dark?: boolean;  // Added dark property to handle theming
  locale?: keyof typeof TRANSLATIONS.download;
}

export const MessageAttachment = ({ 
  url, 
  filename, 
  type, 
  dark = false,
  locale = "fr" 
}: AttachmentProps) => {
  const fileType = type || filename.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);
  const isPdf = fileType === 'pdf';

  const handleDownload = () => {
    window.open(url, '_blank');
  };

  // Apply dark mode classes conditionally
  const cardClass = dark 
    ? "rounded-lg border bg-primary/10 text-primary-foreground shadow-sm p-2"
    : "rounded-lg border bg-card text-card-foreground shadow-sm p-2";

  const buttonClass = dark
    ? "text-xs text-primary-foreground/80 hover:text-primary-foreground"
    : "text-xs";

  if (isImage) {
    return (
      <div className="mt-2 max-w-sm">
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-2">
            <FileImage className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium truncate">{filename}</span>
          </div>
          <img 
            src={url} 
            alt={filename}
            className="rounded-md max-h-[300px] object-contain"
          />
          <div className="flex justify-end mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className={buttonClass}
            >
              <Download className="h-4 w-4 mr-1" />
              {TRANSLATIONS.download[locale]}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="mt-2">
        <div className={cardClass.replace('p-2', 'p-3')}>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium truncate flex-1">{filename}</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(url, '_blank')}
                className={buttonClass}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                {TRANSLATIONS.preview[locale]}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className={buttonClass}
              >
                <Download className="h-4 w-4 mr-1" />
                {TRANSLATIONS.download[locale]}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className={cardClass.replace('p-2', 'p-3')}>
        <div className="flex items-center gap-2">
          <File className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium truncate flex-1">{filename}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className={buttonClass}
          >
            <Download className="h-4 w-4 mr-1" />
            {TRANSLATIONS.download[locale]}
          </Button>
        </div>
      </div>
    </div>
  );
};
