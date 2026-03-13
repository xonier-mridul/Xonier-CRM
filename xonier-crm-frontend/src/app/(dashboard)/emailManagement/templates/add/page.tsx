"use client";

import React, { JSX, useState, FormEvent } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Input from "@/src/components/ui/Input";
import FormButton from "@/src/components/ui/FormButton";
import { FaRobot } from "react-icons/fa";

const Page = (): JSX.Element => {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [err, setErr] = useState<string[] | string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    privacy: "PUBLIC",
    aiPrompt: "",
    body: "",
  });
  const TEMPLATE_VARIABLES = [
    { key: "name", label: "User Name" },
    { key: "email", label: "User Email" },
    { key: "company", label: "Company Name" },
    { key: "phone", label: "Phone Number" },
    { key: "designation", label: "Designation" },
  ];

  const generateWithAI = async () => {
    if (!formData.aiPrompt) {
      toast.error("Please enter AI prompt");
      return;
    }

    setIsGenerating(true);
    const availableVariables = TEMPLATE_VARIABLES
      .map((v) => `{{${v.key}}}`)
      .join(", ");
    const preparedPrompt = `
          Generate a professional email template based on the following instruction:
           "${formData.aiPrompt}".

          Rules:
          1. Use a clear and professional tone.
          2. Structure the email with greeting, main message, and closing.
          3. Only use the following dynamic variables if needed: ${availableVariables}.
          4. Dynamic variables must be written exactly in this format: {{variable}}.
          5. Do NOT create variables outside the provided list.
          6. Keep the template reusable for different users.
          7. Return only the email body text (no explanation).

          Example greeting: Hello {{name}},
          Example closing: Best Regards.
          `;
    setTimeout(() => {
      setFormData({
        ...formData,
        body: preparedPrompt,
      });

      toast.success("Template generated using AI");
      setIsGenerating(false);
    }, 1200);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success("Email template created successfully");

      setFormData({
        name: "",
        subject: "",
        privacy: "PRIVATE",
        aiPrompt: "",
        body: "",
      });
    } catch (error) {
      setErr(["Something went wrong"]);
      toast.error("Failed to create template");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ml-72 mt-14 p-6">
      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border border-slate-900/10 w-full">

        <h2 className="text-xl font-bold dark:text-white text-slate-900 capitalize">
          Create Email Template
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
            <label className="text-sm font-medium">AI Prompt</label>
            <textarea
              rows={3}
              placeholder="Describe what email AI should generate..."
              className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={formData.aiPrompt}
              onChange={(e) =>
                setFormData({ ...formData, aiPrompt: e.target.value })
              }
            />
          </div>

          <button
            type="button"
            onClick={generateWithAI}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md w-fit"
          >
            <FaRobot />
            {isGenerating ? "Generating..." : "Generate With AI"}
          </button>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Email Body</label>
            <textarea
              rows={7}
              placeholder="Write email template..."
              className={`w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500 ${err ? "border-red-500 focus:ring-red-500" : ""
                }`}
              value={formData.body}
              onChange={(e) =>
                setFormData({ ...formData, body: e.target.value })
              }
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Use dynamic variables inside <span className="font-mono text-purple-600">{"{{variable}}"}</span>.
              These values will be automatically replaced with data from the database when the email is sent.
              Example: <span className="font-mono">{"{{name}}"}</span>,
              <span className="font-mono">{"{{email}}"}</span>,
              <span className="font-mono">{"{{company}}"}</span>.
            </p>
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
              Create Template
            </FormButton>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Page;