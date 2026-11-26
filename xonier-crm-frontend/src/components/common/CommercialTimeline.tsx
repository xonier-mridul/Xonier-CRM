"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import api from "@/src/lib/axios";
import NoteService from "@/src/services/notes.service";
import { NotesEntities, NoteVisibility } from "@/src/constants/enum";
import extractErrorMessages from "@/src/app/utils/error.utils";
import ContentShimmer from "@/src/components/common/ContentShimmer";

type Item = { id: string; at: string; kind: string; title: string; detail: string; pending: boolean };
type FilterTab = "all" | "notes" | "tasks" | "comms" | "activity";

const KIND_STYLE: Record<string, { border: string; badge: string; label: string }> = {
  note: {
    border: "border-amber-500",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    label: "NOTE",
  },
  task: {
    border: "border-purple-500",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    label: "TASK",
  },
  task_activity: {
    border: "border-indigo-500",
    badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
    label: "TASK EVENT",
  },
  next_action: {
    border: "border-cyan-500",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
    label: "NEXT ACTION",
  },
  next_action_completed: {
    border: "border-cyan-600",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
    label: "ACTION DONE",
  },
  meeting: {
    border: "border-teal-500",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
    label: "MEETING",
  },
  call: {
    border: "border-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    label: "CALL",
  },
  email: {
    border: "border-blue-500",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    label: "EMAIL",
  },
  activity: {
    border: "border-slate-400",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    label: "ACTIVITY",
  },
};

export default function CommercialTimeline({
  entityType,
  entityId,
}: {
  entityType: "lead" | "deal";
  entityId: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<NoteVisibility>(NoteVisibility.PUBLIC);
  const [savingNote, setSavingNote] = useState(false);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: Item[] }>(`/next-action/${entityType}/${entityId}/timeline`);
      setItems(response.data.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "notes") return items.filter((i) => i.kind === "note");
    if (filter === "tasks") return items.filter((i) => i.kind === "task" || i.kind === "task_activity");
    if (filter === "comms") {
      return items.filter(
        (i) =>
          i.kind === "next_action" ||
          i.kind === "next_action_completed" ||
          i.kind === "meeting" ||
          i.kind === "call" ||
          i.kind === "email"
      );
    }
    return items.filter((i) => i.kind === "activity");
  }, [filter, items]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = noteTitle.trim();
    const trimmedContent = noteContent.trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 35) {
      toast.error("Note title must be between 3 and 35 characters");
      return;
    }
    if (!trimmedContent) {
      toast.error("Note content is required");
      return;
    }

    setSavingNote(true);
    try {
      const res = await NoteService.create({
        title: trimmedTitle,
        content: trimmedContent,
        entityType: entityType === "lead" ? NotesEntities.LEAD : NotesEntities.DEAL,
        entityId,
        visibility: noteVisibility,
      });
      if (res.status === 200 || res.status === 201) {
        toast.success("Note added to timeline");
        setNoteTitle("");
        setNoteContent("");
        setNoteVisibility(NoteVisibility.PUBLIC);
        setShowNoteForm(false);
        await loadTimeline();
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(`${extractErrorMessages(error)}`);
      } else {
        toast.error("Failed to create note");
      }
    } finally {
      setSavingNote(false);
    }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: `All (${items.length})` },
    { key: "notes", label: `Notes (${items.filter((i) => i.kind === "note").length})` },
    {
      key: "tasks",
      label: `Tasks (${items.filter((i) => i.kind === "task" || i.kind === "task_activity").length})`,
    },
    {
      key: "comms",
      label: `Actions & Calls (${
        items.filter(
          (i) =>
            i.kind === "next_action" ||
            i.kind === "next_action_completed" ||
            i.kind === "meeting" ||
            i.kind === "call" ||
            i.kind === "email"
        ).length
      })`,
    },
    { key: "activity", label: `Activity (${items.filter((i) => i.kind === "activity").length})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                filter === tab.key
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowNoteForm((prev) => !prev)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer"
        >
          {showNoteForm ? "Cancel Note" : "+ Add Note"}
        </button>
      </div>

      {showNoteForm && (
        <form
          onSubmit={handleAddNote}
          className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note Title (3–35 chars)
              </label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g. Pricing call takeaway"
                minLength={3}
                maxLength={35}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Visibility
              </label>
              <select
                value={noteVisibility}
                onChange={(e) => setNoteVisibility(e.target.value as NoteVisibility)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value={NoteVisibility.PUBLIC}>Public</option>
                <option value={NoteVisibility.TEAM}>Team</option>
                <option value={NoteVisibility.PRIVATE}>Private</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Note Content
            </label>
            <textarea
              rows={2}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your note details..."
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNoteForm(false)}
              disabled={savingNote}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingNote}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
            >
              {savingNote ? "Saving..." : "Save Note"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <ContentShimmer rows={3} />
      ) : !filteredItems.length ? (
        <p className="text-sm text-gray-500">No commercial history in this view yet.</p>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const style = KIND_STYLE[item.kind] || {
              border: "border-cyan-500",
              badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
              label: item.kind.toUpperCase(),
            };
            return (
              <div key={item.id} className={`border-l-2 ${style.border} pl-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                    {style.label}
                  </span>
                  {item.pending && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                      PENDING
                    </span>
                  )}
                </div>
                {item.detail && <p className="text-sm text-gray-500 dark:text-gray-300 mt-0.5">{item.detail}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{new Date(item.at).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
