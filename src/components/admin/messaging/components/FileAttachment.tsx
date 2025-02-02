import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface FileAttachmentProps {
  url: string;
  name: string;
}

export const FileAttachment = ({ url, name }: FileAttachmentProps) => {
  return (
    <div className="flex items-center gap-2 mt-2">
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={() => window.open(url, '_blank')}
      >
        <Download className="h-4 w-4 mr-2" />
        {name}
      </Button>
    </div>
  );
};