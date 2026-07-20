import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthService } from "@/src/services/auth.service";
import {
  User,
  TaskDataForUser,
  DateFilterType,
  RatingFilterType,
  OnTimeFilterType,
} from "@/src/types";
import extractErrorMessages from "@/src/app/utils/error.utils";

interface UseUserRatingDataOptions {
  userId: string;
  dateFilter: DateFilterType;
  customStart: string;
  customEnd: string;
  ratingFilter: RatingFilterType;
  onTimeFilter: OnTimeFilterType;
}

export function useUserRatingData({
  userId,
  dateFilter,
  customStart,
  customEnd,
  ratingFilter,
  onTimeFilter,
}: UseUserRatingDataOptions) {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<TaskDataForUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFirstRun = useRef(true);

  const fetchPage = useCallback(
    async (targetPage: number, mode: "initial" | "filter" | "loadMore") => {
      if (dateFilter === "custom" && (!customStart || !customEnd)) return;

      if (mode === "initial") setIsInitialLoading(true);
      else if (mode === "filter") setIsFilterLoading(true);
      else setIsFetchingMore(true);

      try {
        const response = await AuthService.getUserRatingData(userId, {
          page: targetPage,
          limit: 10,
          dateFilter,
          startDate: dateFilter === "custom" ? customStart : undefined,
          endDate: dateFilter === "custom" ? customEnd : undefined,
          ratingFilter,
          onTimeFilter,
        });

        if (response.status === 200) {
          const fetchedUser = response.data.data;
          const taskPayload = fetchedUser.taskData;

          setUser(fetchedUser);
          setTasks((prev) =>
            mode === "loadMore"
              ? [...prev, ...(taskPayload?.data || [])]
              : taskPayload?.data || []
          );
          setTotalPages(taskPayload?.totalPages || 0);
          setTotalTasks(taskPayload?.total || 0);
          setPage(targetPage);
          setError(null);
        }
      } catch (err) {
        const message = axios.isAxiosError(err)
          ? extractErrorMessages(err)[0] || "Failed to load data"
          : "Something went wrong";
        setError(message);
        toast.error(message);
      } finally {
        setIsInitialLoading(false);
        setIsFilterLoading(false);
        setIsFetchingMore(false);
      }
    },
    [userId, dateFilter, customStart, customEnd, ratingFilter, onTimeFilter]
  );

  useEffect(() => {
    if (userId) fetchPage(1, "initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    fetchPage(1, "filter");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, customStart, customEnd, ratingFilter, onTimeFilter]);

  const loadMore = useCallback(() => {
    if (!isFetchingMore && !isInitialLoading && !isFilterLoading && page < totalPages) {
      fetchPage(page + 1, "loadMore");
    }
  }, [fetchPage, isFetchingMore, isInitialLoading, isFilterLoading, page, totalPages]);

  return {
    user,
    tasks,
    page,
    totalPages,
    totalTasks,
    isInitialLoading,
    isFilterLoading,
    isFetchingMore,
    error,
    loadMore,
  };
}