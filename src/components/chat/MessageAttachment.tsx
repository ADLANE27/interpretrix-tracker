
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageAttachmentProps {
  url: string;
  filename: string;
  locale?: string;
}

export const MessageAttachment = ({ url, filename, locale = 'fr' }: MessageAttachmentProps) => {
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round((bytes / Math.pow(1024, i))) + ' ' + sizes[i];
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-background/95 backdrop-blur-sm border border-border/40 hover:bg-background/90 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium truncate text-foreground" title={filename}>
          {filename}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        asChild
        className="h-10 w-10 p-0"
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download={filename}
          className="inline-flex items-center justify-center"
        >
          <Download className="h-5 w-5" />
        </a>
      </Button>
    </div>
  );
};
