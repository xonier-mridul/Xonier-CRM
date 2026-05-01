import { TimeLogStatus } from "@/src/constants/enum";

export interface TimeSegment {
  startedAt: string;        
  pausedAt?: string | null;
  durationSeconds: number;
}

export interface TaskTimeLog {
  id: string;

  task: string;   
  user: string;   

  status: TimeLogStatus;

  segments: TimeSegment[];

  totalSeconds: number;
  currentSeconds?:number;

  startedAt: string;
  pausedAt?: string | null;
  resumedAt?: string | null;
  stoppedAt?: string | null;

  note?: string | null;

  createdAt: string;
  updatedAt: string;
}


export interface TaskTimerEntry {
  logId: string;
  status: "running" | "paused" | "stopped";
  committedSeconds: number;
  segmentStartedAt: string | null;
  displaySeconds: number;
}

