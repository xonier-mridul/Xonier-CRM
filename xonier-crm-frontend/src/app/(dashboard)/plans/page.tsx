"use client";

import PlanTable from "@/src/components/pages/plans/PlanTable";
import PlanFormModal from "@/src/components/pages/plans/PlanFormModel";
import { Plan, CreatePlanPayload, UpdatePlanPayload } from "@/src/types/plan/plan.types";
import axios from "axios";
import React, { JSX, useCallback, useEffect, useRef, useState } from "react";
import extractErrorMessages from "../../utils/error.utils";
import { toast } from "react-toastify";
import { PlanService } from "@/src/services/plan.service";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { IoAdd } from "react-icons/io5";

const PlansPage = (): JSX.Element => {
  const [planData, setPlanData] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string[] | string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editTarget, setEditTarget] = useState<Plan | null>(null);
  const [searchVal, setSearchVal] = useState<string>("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getPlanData = useCallback(
    async (search?: string) => {
      setIsLoading(true);
      setErr("");
      try {
        const filters: Record<string, string> = {};
        if (search && search.trim()) filters.search = search.trim();

        const result = await PlanService.getAll(currentPage, pageLimit, filters);

        if (result.status === 200) {
          const data = result.data.data;
          setPlanData(data.data);
          setCurrentPage(data.page);
          setTotalPages(data.totalPages);
          setPageLimit(data.limit);
        }
      } catch (error) {
        process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
        if (axios.isAxiosError(error)) {
          const messages = extractErrorMessages(error);
          setErr(messages);
          toast.error(`${messages}`);
        } else {
          setErr(["Something went wrong"]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, pageLimit]
  );

  useEffect(() => {
    getPlanData(searchVal);
  }, [currentPage, pageLimit]);

  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setCurrentPage(1);
      getPlanData(val);
    }, 400);
  };

  const openCreate = () => {
    setEditTarget(null);
    setIsModalOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditTarget(plan);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditTarget(null);
  };

  const handleCreate = async (payload: CreatePlanPayload | UpdatePlanPayload) => {
    setFormLoading(true);
    try {
      const result = await PlanService.create(payload as CreatePlanPayload);
      if (result.status === 200 || result.status === 201) {
        toast.success("Plan created successfully");
        closeModal();
        getPlanData(searchVal);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(`${messages}`);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (payload: CreatePlanPayload | UpdatePlanPayload) => {
    if (!editTarget) return;
    setFormLoading(true);
    try {
      const result = await PlanService.update(editTarget.id, payload as UpdatePlanPayload);
      if (result.status === 200) {
        toast.success("Plan updated successfully");
        closeModal();
        getPlanData(searchVal);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(`${messages}`);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const confirm = await ConfirmPopup({
        title: "Delete Plan",
        text: "This action cannot be undone. Are you sure you want to delete this plan?",
        btnTxt: "Yes, delete",
      });

      if (!confirm) return;

      const result = await PlanService.delete(id);
      if (result.status === 200) {
        toast.success("Plan deleted successfully");
        getPlanData(searchVal);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(`${messages}`);
      } else {
        toast.error("Something went wrong");
      }
    }
  };

  return (
    <div className="lg:ml-72 mt-14 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Plan Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create and manage subscription plans
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <IoAdd className="text-lg" />
          New Plan
        </button>
      </div>

      <PlanTable
        planData={planData}
        isLoading={isLoading}
        err={err}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        pageLimit={pageLimit}
        totalPages={totalPages}
        setPageLimit={setPageLimit}
        onEdit={openEdit}
        onDelete={handleDelete}
        searchVal={searchVal}
        onSearch={handleSearch}
      />

      <PlanFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={editTarget ? handleUpdate : handleCreate}
        isLoading={formLoading}
        editData={editTarget}
      />
    </div>
  );
};

export default PlansPage;