import { EventInput } from "@fullcalendar/core";
import { X, Calendar, Clock, Flag, AlignLeft, Tag } from "lucide-react";

interface ViewEventModalProps {
  open: boolean;
  event: EventInput | null;
  onClose: () => void;
  onDelete: (id:string, title:string)=>Promise<void>;
}
import { MdDeleteOutline } from "react-icons/md";

const ViewEventPopup = ({ open, event, onClose, onDelete }: ViewEventModalProps) => {
  if (!open || !event) return null;

  const { title, start, end, allDay, extendedProps, id } = event as any;


  const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-green-100 text-green-700 border-green-200",
  };


  const eventTypeColors: Record<string, string> = {
    meeting: "bg-blue-500",
    task: "bg-purple-500",
    reminder: "bg-orange-500",
    appointment: "bg-teal-500",
    default: "bg-gray-500",
  };

  const priorityKey = extendedProps?.priority?.toLowerCase() as string;
  const priorityColor = priorityColors[priorityKey] || "bg-gray-100 text-gray-700 border-gray-200";
  
  const eventTypeKey = extendedProps?.eventType?.toLowerCase() as string;
  const eventTypeColor = eventTypeColors[eventTypeKey] || eventTypeColors.default;

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div 
      className="fixed inset-0 z-150 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        <div className={`h-2 ${eventTypeColor}`} />
        
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 break-words capitalize">
                {title}
              </h2>
              <div className="flex flex-wrap gap-2">
                {extendedProps?.eventType && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white ${eventTypeColor}`}>
                    <Tag size={12} />
                    {extendedProps.eventType}
                  </span>
                )}
                {extendedProps?.priority && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${priorityColor}`}>
                    <Flag size={12} />
                    {extendedProps.priority} Priority
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 hover:text-red-500 cursor-pointer dark:hover:bg-gray-700 hover:rotate-90"
              aria-label="Close"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>


        <div className="px-6 py-5 space-y-4">

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <Calendar size={20} className="text-gray-600 dark:text-gray-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(start)}
                </p>
                {!allDay && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {formatTime(start)}
                    {end && ` - ${formatTime(end)}`}
                  </p>
                )}
                {allDay && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    All day event
                  </p>
                )}
              </div>
            </div>

            {end && !allDay && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <Clock size={20} className="text-gray-600 dark:text-gray-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Duration
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {formatDate(end)}
                  </p>
                </div>
              </div>
            )}
          </div>


          {extendedProps?.description && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-700/30 border border-gray-200 dark:border-gray-600">
              <AlignLeft size={20} className="text-gray-600 dark:text-gray-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Description
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                  {extendedProps.description}
                </p>
              </div>
            </div>
          )}
        </div>


        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button className="px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 text-white  bg-red-500 hover:border-r-red-600 dark:hover:bg-red-600 transition-all group duration-200 shadow-sm hover:shadow cursor-pointer" onClick={()=>onDelete(id, title)}><MdDeleteOutline className="text-xl group-hover:scale-105"/> Delete </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewEventPopup;