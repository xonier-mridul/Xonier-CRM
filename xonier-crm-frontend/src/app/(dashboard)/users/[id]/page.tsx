"use client";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import React, { JSX, useEffect, useState, useCallback } from "react";
import { ParamValue } from "next/dist/server/request/params";
import { useParams } from "next/navigation";
import { User } from "@/src/types";
import extractErrorMessages from "@/src/app/utils/error.utils";
import axios from "axios";
import { AuthService } from "@/src/services/auth.service";
import UserDetail from "@/src/components/pages/users/UserDetail";
import ActivityService, {
  ActivitySummaryFilters,
} from "@/src/services/action.service";
import { Activity, ActivitySummary } from "@/src/types/action/action.types";
import {
  DateRangeFilter,
  SummaryFilter,
} from "@/src/components/pages/users/UserDetail";

const Page = (): JSX.Element => {
  const [userData, setUserData] = useState<User | null>(null);
  const [activityData, setActivityData] = useState<Activity[]>([]);
  const [activitySummeryData, setActivitySummeryData] =
    useState<ActivitySummary | null>(null);
  const [err, setErr] = useState<string[] | string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activityLoading, setActivityLoading] = useState<boolean>(false);
  const [summeryLoading, setSummeryLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [dateRange, setDateRange] = useState<DateRangeFilter | null>(null);
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>({
    groupBy: "month",
  });

  const pageLimit = 20;
  const id: ParamValue = useParams().id;

  
  const getUser = async (userId: ParamValue): Promise<void> => {
    setIsLoading(true);
    setErr(null);
    try {
      const result = await AuthService.getUserById(userId);
      if (result.status === 200) setUserData(result.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      setErr(
        axios.isAxiosError(error)
          ? extractErrorMessages(error)
          : ["Something went wrong"],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivity = useCallback(
    async (
      userId: string,
      page: number,
      range: DateRangeFilter | null,
    ): Promise<void> => {
      setActivityLoading(true);
      try {
        const result = await ActivityService.getByUser(
          userId,
          page,
          pageLimit,
          {
            ...(range?.from && { from: range.from }),
            ...(range?.to && { to: range.to }),
          },
        );
        if (result.status === 200) {
          const { data: actList, pagination } = result.data.data;
          setActivityData(actList);
          setTotalPages(Math.ceil(pagination.total / pagination.limit));
        }
      } catch (error) {
        process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
        setErr(
          axios.isAxiosError(error)
            ? extractErrorMessages(error)
            : ["Something went wrong"],
        );
      } finally {
        setActivityLoading(false);
      }
    },
    [pageLimit],
  );

  const fetchActivitySummary = useCallback(
    async (userId: string, filters: ActivitySummaryFilters): Promise<void> => {
      setSummeryLoading(true);
      try {
        const result = await ActivityService.getSummaryByUser(userId, {
          ...(filters.from && { from: filters.from }),
          ...(filters.to && { to: filters.to }),
          ...(filters.groupBy && { groupBy: filters.groupBy }),
        });
        if (result.status === 200) {
          setActivitySummeryData(result.data.data);
        }
      } catch (error) {
        process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
        setErr(
          axios.isAxiosError(error)
            ? extractErrorMessages(error)
            : ["Something went wrong"],
        );
      } finally {
        setSummeryLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!id) return;
    getUser(id);
    fetchActivity(String(id), 1, null);
    fetchActivitySummary(String(id), { groupBy: "month" });
  }, [id]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    fetchActivity(String(id), page, dateRange);
  };

  const handleDateFilter = (range: DateRangeFilter | null) => {
    setDateRange(range);
    setCurrentPage(1);
    fetchActivity(String(id), 1, range);
  };

  const handleSummaryFilter = (filter: SummaryFilter) => {
    setSummaryFilter(filter);
    fetchActivitySummary(String(id), {
      from: filter.from,
      to: filter.to,
      groupBy: filter.groupBy ?? "month",
    });
  };

  return (
    <div className={`ml-72 mt-14 p-6`}>
      <UserDetail
        userData={userData}
        isLoading={isLoading}
        activityData={activityData}
        activityLoading={activityLoading}
        activitySummary={activitySummeryData}
        summaryLoading={summeryLoading}
        summaryFilter={summaryFilter}
        currentPage={currentPage}
        totalPages={totalPages}
        pageLimit={pageLimit}
        dateRange={dateRange}
        onPageChange={handlePageChange}
        onDateFilter={handleDateFilter}
        onSummaryFilter={handleSummaryFilter}
      />
    </div>
  );
};

export default Page;
