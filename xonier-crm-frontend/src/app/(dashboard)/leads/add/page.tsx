"use client";
import extractErrorMessages from "@/src/app/utils/error.utils";
import FormButton from "@/src/components/ui/FormButton";
import Input from "@/src/components/ui/Input";
import PrimaryButton from "@/src/components/ui/PrimeryButton";
import Select from "@/src/components/ui/Select";
import LeadService from "@/src/services/lead.service";
import { UserFormService } from "@/src/services/userForm.service";
import { LeadPayload } from "@/src/types/leads/leads.types";
import { CustomField, UserForm } from "@/src/types/userForm/userForm.types";
import axios from "axios";
import React, { JSX, useState, useEffect, FormEvent, ChangeEvent } from "react";
import { GrDocumentUpdate } from "react-icons/gr";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import InformationComponent from "@/src/components/ui/InformationComponent";
import ErrorComponent from "@/src/components/ui/ErrorComponent";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SALES_STATUS } from "@/src/constants/enum";


const KNOWN_LEAD_KEYS = new Set([
  "fullName",
  "email",
  "phone",
  "priority",
  "source",
  "projectType",
  "status",
  "companyName",
  "city",
  "country",
  "postalCode",
  "language",
  "industry",
  "employeeRole",
  "employeeSeniority",
  "message",
  "membershipNotes",
]);

const REQUIRED_FIELDS: (keyof LeadPayload)[] = [
  "fullName",
  "email",
  "phone",
  "priority",
  "source",
  "projectType",
  "status",
];

const EMPTY_FORM: Record<string, string | number | null> = {
  fullName: "",
  email: "",
  phone: "",
  priority: "",
  source: "",
  projectType: "",
  status: SALES_STATUS.NEW,
  companyName: "",
  city: "",
  country: null,
  postalCode: null,
  language: null,
  industry: null,
  employeeRole: "",
  employeeSeniority: null,
  message: null,
  membershipNotes: null,
};

const page = (): JSX.Element => {
  const [err, setErr] = useState<string | string[]>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [userFormData, setUserFormData] = useState<UserForm[]>([]);
  const [userFormField, setUserFormField] = useState<CustomField[]>([]);

  // Single flat map for ALL fields (known + dynamic extra).
  // On submit we split them apart before sending to the API.
  const [flatFormData, setFlatFormData] = useState<Record<string, string | number | null>>(
    EMPTY_FORM
  );

  const router = useRouter();

  const getFormFields = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await UserFormService.getAllLead();
      if (result.status === 200) {
        setUserFormData(result.data.data);
        setUserFormField(result.data.data.selectedFormFields);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        setErr(extractErrorMessages(error));
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFlatFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    getFormFields();
  }, []);

  // Splits flatFormData into known LeadPayload fields and dynamic extraFields
  const buildPayload = (): LeadPayload => {
    const knownFields: Record<string, unknown> = {};
    const extraFields: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(flatFormData)) {
      if (KNOWN_LEAD_KEYS.has(key)) {
        knownFields[key] = value;
      } else {
        extraFields[key] = value;
      }
    }

    return {
      ...(knownFields as unknown as LeadPayload),
      ...(Object.keys(extraFields).length > 0 ? { extraFields } : {}),
    };
  };

  const isMissingRequiredFields = REQUIRED_FIELDS.some(
    (key) => !flatFormData[key]
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setErr("");

    try {
      const payload = buildPayload();
      const result = await LeadService.create(payload);

      if (result.status === 201) {
        toast.success(`${flatFormData.fullName} lead created successfully`);

        // Reset: clear known fields + any dynamic extra fields
        setFlatFormData((prev) => {
          const reset: Record<string, string | number | null> = { ...EMPTY_FORM };
          for (const key of Object.keys(prev)) {
            if (!KNOWN_LEAD_KEYS.has(key)) {
              reset[key] = "";
            }
          }
          return reset;
        });

        setTimeout(() => {
          router.push("/leads");
        }, 2000);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        setErr(extractErrorMessages(error));
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`ml-72 mt-14 p-6`}>
      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-8 p-6 rounded-xl border-[1px] border-slate-900/10 w-full">
        <div className="flex items-center gap-5 justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold dark:text-white text-slate-900 capitalize">
              Create Leads
            </h2>
            <p className="text-slate-500 dark:text-slate-300">
              You can customize your fields, if you want then click edit form
              field button
            </p>
          </div>

          <PrimaryButton
            text={userFormData.length <= 0 ? "Create form first" : "Edit Form Fields"}
            link="/leads/update-form"
            icon={<GrDocumentUpdate />}
          />
        </div>

        {isMissingRequiredFields && (
          <InformationComponent message="Full Name, Email, Phone, Source, Priority, Project Type and Status fields are mandatory" />
        )}
        {err && <ErrorComponent error={err} />}

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8">
          {!isLoading ? (
            userFormField && userFormField.length > 0 ? (
              userFormField.map((item) => {
                const fieldValue = flatFormData[item.key] ?? "";

                if (
                  item.type === "text" ||
                  item.type === "email" ||
                  item.type === "number"
                ) {
                  return (
                    <Input
                      key={item.id}
                      name={item.key}
                      type={item.type}
                      label={item.name}
                      placeholder={item.placeholder ?? ""}
                      value={fieldValue as string}
                      onChange={handleChange}
                      required={item.required}
                    />
                  );
                }

                if (item.type === "select") {
                  return (
                    <Select
                      key={item.id}
                      name={item.key}
                      label={item.name}
                      options={item.options ?? []}
                      placeholder={item.placeholder ?? "Select"}
                      value={fieldValue as string}
                      onChange={handleChange}
                      required={item.required}
                    />
                  );
                }

                return null;
              })
            ) : (
              <div className="flex items-center flex-col justify-center col-span-2 py-5">
                <Image
                  src={"/images/Cry.gif"}
                  alt="cry img"
                  height={200}
                  width={200}
                />
                <p>No form fields found, please select fields first</p>
              </div>
            )
          ) : (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton height={18} width={100} borderRadius={10} className="animate-pulse" />
                  <Skeleton height={38} width={500} borderRadius={14} className="animate-pulse" />
                </div>
              ))}
            </>
          )}

          <FormButton
            className="col-span-2"
            isLoading={loading}
            disabled={isMissingRequiredFields || loading}
          >
            Create Lead
          </FormButton>
        </form>
      </div>
    </div>
  );
};

export default page;