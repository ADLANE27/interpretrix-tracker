
import React from 'react';
import { FileText, FileImage, File, Download, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Define translations object if it doesn't exist
const TRANSLATIONS = {
  download: {
    fr: 'Télécharger',
    en: 'Download'
  },
  preview: {
    fr: 'Aperçu',
    en: 'Preview'
  }
};

interface AttachmentProps {
  url: string;
  filename?: string;
  name?: string;  // Added to support both filename and name
  locale?: keyof typeof TRANSLATIONS.download; // Making locale optional with default
}

export const MessageAttachment = ({ url, filename, name, locale = "fr" }: AttachmentProps) => {
  const displayName = filename || name || "File";
  const fileType = displayName.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);
  const isPdf = fileType === 'pdf';

  const handleDownload = () => {
    window.open(url, '_blank');
  };

  if (isImage) {
    return (
      <div className="mt-2 max-w-sm">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-2">
          <div className="flex items-center gap-2 mb-2">
            <FileImage className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium truncate">{displayName}</span>
          </div>
          <img 
            src={url} 
            alt={displayName}
            className="rounded-md max-h-[300px] object-contain"
          />
          <div className="flex justify-end mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-xs"
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
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium truncate flex-1">{displayName}</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(url, '_blank')}
                className="text-xs"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                {TRANSLATIONS.preview[locale]}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-xs"
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
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3">
        <div className="flex items-center gap-2">
          <File className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium truncate flex-1">{displayName}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-xs"
          >
            <Download className="h-4 w-4 mr-1" />
            {TRANSLATIONS.download[locale]}
          </Button>
        </div>
      </div>
    </div>
  );
};
