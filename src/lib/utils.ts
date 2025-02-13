
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { zonedTimeToUtc } from 'date-fns-tz'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Renamed from utcToZonedTime to fromZonedTime as per date-fns-tz v3 updates
export function fromZonedTime(date: Date | string | number, timeZone: string): Date {
  return zonedTimeToUtc(date, timeZone)
}
