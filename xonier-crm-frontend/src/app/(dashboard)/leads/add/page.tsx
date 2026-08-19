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
import { useTranslation } from "react-i18next";

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
  "meetingScheduled",
  "meetingTitle",
  "meetingDescription",
  "meetingStart",
  "meetingEnd",
  "meetingLink",
  "meetingPriority",
]);

// Base required fields. Meeting start/end are added dynamically
// (see getDynamicRequiredFields) whenever meetingScheduled === "yes".
const REQUIRED_FIELDS: (keyof LeadPayload)[] = [
  "fullName",
  "email",
  "source",
  "status",
];

// Key used to trigger the "meeting" section. Declared BEFORE EMPTY_FORM
// so we can safely reference it while building the initial form state.
const MEETING_TRIGGER_KEY = "meetingScheduled";

// Canonical value we use internally to represent an affirmative trigger.
const YES_VALUE = "yes";

/**
 * Normalizes any value coming from a dynamically-configured select field
 * (which could be "yes", "Yes", "YES", " yes ", etc.) into a predictable
 * lowercase/trimmed string so comparisons never silently fail just because
 * of casing/whitespace differences configured in the form builder.
 */
const normalizeValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
};

/**
 * Case/whitespace-safe check for whether the meeting trigger is set to
 * "yes". Using this everywhere (instead of a raw `=== "yes"`) fixes the
 * bug where meeting fields (like meetingStart/meetingEnd) would silently
 * stay hidden if the configured option value wasn't the exact lowercase
 * string "yes".
 */
const isMeetingScheduledYes = (
  formData: Record<string, string | number | null>
): boolean => normalizeValue(formData[MEETING_TRIGGER_KEY]) === YES_VALUE;

// Keys that must always render as a datetime-local input, regardless of
// whatever `type` value was saved for them in the form builder. Compared
// in lowercase so slight casing differences never hide the field.
const DATE_TIME_FIELD_KEYS = new Set(["meetingstart", "meetingend"]);

/**
 * Returns the list of required field keys for the CURRENT form state.
 * Meeting start/end become required the moment the user opts into a
 * meeting, so we never send `null`/empty datetimes to the backend
 * (which caused: "Input should be a valid datetime [type=datetime_type]").
 */
const getDynamicRequiredFields = (
  formData: Record<string, string | number | null>
): string[] => {
  const required: string[] = [...REQUIRED_FIELDS];
  if (isMeetingScheduledYes(formData)) {
    required.push("meetingStart", "meetingEnd");
  }
  return required;
};

/**
 * Converts a raw `datetime-local` input value (e.g. "2025-06-15T14:30")
 * into a full ISO-8601 string (e.g. "2025-06-15T14:30:00.000Z") so the
 * backend's Pydantic datetime validator always receives a well-formed
 * value instead of a partial/ambiguous string.
 */
const toISODateTime = (value: string | number | null): string | number | null => {
  if (value === null || value === undefined || value === "") return value;
  const date = new Date(value as string);
  return isNaN(date.getTime()) ? value : date.toISOString();
};

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
  // Meeting trigger always defaults to "no" until user explicitly opts in.
  meetingScheduled: "no",
  meetingTitle: null,
  meetingDescription: null,
  meetingStart: null,
  meetingEnd: null,
  meetingLink: null,
  meetingPriority: null,
};

/**
 * SECTION CONFIG
 * ----------------------------------------------------
 * Add new sections here as your form grows.
 * `match` decides which fields belong to this section (based on key).
 * `showWhen` (optional) decides whether the whole section's fields
 * should render at all — useful for conditional sections like "meeting".
 *
 * Order in this array = order sections render on the page.
 * Any field that doesn't match any section falls into DEFAULT_SECTION ("basic_details").
 */
type SectionConfig = {
  id: string;
  titleKey: string;
  match: (key: string) => boolean;
  showWhen?: (formData: Record<string, string | number | null>) => boolean;
};

const DEFAULT_SECTION: SectionConfig = {
  id: "basic",
  titleKey: "basic_details",
  match: () => true,
};

const SPECIAL_SECTIONS: SectionConfig[] = [
  {
    id: "meeting",
    titleKey: "meeting_details",
    match: (key) => key === MEETING_TRIGGER_KEY || key.startsWith("meeting"),
    showWhen: (formData) => isMeetingScheduledYes(formData),
  },
  // Example for future extension:
  // {
  //   id: "company",
  //   titleKey: "company_details",
  //   match: (key) => key.startsWith("company"),
  // },
];

// Order sections should appear in. Unlisted sections fall to the end.
const SECTION_ORDER = ["basic", "meeting"];

type GroupedSection = {
  id: string;
  titleKey: string;
  fields: CustomField[];
  showWhen?: SectionConfig["showWhen"];
};

