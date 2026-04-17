import { User } from "..";
import { TaskItem } from "./task.types";

export interface SubTaskModel {
  id: string;

  taskId: string | TaskItem;

  title: string;

  isCompleted?: boolean;

  dueDate?: string | Date | null;

  startDate?: string | Date | null;

  completedAt?: string | Date | null;

  completedBy?: User | null;

  actualHours?: number | null;

  createdBy: string | User;

  createdAt?: string | Date;

  updateAt?: string | Date | null;

  order?: number;

  deletedAt?: string | Date | null;
}