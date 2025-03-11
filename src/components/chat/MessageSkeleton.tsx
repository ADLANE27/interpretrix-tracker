
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export const MessageSkeleton = () => {
  return (
    <div className="flex gap-4 items-start mb-4 animate-fade-in">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className="h-16 w-[80%]" />
      </div>
    </div>
  );
};

export const MessageSkeletonList = () => {
  return (
    <div className="space-y-6 py-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  );
};
