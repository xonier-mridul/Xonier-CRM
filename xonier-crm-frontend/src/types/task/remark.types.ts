import { RemarkMessagePayload } from "@/src/services/remark.service";
import { TaskItem } from "@/src/types/task/task.types";
import { ChangeEvent, FormEvent } from "react";

export interface CreateRemarkProps {
  remarkPayload: RemarkMessagePayload;
  task: TaskItem | null;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onCancel: () => void;
  handleAddRemark: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  remarkLoad: boolean;
}