
import React from 'react';
import { FileText, FileImage, File, Download, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { TRANSLATIONS } from "@/constants/languages";

interface AttachmentProps {
  url: string;
  filename: string;
  locale?: keyof typeof TRANSLATIONS.download; // Making locale optional with default
}

export const MessageAttachment = ({ url, filename, locale = "fr" }: AttachmentProps) => {
  const fileType = filename.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);
  const isPdf = fileType === 'pdf';

  const handleDownload = () => {
    window.open(url, '_blank');
  };

  if (isImage) {
    return (
      <div className="mt-2 max-w-sm">
        <div className="rounded-lg border bg-card text-card-foreground shadow-md p-3">
          <div className="flex items-center gap-2 mb-2">
            <FileImage className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium truncate">{filename}</span>
          </div>
          <img 
            src={url} 
            alt={filename}
            className="rounded-md max-h-[300px] object-contain bg-gray-50"
          />
          <div className="flex justify-end mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
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
        <div className="rounded-lg border bg-card text-card-foreground shadow-md p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium truncate flex-1">{filename}</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(url, '_blank')}
                className="text-sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {TRANSLATIONS.preview[locale]}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-sm"
              >
                <Download className="h-4 w-4 mr-2" />
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
      <div className="rounded-lg border bg-card text-card-foreground shadow-md p-4">
        <div className="flex items-center gap-3">
          <File className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium truncate flex-1">{filename}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {TRANSLATIONS.download[locale]}
          </Button>
        </div>
      </div>
    </div>
  );
};
