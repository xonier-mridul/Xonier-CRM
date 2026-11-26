"use client";

import React, { JSX, useState, useEffect, useRef, useMemo, FormEventHandler, SubmitEvent } from "react";
import Link from "next/link";
import { TbNotes } from "react-icons/tb";
import { FaRegStar, FaStar } from "react-icons/fa";
import { MdDelete, MdClose, MdSearch, MdKeyboardArrowDown, MdCheck } from "react-icons/md";
import { BsPinAngle, BsPinAngleFill } from "react-icons/bs";
import { MdOutlineNoteAlt } from "react-icons/md";
import { Note, NoteCreatePayload } from "@/src/types/note/note.types";
import extractErrorMessages from "../../utils/error.utils";
import axios from "axios";
import NoteService from "@/src/services/notes.service";
import LeadService from "@/src/services/lead.service";
import dealService from "@/src/services/deal.service";
import Pagination from "@/src/components/common/pagination";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import { NotesEntities, NoteVisibility } from "@/src/constants/enum";
import Input from "@/src/components/ui/Input";
import Select from "@/src/components/ui/Select";
import { RiGitRepositoryPrivateLine, RiGitRepositoryPrivateFill } from "react-icons/ri";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { useTranslation } from "react-i18next";
import { FormatDate } from "@/src/components/common/FormateDate";
import PageHeader from "@/src/components/common/PageHeader";

enum ACTIVE {
  ALL = "all",
  IMPORTANT = "important",
  PRIVATE= "private"
}

