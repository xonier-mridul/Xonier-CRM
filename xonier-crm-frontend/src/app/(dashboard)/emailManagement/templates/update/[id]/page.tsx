"use client";

import React, { JSX, useState, FormEvent, useEffect } from "react";
import { toast } from "react-toastify";
import { useRouter, useParams } from "next/navigation";
import Input from "@/src/components/ui/Input";
import FormButton from "@/src/components/ui/FormButton";
import { body } from "framer-motion/client";
// import EmailService from "@/src/services/email/email.service";

const Page = (): JSX.Element => {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [err, setErr] = useState<string[] | string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    privacy: "PUBLIC",
    body: "",
  });

  // Fetch Template By ID
  const fetchTemplate = async () => {
    try {
    //   const res = await EmailService.getById(id);
    const res = {
        data: {
            id: "1",
            name: "Welcome Email",
            subject: "Welcome to our platform",
            privacy: "public",
            template: "Welcome Template",
            body: "Welcome Template",
        },
    }

      if (res?.data) {
        const template = res.data;

        setFormData({
          name: template.name || "",
          subject: template.subject || "",
          privacy: template.privacy || "PUBLIC",
          body: template.body || "",
        });
      }
    } catch (error) {
      toast.error("Failed to load template");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (id) fetchTemplate();
  }, [id]);

  // Update Template
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setIsLoading(true);

    try {
      await EmailService.update(id, formData);

      toast.success("Template updated successfully");
      router.push("/emailManagement/templates");
    } catch (error) {
      setErr(["Something went wrong"]);
      toast.error("Failed to update template");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="ml-72 mt-14 p-6">
        <p className="text-gray-500">Loading template...</p>
      </div>
    );
  }

  return (
    <div className="ml-72 mt-14 p-6">
      <div className="bg-white dark:bg-gray-700 flex flex-col gap-5 p-6 rounded-xl border border-slate-900/10 w-full">

        <h2 className="text-xl font-bold dark:text-white text-slate-900">
          Update Email Template
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">

          <Input
            label="Template Name"
            placeholder="Enter template name"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />

          <Input
            label="Subject"
            placeholder="Enter email subject"
            required
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Privacy</label>
            <select
              className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={formData.privacy}
              onChange={(e) =>
                setFormData({ ...formData, privacy: e.target.value })
              }
            >
              <option value="PRIVATE">Private</option>
              <option value="PUBLIC">Public</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Email Body</label>
            <textarea
              rows={7}
              placeholder="Write email template..."
              className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={formData.body}
              onChange={(e) =>
                setFormData({ ...formData, body: e.target.value })
              }
            />
          </div>

          {err && (
            <div>
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

          <div className="flex justify-end">
            <FormButton isLoading={isLoading} type="submit">
              Update Template
            </FormButton>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Page;