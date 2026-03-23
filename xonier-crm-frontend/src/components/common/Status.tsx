import { stat } from "fs"

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize justify-center text-center
      ${status === "new" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      : status === "contacted" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
        : status === "qualified" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
          : status === "proposal" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
            : status === "won" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : status === "lost" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                : status === "deleted" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : status === "accepted" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      : status === "expired" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                        : status === "draft" ? "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
                          : status === "viewed" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : status === "sent" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                              : status === "connected" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                : status === "not_connected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                  : status === "interested" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                    : status === "not_interested" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                      : status === "not_reached" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                        : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"}`}>
    {status}
  </span>

);
export default StatusBadge;