const NoteCard = ({
  note,
  onPin,
  onDelete,
  onClick,
}: {
  note: Note;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (note: Note) => void;
}) => {
  const { t } = useTranslation();
 

  return (
    <div
      onClick={() => onClick(note)}
      className="flex h-full cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 sm:p-5"
    >
      <div className="flex flex-1 flex-col">
        {(note.isPinned || note.byAdmin) && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {note.isPinned && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <BsPinAngleFill className="h-3 w-3 text-[#00335F] dark:text-sky-300" />
                {t("pinned")}
              </span>
            )}
            {note.byAdmin && (
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                {t("by_admin")}
              </span>
            )}
          </div>
        )}
        {(note.entityId || (note.entityType && note.entityType !== NotesEntities.GENERAL)) && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {note.entityId && note.entityType === NotesEntities.LEAD ? (
              <Link
                href={`/leads/view/${note.entityId}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Lead: {note.entityName || `#${note.entityId.slice(-6)}`}
              </Link>
            ) : note.entityId && note.entityType === NotesEntities.DEAL ? (
              <Link
                href={`/deals/view/${note.entityId}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Deal: {note.entityName || `#${note.entityId.slice(-6)}`}
              </Link>
            ) : (
              <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {note.entityType}
                {note.entityName ? `: ${note.entityName}` : ""}
              </span>
            )}
          </div>
        )}
        <h3 className="mb-2 line-clamp-2 text-base font-semibold leading-6 text-slate-900 dark:text-white">
          {note.title}
        </h3>
        <p className="mb-5 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {note.content}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {FormatDate(note.createdAt)}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {t("by")} {note.createdBy.firstName} {note.createdBy.lastName}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin(note.id);
              }}
              className="rounded-lg p-2 text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00335F] dark:text-slate-400"
              title={note.isPinned ? "Unpin note" : "Pin note"}
              aria-label={note.isPinned ? "Unpin note" : "Pin note"}
            >
              {note.isPinned ? (
                <BsPinAngleFill className="w-4 h-4" />
              ) : (
                <BsPinAngle className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id);
              }}
              className="rounded-lg p-2 text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 dark:text-slate-400"
              title={t("delete_note")}
              aria-label={t("delete_note")}
            >
              <MdDelete className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NoteDetailModal = ({
  note,
  onClose,
  onPin,
  onDelete,
}: {
  note: Note | null;
  onClose: () => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const { t } = useTranslation();
  if (!note) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/20 bg-opacity-50 z-[150] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              {note.isPinned && (
                <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <BsPinAngleFill className="w-3 h-3" />
                  {t("pinned")}
                </span>
              )}
              {note.byAdmin && (
                <span className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 px-2 py-1 rounded-full text-xs font-medium">
                  {t("by_admin")}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {note.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full hover:rotate-90 hover:text-red-500 cursor-pointer transition-all duration-300"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="prose dark:prose-invert max-w-none mb-6">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {note.content}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                {t("created_by")}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {note.createdBy.firstName} {note.createdBy.lastName}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                {t("created_at")}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(note.createdAt)}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                {t("visibility")}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {note.visibility}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                {t("status")}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {note.status}
              </span>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              onPin(note.id);
              onClose();
            }}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            {note.isPinned ? (
              <>
                <BsPinAngleFill className="w-4 h-4" />
                {t("unpin")}
              </>
            ) : (
              <>
                <BsPinAngle className="w-4 h-4" />
                {t("pin")}
              </>
            )}
          </button>
          <button
            onClick={() => {
              onDelete(note.id);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2"
          >
            <MdDelete className="w-4 h-4" />
            {t("delete")}
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateNoteModal = ({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<NoteCreatePayload>({
    title: "",
    content: "",
    entityType: NotesEntities.GENERAL,
    entityId: "",
    entityName: "",
    visibility: NoteVisibility.PUBLIC,
    isPinned: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entityRecords, setEntityRecords] = useState<{ label: string; value: string }[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");
  const entityDropdownRef = useRef<HTMLDivElement>(null);

  const entityOptions = [
    { label: "General", value: NotesEntities.GENERAL },
    { label: "Lead", value: NotesEntities.LEAD },
    { label: "Deal", value: NotesEntities.DEAL },
    { label: "Quotation", value: NotesEntities.QUOTATION },
    { label: "invoice", value: NotesEntities.INVOICE },
  ];

  const visibilityOptions = [
    { label: "Public", value: NoteVisibility.PUBLIC },
    { label: "Team", value: NoteVisibility.TEAM },
    { label: "Private", value: NoteVisibility.PRIVATE },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (entityDropdownRef.current && !entityDropdownRef.current.contains(event.target as Node)) {
        setEntityDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (formData.entityType !== NotesEntities.LEAD && formData.entityType !== NotesEntities.DEAL) {
      setEntityRecords([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingRecords(true);
      try {
        const searchFilter = entitySearch.trim() ? { search: entitySearch.trim() } : undefined;
        if (formData.entityType === NotesEntities.LEAD) {
          const res = await LeadService.getAll(1, 100, searchFilter);
          const list = res?.data?.data?.data || [];
          if (!cancelled) {
            setEntityRecords(
              list.map((lead: any) => ({
                value: lead.id,
                label: `${lead.fullName || lead.email || "Lead"}${lead.lead_id ? ` (${lead.lead_id})` : ""}`,
              }))
            );
          }
        } else {
          const res = await dealService.getAll(1, 100, searchFilter);
          const list = res?.data?.data?.data || [];
          if (!cancelled) {
            setEntityRecords(
              list.map((deal: any) => ({
                value: deal.id,
                label: `${deal.dealName || "Deal"}${deal.deal_id ? ` (${deal.deal_id})` : ""}`,
              }))
            );
          }
        }
      } catch {
        if (!cancelled) setEntityRecords([]);
      } finally {
        if (!cancelled) setLoadingRecords(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.entityType, isOpen, entitySearch]);

  const filteredEntityRecords = useMemo(() => {
    const q = entitySearch.trim().toLowerCase();
    if (!q) return entityRecords;
    return entityRecords.filter((item) => item.label.toLowerCase().includes(q));
  }, [entityRecords, entitySearch]);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: NoteCreatePayload = {
        ...formData,
        entityId: formData.entityId || undefined,
        entityName: formData.entityName || undefined,
      };
      const result = await NoteService.create(payload);

      if (result.status === 201 || result.status === 200) {
        toast.success(`${formData.title} note created successfully`);
        setEntitySearch("");
        setEntityDropdownOpen(false);
        setFormData({
          title: "",
          content: "",
          entityType: NotesEntities.GENERAL,
          entityId: "",
          entityName: "",
          visibility: NoteVisibility.PUBLIC,
          isPinned: false,
        });
        onCreate();
        onClose();
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(`${messages}`);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEntitySearch("");
    setEntityDropdownOpen(false);
    setFormData({
      title: "",
      content: "",
      entityType: NotesEntities.GENERAL,
      entityId: "",
      entityName: "",
      visibility: NoteVisibility.PUBLIC,
      isPinned: false,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/20 bg-opacity-50 z-[150] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MdOutlineNoteAlt className="w-6 h-6" />
            {t("create_new_note")}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full hover:rotate-90 hover:text-red-500 cursor-pointer transition-all duration-300"
            disabled={isSubmitting}
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label={t("note_title")}
            type="text"
            placeholder={t("enter_note_title")}
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
          />

          <Input
            label={t("note_content")}
            type="textarea"
            placeholder={t("enter_note_content")}
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={t("entity_type")}
              options={entityOptions}
              value={formData.entityType}
              onChange={(e) => {
                setEntitySearch("");
                setEntityDropdownOpen(false);
                setFormData({
                  ...formData,
                  entityType: e.target.value as NotesEntities,
                  entityId: "",
                  entityName: "",
                });
              }}
              placeholder={t("select_entity_type")}
            />

            <Select
              label={t("visibility")}
              options={visibilityOptions}
              value={formData.visibility}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  visibility: e.target.value as NoteVisibility,
                })
              }
              placeholder={t("select_visibility")}
            />
          </div>

          {(formData.entityType === NotesEntities.LEAD || formData.entityType === NotesEntities.DEAL) && (
            <div className="flex flex-col gap-1 w-full relative" ref={entityDropdownRef}>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {formData.entityType === NotesEntities.LEAD ? "Linked Lead" : "Linked Deal"}
              </label>

              <button
                type="button"
                onClick={() => setEntityDropdownOpen((prev) => !prev)}
                className="w-full px-3 py-2.5 rounded-md border text-[14px] bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500 flex items-center justify-between gap-2 text-left cursor-pointer"
              >
                <span className={`truncate ${formData.entityId ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-400"}`}>
                  {formData.entityName ||
                    (loadingRecords
                      ? "Loading records..."
                      : formData.entityType === NotesEntities.LEAD
                      ? "Select or search a lead to link"
                      : "Select or search a deal to link")}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {formData.entityId && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData({ ...formData, entityId: "", entityName: "" });
                      }}
                      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
                      title="Clear selection"
                    >
                      <MdClose className="w-4 h-4" />
                    </span>
                  )}
                  <MdKeyboardArrowDown
                    className={`w-5 h-5 text-gray-500 transition-transform ${entityDropdownOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {entityDropdownOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50">
                    <MdSearch className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      placeholder={
                        formData.entityType === NotesEntities.LEAD
                          ? "Search lead by name or ID..."
                          : "Search deal by name or ID..."
                      }
                      className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                    />
                    {entitySearch && (
                      <button
                        type="button"
                        onClick={() => setEntitySearch("")}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <MdClose className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/40">
                    {loadingRecords ? (
                      <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        Loading...
                      </div>
                    ) : filteredEntityRecords.length === 0 ? (
                      <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No matching {formData.entityType === NotesEntities.LEAD ? "leads" : "deals"} found
                      </div>
                    ) : (
                      filteredEntityRecords.map((item) => {
                        const isSelected = formData.entityId === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                entityId: item.value,
                                entityName: item.label,
                              });
                              setEntityDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-medium"
                                : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60"
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {isSelected && <MdCheck className="w-4 h-4 text-cyan-600 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <input
              type="checkbox"
              id="isPinned"
              checked={formData.isPinned}
              onChange={(e) =>
                setFormData({ ...formData, isPinned: e.target.checked })
              }
              className="w-5 h-5 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 dark:focus:ring-amber-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
            />
            <label
              htmlFor="isPinned"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 cursor-pointer"
            >
              <BsPinAngleFill className="w-4 h-4 text-amber-600" />
              {t("pin_this_note")}
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("creating_2")}
                </>
              ) : (
                <>
                  <MdOutlineNoteAlt className="w-4 h-4" />
                  {t("create_note")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Page = (): JSX.Element => {
  const { t } = useTranslation();
  const [active, setActive] = useState<ACTIVE>(ACTIVE.ALL);
  const [popup, setPopup] = useState<boolean>(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [notesData, setNotesData] = useState<Note[]>([]);
  const [privateNotesData, setPrivateNotesData] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | string[]>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(6);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPrivatePage, setCurrentPrivatePage] = useState<number>(1);
  const [privatePageLimit, setPrivatePageLimit] = useState<number>(6);
  const [totalPrivatePages, setTotalPrivatePages] = useState<number>(1);

  const handleActive = (val: ACTIVE) => {
    setActive(val);
    if (val === ACTIVE.PRIVATE) {
      setCurrentPrivatePage(1);
    } else {
      setCurrentPage(1);
    }
  };

  const handlePopup = () => {
    setPopup(true);
  };

  const getNotesData = async () => {
    setIsLoading(true);
    try {
      const result = await NoteService.getAllActive(currentPage, pageLimit);

      if (result.status === 200) {
        const data = result.data.data;
        setNotesData(data.data);
        setCurrentPage(Number(data.page));
        setPageLimit(Number(data.limit));
        setTotalPages(Number(data.totalPages));
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(`${messages}`);
        toast.error(`${messages}`);
      } else {
        setErr("something went wrong");
        toast.error("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPrivateNotesData = async () => {
    setIsLoading(true);
    try {
      const result = await NoteService.getAllPrivate(currentPrivatePage, privatePageLimit);

      if (result.status === 200) {
        const data = result.data.data;
        setPrivateNotesData(data.data);
        setCurrentPrivatePage(Number(data.page));
        setPrivatePageLimit(Number(data.limit));
        setTotalPrivatePages(Number(data.totalPages));
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(`${messages}`);
        toast.error(`${messages}`);
      } else {
        setErr("something went wrong");
        toast.error("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinNote = async (id: string) => {
    try {
      if (!id) {
        setErr("Note id not found");
        return;
      }

      const result = await NoteService.ChangePinnedStatus(id);

      if (result.status === 200) {

        setNotesData((prev) =>
          prev.map((note) =>
            note.id === id ? { ...note, isPinned: !note.isPinned } : note
          )
        );

        setPrivateNotesData((prev) =>
          prev.map((note) =>
            note.id === id ? { ...note, isPinned: !note.isPinned } : note
          )
        );
        toast.success("Note pin status updated");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(`${messages}`);
      } else {
        toast.error("Something went wrong");
      }
    }
  };

  const handleDeleteNote = async (id: string, name:string) => {
    

    try {
      const {isConfirmed} = await ConfirmPopup({title: t("are_you_sure"),  text: t("deleteConfirmation", { name }), btnTxt: t("yes_delete")})
      if (isConfirmed){
        const result = await NoteService.softDelete(id)
        if(result.status === 200){
  setNotesData((prev) => prev.filter((note) => note.id !== id));
      setPrivateNotesData((prev) => prev.filter((note) => note.id !== id));
      toast.success("Note deleted successfully");
        }
      
      }
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(`${messages}`);
        toast.error(`${messages}`);
      } else {
        setErr("something went wrong");
        toast.error("Something went wrong");
      }
    }
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
  };

  const handleNoteCreated = () => {
    getNotesData();
    getPrivateNotesData();
  };

  const filteredNotes = notesData.filter((note) => {
    if (active === ACTIVE.IMPORTANT) {
      return note.isPinned;
    }
    return true;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const sortedPrivateNotes = [...privateNotesData].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });


  const displayNotes = active === ACTIVE.PRIVATE ? sortedPrivateNotes : sortedNotes;
  const displayCurrentPage = active === ACTIVE.PRIVATE ? currentPrivatePage : currentPage;
  const displayTotalPages = active === ACTIVE.PRIVATE ? totalPrivatePages : totalPages;
  const displayPageLimit = active === ACTIVE.PRIVATE ? privatePageLimit : pageLimit;

  useEffect(() => {
    if (active === ACTIVE.PRIVATE) {
      getPrivateNotesData();
    } else {
      getNotesData();
    }
  }, [currentPage, pageLimit, currentPrivatePage, privatePageLimit, active]);

  return (
    <div className="min-h-screen">
      <div className="flex w-full flex-col gap-6">
        <PageHeader title={t("notes")} description={t("manage_and_organize_your_notes")} icon={<TbNotes className="h-5 w-5" />} />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 sm:p-5">
          <ul className="flex flex-wrap items-center gap-2">
            <li
              className={`${
                active === ACTIVE.ALL
                  ? "bg-[#01728e] text-white"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              } flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium capitalize`}
              onClick={() => handleActive(ACTIVE.ALL)}
            >
              <TbNotes className="w-4 h-4" />
              {t("all_notes")}
             
            </li>
            <li
              className={`${
                active === ACTIVE.IMPORTANT
                  ? "bg-[#01728e] text-white"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              } flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium capitalize`}
              onClick={() => handleActive(ACTIVE.IMPORTANT)}
            >
              {active === ACTIVE.IMPORTANT ? (
                <FaStar className="w-4 h-4" />
              ) : (
                <FaRegStar className="h-4 w-4 text-slate-500" />
              )}
              {t("pinned_notes")}
              
            </li>
            <li
              className={`${
                active === ACTIVE.PRIVATE
                  ? "bg-[#01728e] text-white"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              } flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium capitalize`}
              onClick={() => handleActive(ACTIVE.PRIVATE)}
            >
              {active === ACTIVE.PRIVATE ? (
                <RiGitRepositoryPrivateFill className="w-4 h-4" />
              ) : (
                <RiGitRepositoryPrivateLine className="h-4 w-4 text-slate-500" />
              )}
              {t("private_notes")}
             
            </li>
          </ul>
          <div className="flex items-center gap-3">
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#00335F] focus:ring-2 focus:ring-[#00335F]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              value={displayPageLimit}
              onChange={(e) => {
                if (active === ACTIVE.PRIVATE) {
                  setPrivatePageLimit(Number(e.target.value));
                  setCurrentPrivatePage(1);
                } else {
                  setPageLimit(Number(e.target.value));
                  setCurrentPage(1);
                }
              }}
            >
              <option value={6}>{t("6_per_page")}</option>
              <option value={12}>{t("12_per_page")}</option>
              <option value={24}>{t("24_per_page")}</option>
            </select>
            <button
              type="button"
              onClick={handlePopup}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00335F] px-4 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00335F]"
            >
              <MdOutlineNoteAlt className="h-4 w-4" />
              {t("add_notes")}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 sm:p-5"
              >
                <Skeleton height={24} className="mb-3" />
                <Skeleton count={3} className="mb-2" />
                <Skeleton width={120} height={20} />
              </div>
            ))}
          </div>
        ) : displayNotes.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {displayNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onPin={handlePinNote}
                  onDelete={()=>handleDeleteNote(note.id, note.title)}
                  onClick={handleNoteClick}
                />
              ))}
            </div>

            <Pagination
              currentPage={displayCurrentPage}
              totalPages={displayTotalPages}
              onPageChange={active === ACTIVE.PRIVATE ? setCurrentPrivatePage : setCurrentPage}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
            <TbNotes className="w-20 h-20 mb-4 opacity-30" />
            <h3 className="text-xl font-semibold mb-2">{t("no_notes_found")}</h3>
           <p className="text-sm">
  {active === ACTIVE.IMPORTANT
    ? t("no_pinned_notes_yet")
    : active === ACTIVE.PRIVATE
    ? t("no_private_notes_yet")
    : t("start_by_creating_your_first_note")}
</p>
          </div>
        )}
      </div>

      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onPin={handlePinNote}
          onDelete={()=>handleDeleteNote(selectedNote.id, selectedNote.title)}
        />
      )}

      <CreateNoteModal
        isOpen={popup}
        onClose={() => setPopup(false)}
        onCreate={handleNoteCreated}
      />
    </div>
  );
};

export default Page;