/**
 * Groups fields into sections based on SPECIAL_SECTIONS config.
 * Fields not matching any special section go into DEFAULT_SECTION.
 * The meeting trigger field itself is ALWAYS shown (its `showWhen` only
 * hides sections other than itself — handled during render).
 */
const groupFieldsBySection = (fields: CustomField[]): GroupedSection[] => {
  const sectionMap = new Map<string, GroupedSection>();

  for (const field of fields) {
    const matched = SPECIAL_SECTIONS.find((s) => s.match(field.key));
    const config = matched ?? DEFAULT_SECTION;

    if (!sectionMap.has(config.id)) {
      sectionMap.set(config.id, {
        id: config.id,
        titleKey: config.titleKey,
        fields: [],
        showWhen: config.showWhen,
      });
    }
    sectionMap.get(config.id)!.fields.push(field);
  }

  return Array.from(sectionMap.values()).sort((a, b) => {
    const aIndex = SECTION_ORDER.indexOf(a.id);
    const bIndex = SECTION_ORDER.indexOf(b.id);
    const safeA = aIndex === -1 ? SECTION_ORDER.length : aIndex;
    const safeB = bIndex === -1 ? SECTION_ORDER.length : bIndex;
    return safeA - safeB;
  });
};

const page = (): JSX.Element => {
  const { t } = useTranslation();
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

  /**
   * Checks whether any actual "meeting detail" fields (other than the
   * yes/no trigger itself) have been configured/selected in the form
   * builder. If none exist, there is nothing to fill in even if the
   * user says "yes" to a meeting — so we send them to configure the
   * form first instead of letting them submit an incomplete lead.
   */
  const hasConfiguredMeetingFields = (): boolean => {
    return userFormField.some(
      (field) => field.key !== MEETING_TRIGGER_KEY && field.key.startsWith("meeting")
    );
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === MEETING_TRIGGER_KEY && normalizeValue(value) === YES_VALUE) {
      if (!hasConfiguredMeetingFields()) {
        toast.info(t("please_add_meeting_fields_first"));
        router.push("/leads/update-form");
        return;
      }
    }

    setFlatFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    getFormFields();
  }, []);

  // Splits flatFormData into known LeadPayload fields and dynamic extraFields.
  // Empty/null OPTIONAL values are dropped entirely so we never send an
  // empty string for enum-type fields (priority, language, industry, etc.)
  // which the backend rejects. Meeting start/end are normalized to full
  // ISO datetimes and treated as REQUIRED whenever meetingScheduled==="yes"
  // so we never send `null` for them (which caused the Pydantic
  // "Input should be a valid datetime" error).
  const buildPayload = (): LeadPayload => {
    const knownFields: Record<string, unknown> = {};
    const extraFields: Record<string, string | number | boolean | null> = {};
    const requiredFields = getDynamicRequiredFields(flatFormData);

    for (const [key, rawValue] of Object.entries(flatFormData)) {
      let value = rawValue;

      // Normalize meeting datetimes to full ISO strings.
      if (key === "meetingStart" || key === "meetingEnd") {
        value = toISODateTime(value);
      }

      const isEmpty = value === "" || value === null || value === undefined;
      const isRequired = requiredFields.includes(key);

      // Skip empty optional fields so we don't send invalid empty/null values.
      if (isEmpty && !isRequired) {
        continue;
      }

      if (KNOWN_LEAD_KEYS.has(key)) {
        knownFields[key] = value;
      } else {
        extraFields[key] = value as string | number | boolean | null;
      }
    }

    return {
      ...(knownFields as unknown as LeadPayload),
      ...(Object.keys(extraFields).length > 0 ? { extraFields } : {}),
    };
  };

  const isMissingRequiredFields = getDynamicRequiredFields(flatFormData).some(
    (key) => !flatFormData[key]
  );

  // Determines whether an individual field should render.
  // Currently: meeting fields (except the trigger) only show when meetingScheduled === "yes"
  const shouldShowField = (item: CustomField): boolean => {
    const matched = SPECIAL_SECTIONS.find((s) => s.match(item.key));
    if (matched?.showWhen && item.key !== MEETING_TRIGGER_KEY) {
      return matched.showWhen(flatFormData);
    }
    return true;
  };

  const renderField = (item: CustomField) => {
    const fieldValue = flatFormData[item.key] ?? "";
    const lowerKey = item.key.toLowerCase();
    const isDateTimeField = DATE_TIME_FIELD_KEYS.has(lowerKey);

    const inputType = isDateTimeField ? "datetime-local" : item.type;

    // Types that should always render as a plain <Input />.
    const KNOWN_INPUT_TYPES = new Set([
      "text",
      "email",
      "number",
      "phone",
      "date",
      "datetime",
      "datetime-local",
      "time",
      "textarea",
    ]);

    if (item.type === "select") {
      return (
        <Select
          key={item.id}
          name={item.key}
          label={item.name}
          options={item.options ?? []}
          placeholder={item.placeholder ? t(item.placeholder) : t("select")}
          value={String(fieldValue)}
          onChange={handleChange}
          required={item.required}
        />
      );
    }

    if (isDateTimeField || KNOWN_INPUT_TYPES.has(item.type)) {
      // Force meetingStart/meetingEnd to be required whenever a meeting
      // is scheduled, even if the form builder didn't mark them required —
      // this keeps native browser validation + our disabled-submit logic
      // consistent with the backend's hard requirement.
      const forceRequired =
        isDateTimeField && isMeetingScheduledYes(flatFormData) ? true : item.required;

      return (
        <Input
          key={item.id}
          name={item.key}
          type={inputType}
          label={item.name}
          placeholder={item.placeholder ? t(item.placeholder) : ""}
          value={String(fieldValue)}
          onChange={handleChange}
          required={forceRequired}
        />
      );
    }

    // Safety net: never silently drop a configured field just because its
    // saved `type` doesn't match one of the cases above. Fall back to a
    // basic text input instead of returning null so fields never
    // disappear from the form unexpectedly.
    return (
      <Input
        key={item.id}
        name={item.key}
        type="text"
        label={item.name}
        placeholder={item.placeholder ? t(item.placeholder) : ""}
        value={String(fieldValue)}
        onChange={handleChange}
        required={item.required}
      />
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    // Guard: meeting is "yes" but no meeting fields exist in the form
    // config at all — block submission and redirect to configure them.
    if (isMeetingScheduledYes(flatFormData) && !hasConfiguredMeetingFields()) {
      toast.info(t("please_add_meeting_fields_first"));
      router.push("/leads/update-form");
      return;
    }

    // Guard: meeting is "yes" but start/end weren't filled in — block
    // submission client-side instead of letting the backend 500 on a
    // missing datetime.
    if (
      isMeetingScheduledYes(flatFormData) &&
      (!flatFormData.meetingStart || !flatFormData.meetingEnd)
    ) {
      toast.error(t("meeting_start_end_required"));
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const payload = buildPayload();
      console.log("data payload", payload);

      const result = await LeadService.create(payload);

      if (result.status === 201) {
        toast.success(`${flatFormData.fullName} ${t('lead_created_successfully')}`);

        // Reset: clear known fields + any dynamic extra fields
        setFlatFormData((prev) => {
          const reset: Record<string, string | number | null> = { ...EMPTY_FORM };
          for (const key of Object.keys(prev)) {
            if (!KNOWN_LEAD_KEYS.has(key) && key !== MEETING_TRIGGER_KEY) {
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
        toast.error("error in creation")
        setErr(extractErrorMessages(error));
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setLoading(false);
    }
  };

  const sections = groupFieldsBySection(userFormField ?? []);

  return (
    <div className={`ml-72 mt-14 p-6`}>
      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-8 p-6 rounded-xl border-[1px] border-slate-900/10 w-full">
        <div className="flex items-center gap-5 justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold dark:text-white text-slate-900 capitalize">
              {t("create_leads")}
            </h2>
            <p className="text-slate-500 dark:text-slate-300">
              {t("you_can_customize_your_fields_if_you_want_then_click_edit")}
            </p>
          </div>

          <PrimaryButton
            text={userFormData.length <= 0 ? t("create_form_first") : t("edit_form_fields")}
            link="/leads/update-form"
            icon={<GrDocumentUpdate />}
          />
        </div>

        {isMissingRequiredFields && (
          <InformationComponent message={t("mandatory_fields_message")} />
        )}
        {err && <ErrorComponent error={err} />}

        <form onSubmit={handleSubmit} className="flex flex-col gap-10">
          {!isLoading ? (
            userFormField && userFormField.length > 0 ? (
              sections.map((section) => {
                const visibleFields = section.fields.filter(shouldShowField);

                // If a whole section has no visible fields (e.g. meeting section
                // when meetingScheduled !== "yes"), skip rendering it entirely.
                if (visibleFields.length === 0) return null;

                return (
                  <div key={section.id} className="flex flex-col gap-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-600 pb-2">
                      {t(section.titleKey)}
                    </h3>
                    <div className="grid grid-cols-2 gap-8 items-end">
                      {visibleFields.map(renderField)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center flex-col justify-center col-span-2 py-5">
                <Image
                  src={"/images/Cry.gif"}
                  alt={t("cry_img")}
                  height={200}
                  width={200}
                />
                <p>{t("no_form_fields_found_please_select")}</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton height={18} width={100} borderRadius={10} className="animate-pulse" />
                  <Skeleton height={38} width={500} borderRadius={14} className="animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {err && <ErrorComponent error={err} />}

          <FormButton
            className="w-full"
            isLoading={loading}
            disabled={isMissingRequiredFields || loading}
          >
            {t("create_lead")}
          </FormButton>
        </form>
      </div>
    </div>
  );
};

export default page;