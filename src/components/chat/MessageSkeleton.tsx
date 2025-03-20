
import React from 'react';
import { Skeleton } from "../ui/skeleton";

interface MessageSkeletonProps {
  count?: number;
}

export const MessageSkeleton: React.FC<MessageSkeletonProps> = ({ count = 10 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="animate-pulse space-y-3 py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-16 w-full max-w-[80%] rounded-md" />
      </div>
    ))}
  </>
);
