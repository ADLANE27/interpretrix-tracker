
import React from 'react';
import { MessageAttachmentPreview } from './MessageAttachmentPreview';

interface ChatAttachmentsPreviewProps {
  attachments: File[];
  handleRemoveAttachment: (index: number) => void;
}

export const ChatAttachmentsPreview: React.FC<ChatAttachmentsPreviewProps> = ({
  attachments,
  handleRemoveAttachment
}) => {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {attachments.map((file, index) => (
        <div key={index} className="flex items-center">
          <MessageAttachmentPreview 
            file={file} 
            onDelete={() => handleRemoveAttachment(index)}
          />
        </div>
      ))}
    </div>
  );
};
