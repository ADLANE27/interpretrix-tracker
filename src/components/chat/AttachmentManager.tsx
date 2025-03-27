
import React, { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface AttachmentManagerProps {
  attachments: File[];
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAttachment: (index: number) => void;
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  attachments,
  handleFileChange,
  handleRemoveAttachment
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-gray-500 hover:text-purple-500 rounded-full"
        onClick={() => fileInputRef.current?.click()}
      >
        <Paperclip className="h-5 w-5" />
      </Button>
      
      {attachments.length > 0 && (
        <div className="mt-2 space-y-1.5 px-1">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center gap-2 text-sm py-1.5 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 hover:text-red-500 px-2"
                onClick={() => handleRemoveAttachment(index)}
              >
                Supprimer
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
