
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { InterpreterListItem } from "./InterpreterListItem";
import type { EmploymentStatus } from "@/types/employment";

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  status: "available" | "unavailable" | "pause" | "busy";
  employment_status: EmploymentStatus;
  languages: string[];
  next_mission_start?: string | null;
  next_mission_duration?: number | null;
}

interface VirtualizedInterpreterListProps {
  interpreters: Interpreter[];
}

export const VirtualizedInterpreterList = ({ interpreters }: VirtualizedInterpreterListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: interpreters.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated height of each interpreter item
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-400px)] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <InterpreterListItem
              interpreter={{
                ...interpreters[virtualItem.index],
                name: `${interpreters[virtualItem.index].first_name} ${interpreters[virtualItem.index].last_name}`
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
