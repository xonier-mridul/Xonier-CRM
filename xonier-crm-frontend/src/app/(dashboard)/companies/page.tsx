
"use client";

import CompanyViewTable from "@/src/components/pages/companies/CompanyViewTable";
import CompanyService from "@/src/services/company.service";
import { Company, CompanyFilterParams } from "@/src/types/company/company.types";
import React, { useCallback, useEffect, useState } from "react";
import extractErrorMessages from "../../utils/error.utils";
import axios from "axios";
import { toast } from "react-toastify";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";

const CompaniesPage = () => {
  const [companiesData, setCompaniesData] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchVal, setSearchVal] = useState<string>("");
  const [filters, setFilters] = useState<CompanyFilterParams>({});

  const getCompaniesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await CompanyService.getAll({
        page: currentPage,
        limit: pageLimit,
        search: searchVal || undefined,
        ...filters,
      });

      // backend: { statusCode, message, data: { data: Company[], page, totalPages, limit } }

      const payload = res.data.data;
      setCompaniesData(payload.data ?? []);
      setTotalPages(payload.totalPages ?? 1);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        toast.error(`${extractErrorMessages(error)}`);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageLimit, searchVal, filters]);

  useEffect(() => {
    getCompaniesData();
  }, [getCompaniesData]); 

  const handleEdit = (company: Company) => {
    console.log("edit", company);
  };

  const handleDelete = async (companyId: string) => {
    try {
        const confirm = await ConfirmPopup({title: "Are you sure", text: "Are you sure to delete this company", btnTxt: "Yes, Delete"})
        if(confirm){
await CompanyService.softDelete(companyId);
      toast.success("Company deleted");
      getCompaniesData();
        }
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(`${extractErrorMessages(error)}`);
      }
    }
  };

  const handleRestore = async (companyId: string) => {
    try {
      await CompanyService.restore(companyId);
      toast.success("Company restored");
      getCompaniesData();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(`${extractErrorMessages(error)}`);
      }
    }
  };

  const handleSearch = (val: string) => {
    setSearchVal(val);
    setCurrentPage(1);
  };

  const handleFilterChange = (changed: Partial<CompanyFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...changed }));
    setCurrentPage(1);
  };

  const handlePageLimit = (limit: number) => {
    setPageLimit(limit);
    setCurrentPage(1);
  };

  return (
    <div className="mt-10 ml-72 min-h-screen p-6">
      <CompanyViewTable
        companyData={companiesData}
        isLoading={isLoading}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        pageLimit={pageLimit}
        totalPages={totalPages}
        setPageLimit={handlePageLimit}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRestore={handleRestore}
        searchVal={searchVal}
        onSearch={handleSearch}
        filters={filters}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
};

export default CompaniesPage;