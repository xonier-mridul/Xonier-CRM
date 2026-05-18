"use client";
import React, { JSX, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plan, CreatePlanPayload, UpdatePlanPayload } from "@/src/types/plan/plan.types";
import axios from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { toast } from "react-toastify";
import { PlanService } from "@/src/services/plan.service";
import PlanViewComponent from "@/src/components/pages/plans/PlanViewComponent";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import PlanFormModal from "@/src/components/pages/plans/PlanFormModel";

const PlanViewPage = (): JSX.Element => {
  const [planData, setPlanData] = useState<Plan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const getDatabyId = useCallback(
    async (): Promise<void> => {
      setLoading(true);
      setPlanData(null);

      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const result = await PlanService.getById(id);

        if (result.status === 200) {
          setPlanData(result.data.data);
        }
      } catch (error) {
        if (process.env.NEXT_PUBLIC_ENV === "development") {
          console.error(error);
        }

        if (axios.isAxiosError(error)) {
          const messages = extractErrorMessages(error);
          toast.error(`${messages}`);
        } else {
          toast.error("Something went wrong");
        }
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    getDatabyId();
  }, [getDatabyId]);

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleUpdate = async (payload: CreatePlanPayload | UpdatePlanPayload) => {
    if (!id) return;

    setFormLoading(true);

    try {
      const result = await PlanService.update(id, payload as UpdatePlanPayload);

      if (result.status === 200) {
        toast.success("Plan updated successfully");
        closeEditModal();
        await getDatabyId();
      }
    } catch (error) {
      if (process.env.NEXT_PUBLIC_ENV === "development") {
        console.error(error);
      }
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

  const handleDelete = async () => {
    try {
      const confirm = await ConfirmPopup({
        title: "Delete Plan",
        text: "This action cannot be undone. Are you sure you want to delete this plan?",
        btnTxt: "Yes, delete",
      });

      if (!confirm) return;

      const result = await PlanService.delete(String(id));
      if (result.status === 200) {
        toast.success("Plan deleted successfully");
        router.back();
      }
    } catch (error) {
      if (process.env.NEXT_PUBLIC_ENV === "development") {
        console.error(error);
      }
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(`${messages}`);
      } else {
        toast.error("Something went wrong");
      }
    }
  };

  return (
    <div className="ml-72 mt-14 flex flex-col gap-6 p-6">
      <PlanViewComponent planData={planData} isLoading={loading} handleEdit={handleEdit} handleDelete={handleDelete} />
      <PlanFormModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSubmit={handleUpdate}
        isLoading={formLoading}
        editData={planData}
      />
    </div>
  );
};

export default PlanViewPage;
