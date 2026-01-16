"use client";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import React, { useState, useEffect, JSX, FormEvent } from "react";
import { PRIORITY, PROJECT_TYPES, SOURCE } from "@/src/constants/enum";
import { User } from "@/src/types";
import axios from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { toast } from "react-toastify";
import { AuthService } from "@/src/services/auth.service";
import Input from "@/src/components/ui/Input";
import FormButton from "@/src/components/ui/FormButton";
import { EnquiryService } from "@/src/services/enquiry.service";

const page = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string[] | string | null>();
  const [usersData, setUsersData] = useState<User[]>([]);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    priority: "",
    projectType: "",
    message: "",
    assignTo: "",
    source: "",
  });

  const getUsers = async () => {
    try {
      const result = await AuthService.getAllActiveWithoutPagination();
      if (result.status === 200) {
        setUsersData(result.data.data);
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
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setIsLoading(true);
    try {
      const result = await EnquiryService.create({
        ...formData,
        priority: formData.priority as PRIORITY,
        projectType: formData.projectType as PROJECT_TYPES,
        source: formData.source as SOURCE,
      });

      if (result.status === 201) {
        toast.success(`${formData.fullName}'s Enquiry registered successfully`)
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          companyName: "",
          priority: "",
          projectType: "",
          message: "",
          assignTo: "",
          source: "",
        });
        setErr(null)
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
  };

  return (
    <div className={`ml-[${SIDEBAR_WIDTH}] mt-14 p-6`}>

      
      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full">
        <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
          Create enquiry
        </h2>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <Input
            label="Full Name"
            placeholder="Enter full name"
            required
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
          />

          <Input
            label="Email"
            type="email"
            placeholder="Enter email address"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />

          <Input
            label="Phone"
            placeholder="Enter phone number"
            required
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />

          <Input
            label="Company Name"
            placeholder="Optional"
            value={formData.companyName}
            onChange={(e) =>
              setFormData({ ...formData, companyName: e.target.value })
            }
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Priority</label>
            <select
              required
              className={`
            w-full px-3 py-2 rounded-md border
            bg-white dark:bg-gray-700  text-black dark:text-white
            border-gray-300 dark:border-gray-300/30
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-500
            ${err ? "border-red-500 focus:ring-red-500" : ""}
            
          `}
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
            >
              <option value="">Select priority</option>
              {Object.values(PRIORITY).map((p) => (
                <option key={p} value={p}>
                  {p.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Project Type</label>
            <select
              required
              className={`
            w-full px-3 py-2 rounded-md border
            bg-white dark:bg-gray-700  text-black dark:text-white
            border-gray-300 dark:border-gray-300/30
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-500
            ${err ? "border-red-500 focus:ring-red-500" : ""}
            
          `}
              value={formData.projectType}
              onChange={(e) =>
                setFormData({ ...formData, projectType: e.target.value })
              }
            >
              <option value="">Select project type</option>
              {Object.values(PROJECT_TYPES).map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ").toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Source</label>
            <select
              required
              className={`
      w-full px-3 py-2 rounded-md border
      bg-white dark:bg-gray-700 text-black dark:text-white
      border-gray-300 dark:border-gray-300/30
      disabled:opacity-60 disabled:cursor-not-allowed
      focus:outline-none focus:ring-2 focus:ring-violet-500
      ${err ? "border-red-500 focus:ring-red-500" : ""}
    `}
              value={formData.source}
              onChange={(e) =>
                setFormData({ ...formData, source: e.target.value })
              }
            >
              <option value="">Select source</option>
              {Object.values(SOURCE).map((src) => (
                <option key={src} value={src}>
                  {src.replace(/_/g, " ").toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Assign To</label>
            <select
              className={`
            w-full px-3 py-2 rounded-md border
            bg-white dark:bg-gray-700  text-black dark:text-white
            border-gray-300 dark:border-gray-300/30
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-500
            ${err ? "border-red-500 focus:ring-red-500" : ""}
            
          `}
              value={formData.assignTo}
              onChange={(e) =>
                setFormData({ ...formData, assignTo: e.target.value })
              }
            >
              <option value="">Unassigned</option>
              {usersData?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1 md:col-span-2 flex flex-col gap-1">
            <label className="text-sm font-medium">Message</label>
            <textarea
              rows={4}
              placeholder="Describe the enquiry..."
              className={`
            w-full px-3 py-2 rounded-md border
            bg-white dark:bg-gray-700  text-black dark:text-white
            border-gray-300 dark:border-gray-300/30
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-500
            ${err ? "border-red-500 focus:ring-red-500" : ""}
            
          `}
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
            />
          </div>
          {err && (
            <div className="col-span-1 md:col-span-2">
              <div className="rounded-md border border-red-500/40 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm text-red-600 dark:text-red-400">
                {Array.isArray(err) ? (
                  <ul className="list-disc pl-4">
                    {err.map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                ) : (
                  err
                )}
              </div>
            </div>
          )}

          <div className="col-span-1 md:col-span-2 flex justify-end">
            <FormButton isLoading={isLoading} type="submit">
              {" "}
              Create Enquiry
            </FormButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default page;
