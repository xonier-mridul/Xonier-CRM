"use client";

import { MARGIN_TOP, SIDEBAR_WIDTH, SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";
import React, { JSX, useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { usePermissions } from "@/src/hooks/usePermissions";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { StatusService } from "@/src/services/status.service";
import { StatusPayload, StatusItem } from "@/src/types/task/status.types";
import StatusTable from "@/src/components/pages/task/StatusTable";

const page = (): JSX.Element => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [isPopupShow, setIsPopShow] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | string[] | null>(null);
  const [statusData, setStatusData] = useState<StatusItem[]>([]);
  const [editTarget, setEditTarget] = useState<StatusItem | null>(null);
  const [searchVal, setSearchVal] = useState<string>("");
  const [totalPages, setTotalPages] = useState<number>(1);
  const [category, setCategory] = useState<string>("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState<StatusPayload>({
    name: "",
    description: "",
    color: "#ffffff",
    icon: "⚡",
    category: "",
    isFinal: false,
    order: 0
  });

  const auth = useSelector((state: RootState) => state.auth);
  const { hasPermission } = usePermissions();

  const getAllStatuses = async (): Promise<void> => {
    setErr(null);
    setIsLoading(true);
    try {
      const result = await StatusService.getAll({
        currentPage,
        pageLimit,
        search: searchVal,
        category
      });

      if (result.status === 200) {
        const data = result.data.data;
        setStatusData(data.data || []);
        setCurrentPage(Number(data.page || 1));
        setPageLimit(Number(data.limit || 10));
        setTotalPages(Number(data.totalPages || 1));
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);

      if (axios.isAxiosError(error)) {
        toast.error("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlepagechange = (page: number): void => {
    const newPage = currentPage + page;
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };
  const handleSearch = (search: string): void => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setSearchVal(search);
      setCurrentPage(1)
    }, 300);
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const handleSubmit = async (): Promise<void> => {
    setIsLoading(true);
    setErr(null);
    try {
      const result = await StatusService.create(formData);
      if (result.status === 201) {
        await getAllStatuses();
        resetForm();
        toast.success("Status created successfully");
        setIsPopShow(false);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        toast.error(
          axios.isAxiosError(error) && error.response?.data?.message
            ? error.response.data.message
            : "Something went wrong"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Edit / Update ─────────────────────────────────────────────────────────
  const handleEdit = (status: StatusItem): void => {
    setEditTarget(status);

    setFormData({
      name: status.name,
      description: status.description ?? "",
      color: status.color ?? "",
      icon: status.icon ?? "",
      isFinal: status.isFinal ?? false,
      order: status.order ?? 0,
      category:
        typeof status.category === "object"
          ? String(status.category?.id)
          : String(status.category || "")
    });

    setIsPopShow(true);
  };

  const handleUpdate = async (): Promise<void> => {
    if (!editTarget) return;
    setIsLoading(true);
    setErr(null);
    try {
      const result = await StatusService.update(editTarget.id, formData);
      if (result.status === 200) {
        await getAllStatuses();
        resetForm();
        toast.success("Status updated successfully");
        setIsPopShow(false);
        setEditTarget(null);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        toast.error(
          axios.isAxiosError(error) && error.response?.data?.message
            ? error.response.data.message
            : "Something went wrong"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string): Promise<void> => {
    setErr(null);
    setLoading(true);
    try {
      const confirm = await ConfirmPopup({
        title: "Are you sure?",
        text: "Are you sure you want to delete this status?",
        btnTxt: "Yes, Delete",
      });
      if (confirm) {
        const result = await StatusService.delete(id);
        if (result.status === 200) {
          toast.success("Status deleted successfully")
          await getAllStatuses();
        }
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const resetForm = (): void => {
    setFormData({ name: "", description: "", color: "#ffffff", icon: " ⚡", category: "" ,isFinal: false, order: 0});
    setEditTarget(null);
  };

  const handleClosePopup = (): void => {
    setIsPopShow(false);
    resetForm();
  };
  const handleCategory = (category: string): void => {
    setCurrentPage(1)
    setCategory(category);
  };


  
  useEffect(() => {
    getAllStatuses();
  }, [currentPage, pageLimit, searchVal,category]);

  
  return (
    <div className="ml-72 mt-14 ">
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full ">
        <StatusTable
          statusData={statusData}
          currentPage={currentPage}
          pageLimit={pageLimit}
          isLoading={isLoading}
          loading={loading}
          isPopupShow={isPopupShow}
          setIsPopupShow={setIsPopShow}
          formData={formData}
          setFormData={setFormData}
          editTarget={editTarget}
          handleSubmit={handleSubmit}
          handleUpdate={handleUpdate}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          handleClosePopup={handleClosePopup}
          hasPermissions={hasPermission}
          totalPages={totalPages}
          handlepagechange={handlepagechange}
          handleSearch={handleSearch}
          handleCategory={handleCategory}
          err={err}
        />
      </div>
    </div>
  );
};

export default page;