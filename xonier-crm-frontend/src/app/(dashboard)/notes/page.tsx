"use client";

import React, { JSX, useState, useEffect, FormEventHandler, SubmitEvent } from "react";
import { TbNotes } from "react-icons/tb";
import { FaRegStar, FaStar } from "react-icons/fa";
import { MdDelete, MdClose } from "react-icons/md";
import { BsPinAngle, BsPinAngleFill } from "react-icons/bs";
import SecondaryButton from "@/src/components/ui/SecondaryButton";
import { MdOutlineNoteAlt } from "react-icons/md";
import { Note, NoteCreatePayload } from "@/src/types/note/note.types";
import extractErrorMessages from "../../utils/error.utils";
import axios from "axios";
import NoteService from "@/src/services/notes.service";
import Pagination from "@/src/components/common/pagination";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import { NotesEntities, NoteVisibility } from "@/src/constants/enum";
import Input from "@/src/components/ui/Input";
import Select from "@/src/components/ui/Select";
import { RiGitRepositoryPrivateLine, RiGitRepositoryPrivateFill } from "react-icons/ri";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";

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
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      onClick={() => onClick(note)}
      className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:scale-105 transition-all hover:shadow-[0_0_20px_#00000020] duration-300 cursor-pointer group overflow-hidden"
    >
      {note.byAdmin && (
        <div className="absolute -right-10 top-6 w-40 bg-blue-600 text-white text-xs font-semibold py-1 text-center transform rotate-45 shadow-md z-10">
          BY ADMIN
        </div>
      )}

      {note.isPinned && (
        <div className="absolute top-3 left-3 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <BsPinAngleFill className="w-3 h-3" />
          Pinned
        </div>
      )}

      <div className={`${note.isPinned ? "mt-8" : "mt-0"}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 pr-8">
          {note.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
          {note.content}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(note.createdAt)}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              by {note.createdBy.firstName} {note.createdBy.lastName}
            </span>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin(note.id);
              }}
              className="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 transition-colors"
              title={note.isPinned ? "Unpin note" : "Pin note"}
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
              className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
              title="Delete note"
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
                  Pinned
                </span>
              )}
              {note.byAdmin && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                  BY ADMIN
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
                Created By
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {note.createdBy.firstName} {note.createdBy.lastName}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                Created At
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(note.createdAt)}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                Visibility
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {note.visibility}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                Status
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
                Unpin
              </>
            ) : (
              <>
                <BsPinAngle className="w-4 h-4" />
                Pin
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
            Delete
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
  const [formData, setFormData] = useState<NoteCreatePayload>({
    title: "",
    content: "",
    entityType: NotesEntities.GENERAL,
    visibility: NoteVisibility.PUBLIC,
    isPinned: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const entityOptions = [
    { label: "General", value: NotesEntities.GENERAL },
    { label: "Lead", value: NotesEntities.LEAD },
    { label: "Deal", value: NotesEntities.DEAL },
    { label: "Quotation", value: NotesEntities.QUOTATION },
    { label: "invoice", value: NotesEntities.INVOICE },
  ];

  const visibilityOptions = [
    { label: "Public", value: NoteVisibility.PUBLIC },
    { label: "Private", value: NoteVisibility.PRIVATE },
  ];

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await NoteService.create(formData);

      if (result.status === 201) {
        toast.success(`${formData.title} note created successfully`);
        setFormData({
          title: "",
          content: "",
          entityType: NotesEntities.GENERAL,
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
    setFormData({
      title: "",
      content: "",
      entityType: NotesEntities.GENERAL,
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
            Create New Note
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
            label="Note Title"
            type="text"
            placeholder="Enter note title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
          />

          <Input
            label="Note Content"
            type="textarea"
            placeholder="Enter note content"
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Entity Type"
              options={entityOptions}
              value={formData.entityType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  entityType: e.target.value as NotesEntities,
                })
              }
              placeholder="Select entity type"
            />

            <Select
              label="Visibility"
              options={visibilityOptions}
              value={formData.visibility}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  visibility: e.target.value as NoteVisibility,
                })
              }
              placeholder="Select visibility"
            />
          </div>

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
              Pin this note
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <MdOutlineNoteAlt className="w-4 h-4" />
                  Create Note
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
      toast.error("Failed to update pin status");
    }
  };

  const handleDeleteNote = async (id: string, name:string) => {
    

    try {
      const confirm = await ConfirmPopup({title: "Are you sure", text: `Are sure sure to delete ${name}`, btnTxt: "Yes, delete"})
      if (confirm){
        setNotesData((prev) => prev.filter((note) => note.id !== id));
      setPrivateNotesData((prev) => prev.filter((note) => note.id !== id));
      toast.success("Note deleted successfully");
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
    <div className={`ml-72 mt-14 p-6 min-h-screen`}>
      <div className="flex w-full flex-col gap-6">
        <div>
          <h2 className="text-slate-900 dark:text-white font-bold text-4xl mb-2">
            Notes
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and organize your notes
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
          <ul className="flex items-center gap-3">
            <li
              className={`${
                active === ACTIVE.ALL
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              } px-5 py-2.5 cursor-pointer flex items-center gap-2 capitalize rounded-lg transition-all duration-200 text-sm font-medium`}
              onClick={() => handleActive(ACTIVE.ALL)}
            >
              <TbNotes className="w-4 h-4" />
              All notes
             
            </li>
            <li
              className={`${
                active === ACTIVE.IMPORTANT
                  ? "bg-amber-600 text-white shadow-lg "
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              } px-5 py-2.5 cursor-pointer flex items-center gap-2 capitalize rounded-lg text-sm transition-all duration-200 font-medium`}
              onClick={() => handleActive(ACTIVE.IMPORTANT)}
            >
              {active === ACTIVE.IMPORTANT ? (
                <FaStar className="w-4 h-4" />
              ) : (
                <FaRegStar className="w-4 h-4 text-amber-500" />
              )}
              Pinned notes
              
            </li>
            <li
              className={`${
                active === ACTIVE.PRIVATE
                  ? "bg-green-600 text-white shadow-lg "
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              } px-5 py-2.5 cursor-pointer flex items-center gap-2 capitalize rounded-lg text-sm transition-all duration-200 font-medium`}
              onClick={() => handleActive(ACTIVE.PRIVATE)}
            >
              {active === ACTIVE.PRIVATE ? (
                <RiGitRepositoryPrivateFill className="w-4 h-4" />
              ) : (
                <RiGitRepositoryPrivateLine className="w-4 h-4 text-green-500" />
              )}
              Private notes
             
            </li>
          </ul>
          <div className="flex items-center gap-3">
            <select
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <option value={6}>6 per page</option>
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
            </select>
            <SecondaryButton
              text="Add Notes"
              onClickEvt={handlePopup}
              icon={<MdOutlineNoteAlt />}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5"
              >
                <Skeleton height={24} className="mb-3" />
                <Skeleton count={3} className="mb-2" />
                <Skeleton width={120} height={20} />
              </div>
            ))}
          </div>
        ) : displayNotes.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <h3 className="text-xl font-semibold mb-2">No notes found</h3>
            <p className="text-sm">
              {active === ACTIVE.IMPORTANT
                ? "You don't have any pinned notes yet"
                : active === ACTIVE.PRIVATE
                ? "You don't have any private notes yet"
                : "Start by creating your first note"}
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