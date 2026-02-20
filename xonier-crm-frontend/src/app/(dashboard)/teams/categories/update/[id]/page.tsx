"use client";
import React, { JSX, useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { TeamCategoryService } from "@/src/services/teamCategory.service";
import { TeamCategory, TeamCategoryUpdatePayload } from "@/src/types/team/team.types";
import Input from "@/src/components/ui/Input";
import FormButton from "@/src/components/ui/FormButton";
import ErrorComponent from "@/src/components/ui/ErrorComponent";
import Skeleton from "react-loading-skeleton";
import { MdOutlineInfo } from "react-icons/md";
import { IoArrowBack } from "react-icons/io5";
import { GoDotFill } from "react-icons/go";

type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const EMPTY_FORM: TeamCategoryUpdatePayload = {
  name: "",
  description: "",
};

const page = (): JSX.Element => {
  const { id } = useParams();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [err, setErr] = useState<string | string[]>("");
  const [categoryData, setCategoryData] = useState<TeamCategory | null>(null);
  const [formData, setFormData] = useState<TeamCategoryUpdatePayload>(EMPTY_FORM);

  // ── Fetch existing category data ─────────────────────────────
  const fetchCategory = async () => {
    setIsLoading(true);
    try {
      // TeamCategoryService doesn't have getById,
      // so fetch all without pagination and find by id
      const result = await TeamCategoryService.getAllWithoutPagination();
      if (result.status === 200) {
        const all: TeamCategory[] = result.data.data;
        const found = all.find((c) => c.id === id);
        if (!found) {
          toast.error("Category not found");
          router.back();
          return;
        }
        setCategoryData(found);
        setFormData({
          name: found.name ?? "",
          description: found.description ?? "",
        });
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) setErr(extractErrorMessages(error));
      else setErr(["Something went wrong"]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCategory(); }, []);


  const handleChange = (e: ChangeEvent<FormElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setErr("");
    try {
      const result = await TeamCategoryService.update(String(id), formData);
      if (result.status === 200) {
        toast.success(`"${formData.name}" updated successfully`);
        setTimeout(() => router.back(), 1500);
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
      setIsSaving(false);
    }
  };

  const isFormValid = formData.name.trim().length >= 2;

  if (isLoading) {
    return (
      <div className="ml-72 mt-14 p-6">
        <div className=" flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Skeleton width={36} height={36} borderRadius={10} />
            <div className="flex flex-col gap-1">
              <Skeleton width={180} height={24} borderRadius={8} />
              <Skeleton width={120} height={14} borderRadius={6} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton height={42} borderRadius={12} />
            <Skeleton height={100} borderRadius={12} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-72 mt-14 p-6">
      <div className=" flex flex-col gap-6">


        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                Update Category
              </h1>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                {categoryData?.name ? `Editing — ${categoryData.name}` : "Modify category details"}
              </p>
            </div>
          </div>


          {categoryData && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                ${categoryData.isActive
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700/40"
                  : "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 border border-orange-200 dark:border-orange-700/40"
                }`}
            >
              <GoDotFill className="text-[10px]" />
              {categoryData.isActive ? "Active" : "Inactive"}
            </span>
          )}
        </div>

        {err && <ErrorComponent error={err} />}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* ── Info card ── */}
          <div className="bg-white dark:bg-gray-700 rounded-2xl border border-slate-200/80 dark:border-slate-600/50 shadow-sm overflow-hidden">

            {/* Card header strip */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-600/50 bg-slate-50/50 dark:bg-gray-700/50">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <MdOutlineInfo className="text-blue-600 dark:text-blue-400 text-base" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Category Details
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Update the name and description
                </p>
              </div>

              {/* Slug pill — read only, shows current slug */}
              {categoryData?.slug && (
                <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full
                  bg-slate-100 dark:bg-slate-600/50 border border-slate-200 dark:border-slate-500/50">
                  <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono">
                    /{categoryData.slug}
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col gap-5">
              <Input
                label="Category Name"
                name="name"
                placeholder="e.g. Development Team"
                value={formData.name}
                onChange={handleChange}
                required
              />

              {/* Description textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Description
                  <span className="ml-1 text-xs text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description ?? ""}
                  onChange={handleChange}
                  placeholder="Describe what this category is for..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600
                    bg-white dark:bg-gray-600 text-slate-700 dark:text-white
                    placeholder:text-slate-400 dark:placeholder:text-slate-500
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
                    dark:focus:border-blue-500 resize-none text-sm transition-all duration-150"
                />
              </div>

              {/* Read-only meta info */}
              {categoryData && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 dark:bg-gray-600/40 border border-slate-100 dark:border-slate-600/30">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold">
                      Created At
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                      {new Date(categoryData.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        timeZone: "Asia/Kolkata",
                      })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 dark:bg-gray-600/40 border border-slate-100 dark:border-slate-600/30">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold">
                      Last Updated
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                      {categoryData.updatedAt
                        ? new Date(categoryData.updatedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            timeZone: "Asia/Kolkata",
                          })
                        : "—"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer actions ── */}
          <div className="flex items-center justify-between gap-4 py-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 rounded-xl text-sm font-medium
                text-slate-600 dark:text-slate-300
                border border-slate-200 dark:border-slate-600
                hover:bg-slate-100 dark:hover:bg-slate-700
                transition-all duration-150"
            >
              Cancel
            </button>

            <FormButton
              isLoading={isSaving}
              disabled={!isFormValid || isSaving}
            >
              Save Changes
            </FormButton>
          </div>

        </form>
      </div>
    </div>
  );
};

export default page;