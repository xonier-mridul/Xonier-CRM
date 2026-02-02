"use client";

import { handleCopy } from "@/src/app/utils/clipboard.utils";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { Badge, Field, InfoCard, LeadSkeleton, MaskEmailField, MaskPhoneField } from "@/src/components/ui/LeadComponent";
import PrimaryButton from "@/src/components/ui/PrimeryButton";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import LeadService from "@/src/services/lead.service";
import { Lead } from "@/src/types/leads/leads.types";
import { MdOutlineEdit } from "react-icons/md";
import axios from "axios";
import { useParams } from "next/navigation";
import React, { JSX, useEffect, useState } from "react";
import { toast } from "react-toastify";

const page = (): JSX.Element => {
  const [err, setErr] = useState<string | string[]>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [leadData, setLeadData] = useState<Lead | null>(null);

  const { id } = useParams();

  

  const getLeadData = async () => {
    setIsLoading(true);
    try {
      const result = await LeadService.getById(id);
      if (result.status === 200) {
        setLeadData(result.data.data);
      }
    } catch (error) {
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
  };

  useEffect(() => {
    getLeadData();
  }, []);

  return (
   <div className={`ml-[${SIDEBAR_WIDTH}] mt-14 p-6`}>
  <div className="max-w-6xl mx-auto flex flex-col gap-6">

    <div className="flex items-center justify-between">
      <div className="flex flex-col gp-3">
        <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 capitalize dark:text-white">
          {leadData?.fullName || "Lead Details"} 
        </h1> <div className="flex items-center gap-3">
        <Badge value={leadData?.priority} type="priority" />
        <Badge value={leadData?.status} type="status" />
      </div></div>
        <p className="text-sm text-gray-500">
          Lead ID: <span className="text-blue-400 hover:cursor-copy" onClick={()=>handleCopy(leadData?.lead_id ? leadData?.lead_id : "text not found")}> {leadData?.lead_id} </span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <PrimaryButton link={`/leads/update/${leadData?.id}`} text="Update Lead" icon={<MdOutlineEdit />}/>
      </div>
    </div>

 
    <div className="grid grid-cols-12 relative gap-6">


      <div className="col-span-8 flex flex-col gap-6">

        <InfoCard title="Contact Information">
          <div className="grid grid-cols-2 gap-6">
            <MaskEmailField label="Email" value={leadData?.email} />
            <MaskPhoneField label="Phone" value={leadData?.phone} />
            <Field label="Company" value={leadData?.companyName} />
            <Field label="City" value={leadData?.city} />
          </div>
        </InfoCard>

        <InfoCard title="Lead Information">
          <div className="grid grid-cols-2 gap-6">
            <Field label="Source" value={<Badge value={leadData?.source} />} />
            <Field label="Project Type" value={<Badge value={leadData?.projectType} />} />
            <Field label="Industry" value={leadData?.industry} />
            <Field label="Language" value={leadData?.language} />
          </div>
        </InfoCard>

        <InfoCard title="Employee Details">
          <div className="grid grid-cols-2 gap-6">
            <Field label="Role" value={leadData?.employeeRole} />
            <Field label="Seniority" value={<Badge value={leadData?.employeeSeniority ?? undefined} />} />
          </div>
        </InfoCard>

        <InfoCard title="Notes">
          <div className="space-y-4">
            <Field label="Message" value={leadData?.message} />
            <Field label="Membership Notes" value={leadData?.membershipNotes} />
          </div>
        </InfoCard>
      </div>

      
      <div className="col-span-4 sticky top-20">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
          <h3 className="text-sm font-semibold mb-4">Lead Meta</h3>

          <div className="space-y-3 text-sm">
            <div>
              <span className="opacity-70">Country</span>
              <div className="font-medium">{leadData?.country ?? "—"}</div>
            </div>

            <div>
              <span className="opacity-70">Postal Code</span>
              <div className="font-medium">{leadData?.postalCode ?? "—"}</div>
            </div>

            <div>
              <span className="opacity-70">Created At</span>
              <div className="font-medium">
                {leadData && new Date(leadData.createdAt).toLocaleString()}
              </div>
            </div>

            <div>
              <span className="opacity-70">Last Updated</span>
              <div className="font-medium">
                {leadData && new Date(leadData.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>

  );
};

export default page;
