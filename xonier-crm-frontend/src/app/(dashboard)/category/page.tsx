"use client";

import React, { JSX, useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { usePermissions } from "@/src/hooks/usePermissions";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";

import { CategoryService } from "@/src/services/category.service";
import { CategoryPayload, CategoryItem } from "@/src/types/task/category.types";
import CategoryTable from "@/src/components/pages/task/CategoryTable";
import { get } from "http";


const page = (): JSX.Element => {
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageLimit, setPageLimit] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [isPopupShow, setIsPopShow] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isBlur, setIsBlur] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [err, setErr] = useState<string | string[] | null>(null);
    const [categoryData, setCategoryData] = useState<CategoryItem[]>([]);
    const [editTarget, setEditTarget] = useState<CategoryItem | null>(null);
    const [searchVal, setSearchVal] = useState<string>("");
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const [formData, setFormData] = useState<CategoryPayload>({
        name: "",
        description: "",
        color: "#ffffff",
        icon: "",
        visibility: "personal",
        isDefault: false,
    });

    const { hasPermission } = usePermissions();

    // ── Data fetching ─────────────────────────────────────────────────────────
    const getAllCategories = async (): Promise<void> => {
        setErr(null);
        setIsLoading(true);
        try {
            const result = await CategoryService.getAll({ currentPage, pageLimit, search: searchVal });
            if (result.status === 200) {
                const data = result.data.data;
                setCategoryData(data.data ?? []);
                setCurrentPage(Number(data.page ?? 1));
                setPageLimit(Number(data.limit ?? 10));
                setTotalPages(Number(data.totalPages ?? 1));
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

    // ── Create ────────────────────────────────────────────────────────────────
    const handleSubmit = async (): Promise<void> => {
        setIsLoading(true);
        setErr(null);
        try {
            const result = await CategoryService.create(formData);
            if (result.status === 201) {
                await getAllCategories();
                resetForm();
                toast.success("Category created successfully");
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
    const handleEdit = (category: CategoryItem): void => {
        setEditTarget(category);
        setFormData({
            name: category.name,
            description: category.description ?? "",
            color: category.color ?? "",
            icon: category.icon ?? "",
            visibility: category.visibility ?? "",
            isDefault: category.isDefault ?? false,
        });
        setIsPopShow(true);
    };

    const handleUpdate = async (): Promise<void> => {
        if (!editTarget) return;
        setIsLoading(true);
        setErr(null);
        try {
            const result = await CategoryService.update(editTarget.id, formData);
            if (result.status === 200) {
                await getAllCategories();
                resetForm();
                toast.success("Category updated successfully");
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
        setIsBlur(true)
        try {
            const confirm = await ConfirmPopup({
                title: "Are you sure?",
                text: "Are you sure you want to delete this category?",
                btnTxt: "Yes, Delete",
            });
            if (confirm) {
                const result = await CategoryService.delete(id);
                if (result.status === 200) {
                    toast.success("Category deleted successfully");
                    await getAllCategories();
                }
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
            setIsBlur(false)
            setLoading(false);
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const resetForm = (): void => {
        setFormData({ name: "", description: "", color: "", icon: "", visibility: "personal", isDefault: false });
        setEditTarget(null);
    };

    const handleClosePopup = (): void => {
        setIsPopShow(false);
        resetForm();
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
        }, 300);
    };

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        getAllCategories();
    }, [currentPage, pageLimit, searchVal]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="ml-72 mt-14 relative ">
              {
                isBlur && 
                 <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={handleClosePopup}
            />
            }
            <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full ">
                <CategoryTable
                    categoryData={categoryData}
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
                    isBlur={isBlur}
                    err={err}
                />
            </div>
        </div>
    );
};

export default page;