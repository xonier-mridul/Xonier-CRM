"use client";

import { handleCopy } from "@/src/app/utils/clipboard.utils";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { formatDate } from "@/src/app/utils/date.utils";
import {
    MaskEmailField,
    MaskPhoneField,
} from "@/src/components/ui/LeadComponent";
import { PERMISSIONS, SALES_STATUS } from "@/src/constants/enum";
import { Prospect } from "@/src/types/prospect/prospect.type";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import React, { JSX, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
    MdTimeline,
    MdCategory,
    MdPhoneEnabled,
    MdSms,
    MdMailOutline,
    MdCall,
    MdMessage,
    MdEmail
} from "react-icons/md";
import {
    IoArrowBack,
    IoPersonOutline,
    IoMailOutline,
    IoCallOutline,
    IoBusinessOutline,
    IoLocationOutline,
    IoGlobeOutline,
    IoBriefcaseOutline,
    IoDocumentText,
    IoEllipsisVertical,
    IoDuplicateOutline,
    IoDownloadOutline,
    IoPrintOutline,
    IoCheckmarkCircle,
    IoCalendarOutline,
    IoInformationCircleOutline,
    IoFlagOutline,
    IoStatsChartOutline,
    IoLanguageOutline,
    IoCodeOutline,
    IoClose
} from "react-icons/io5";
import { MdOutlineLeaderboard } from "react-icons/md";
import { FaRegUser, FaIndustry } from "react-icons/fa";
import { usePermissions } from "@/src/hooks/usePermissions";
import Skeleton from "react-loading-skeleton";
import RichEditor from "@/src/components/pages/prospect/RichEditor";
import prospectService from "@/src/services/prospect.service";
import CallModal from "@/src/components/pages/prospect/CallModal";
import { useTranslation } from "react-i18next";

const ProspectViewPage = (): JSX.Element => {
  const { t } = useTranslation();
    const [err, setErr] = useState<string | string[]>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [ProspectData, setProspectData] = useState<Prospect | null>(null);
    const [showCallModal, setShowCallModal] = useState(false);
    const [callPhone, setCallPhone] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"overview" | "contact" | "activity">("overview");
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [showMailModal, setShowMailModal] = useState(false);
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [mailText, setMailText] = useState("");
    const [isCalling, setIsCalling] = useState(false);
    const [ongoingCall, setOngoingCall] = useState(false);
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    const { id } = useParams();
    const router = useRouter();
    const { hasPermission } = usePermissions();

    const getProspectData = async () => {
        setIsLoading(true);
        try {
            const result = await prospectService.getById(id);
            if (result.status === 200) {
                setProspectData(result.data.data);
                setCallPhone(result.data.data.phone);
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
        getProspectData();
    }, []);

    const handleDuplicate = async () => {
        toast.info("Duplicate functionality coming soon");
    };

    const handleDownload = async () => {
        toast.info("Download functionality coming soon");
    };

    const handlePrint = async () => {
        window.print();
    };

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
            medium:
                "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
            low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        };
        return (
            colors[priority] ||
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
        );
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
            contacted:
                "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
            qualified:
                "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
            won: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
            lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
            delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        };
        return (
            colors[status] ||
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
        );
    };

    // const country = COUNTRY_CODE.map((item, value)=>)

    if (isLoading) {
        return (
            <div className="ml-72 mt-14 p-6 flex flex-col gap-6 animate-pulse">
                <Skeleton
                    height={120}
                    borderRadius={12}
                    className="dark:bg-gray-700 w-full"
                />
                <Skeleton
                    height={60}
                    borderRadius={12}
                    className="dark:bg-gray-700 w-full"
                />
                <div className="flex items-start gap-6">
                    <div className="w-2/3 flex flex-col gap-6">
                        <Skeleton
                            height={300}
                            borderRadius={12}
                            className="dark:bg-gray-700 w-full"
                        />
                        <Skeleton
                            height={200}
                            borderRadius={12}
                            className="dark:bg-gray-700 w-full"
                        />
                    </div>
                    <div className="w-1/3">
                        <Skeleton
                            height={400}
                            borderRadius={12}
                            className="dark:bg-gray-700 w-full"
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (!ProspectData) {
        return (
            <div className="ml-72 mt-14 p-6">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <IoPersonOutline className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {t("prospect_not_found")}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {t("the_prospect_you're_looking_for_doesn't")}
                        </p>
                        <button
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <IoArrowBack className="w-5 h-5" />
                            {t("go_back")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Model Functions
    const openCallModal = (phone: string) => {
        setShowCallModal(true);
    };

    const closeCallModal = () => {
        setShowCallModal(false);
        setIsCalling(false);
        setOngoingCall(false);
    };
    const openMessageModal = () => {
        setShowMessageModal(true);
    };

    const closeMessageModal = () => {
        setShowMessageModal(false);
        setMessageText("");
    };
    const openMailModal = () => {
        setShowMailModal(true);
    };

    const closeMailModal = () => {
        setShowMailModal(false);
        setEmail("");
        setSubject("");
        setMailText("");
    };
    const handleStartCall = async () => {
        setIsCalling(true);
    };
    const handleMessage = async () => {
        setIsSendingMessage(true);
        try{
            console.log("callPhone: ", callPhone);
            console.log("mailText: ", messageText);
            if(!callPhone || !messageText) return toast.error("Please fill all fields");
            await prospectService.sendMessage(callPhone, messageText);
            toast.success("Message sent successfully");
        }
        catch(err){
            toast.error("Failed to send message");
        }
        finally{
            setIsSendingMessage(false);
        }
        
    };

    return (
        <>
            <div className="ml-72 mt-14 p-6 min-h-screen">
                {/* Header Section */}
                <div className="mb-6">
                    <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
                                        {ProspectData?.fullName}
                                    </h1>
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(
                                            ProspectData?.priority,
                                        )}`}
                                    >
                                        <IoFlagOutline className="w-4 h-4" />
                                        {ProspectData?.priority}
                                    </span>
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                                            ProspectData?.status,
                                        )}`}
                                    >
                                        <IoStatsChartOutline className="w-4 h-4" />
                                        {ProspectData?.status}
                                    </span>
                                </div>
                                <p
                                    className="text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
                                    onClick={() =>
                                        handleCopy(ProspectData ? ProspectData.id : "text not found")
                                    }
                                >
                                    <IoDocumentText className="w-4 h-4" />
                                    {t("prospect_id")} <span className="font-mono">{ProspectData?.id}</span>
                                </p>

                            </div>
                            {/* <div className="flex flex-wrap items-center gap-2">
                                {hasPermission(PERMISSIONS.callProspects) &&
                                    (
                                        <button
                                            onClick={() => openCallModal(ProspectData.phone)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-400 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                        >
                                            <MdPhoneEnabled className="w-4 h-4" />
                                        </button>
                                    )}
                                {hasPermission(PERMISSIONS.smsProspects) &&
                                    ProspectData.status !== SALES_STATUS.DELETE ? (
                                    <button
                                        onClick={() => openMessageModal()}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                                    >
                                        <MdSms className="w-4 h-4" />
                                    </button>
                                ) : (
                                    ""
                                )}
                                {hasPermission(PERMISSIONS.emailProspects) &&
                                    ProspectData.status !== SALES_STATUS.DELETE ? (
                                    <button
                                        onClick={() => openMailModal()}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-400 hover:bg-green-800 text-white rounded-lg transition-colors"
                                    >
                                        <MdMailOutline />
                                    </button>
                                ) : (
                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-400 opacity-60 text-white rounded-lg cursor-not-allowed">
                                        <MdMailOutline />
                                    </span>
                                )}


                                <div className="relative group">
                                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                                        <IoEllipsisVertical className="w-4 h-4" />
                                    </button>
                                    <div className="hidden group-hover:block absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 ">

                                    </div>
                                </div>
                            </div> */}

                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <MetricCard
                        icon={<IoBusinessOutline className="w-6 h-6" />}
                        label={t("company")}
                        value={ProspectData?.companyName || "—"}
                        color="bg-blue-500"
                    />
                    <MetricCard
                        icon={<IoCodeOutline className="w-5 h-5" />}
                        label={t("project_type")}
                        value={ProspectData?.projectType?.replace("_", " ") || "—"}
                        color="bg-purple-500"
                    />
                    <MetricCard
                        icon={<IoLocationOutline className="w-5 h-5" />}
                        label={t("location")}
                        value={ProspectData?.location?.city || "—"}
                        color="bg-green-500"
                    />
                    <MetricCard
                        icon={<IoCheckmarkCircle className="w-5 h-5" />}
                        label={t("is_assigned")}
                        value={ProspectData?.assignTo?.id ? "Yes" : "No"}
                        color={ProspectData?.assignTo?.id ? "bg-emerald-500" : "bg-gray-500"}
                    />
                </div>

                <div className="bg-white dark:bg-gray-700 mb-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex gap-8 overflow-x-auto px-6 py-3.5">
                        {(["overview", "contact", "activity"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-1.5 px-1 font-medium transition-colors cursor-pointer relative whitespace-nowrap ${activeTab === tab
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-6">
                    <div className="w-2/3 flex flex-col gap-6">
                        {activeTab === "overview" && (
                            <>
                                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-6">
                                        <IoInformationCircleOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {t("prospect_information")}
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <InfoItem
                                            icon={<IoInformationCircleOutline className="w-4 h-4" />}
                                            label={t("source")}
                                            value={ProspectData?.source}
                                        />
                                        <InfoItem
                                            icon={<IoCodeOutline className="w-4 h-4" />}
                                            label={t("project_type")}
                                            value={ProspectData?.projectType?.replace("_", " ")}
                                        />
                                        <InfoItem
                                            icon={<FaIndustry className="w-4 h-4" />}
                                            label={t("industry_2")}
                                            value={(ProspectData?.industry).join(", ") || "—"}
                                        />
                                        <InfoItem
                                            icon={<IoLanguageOutline className="w-4 h-4" />}
                                            label={t("language")}
                                            value={ProspectData?.location?.country || "—"}
                                        />
                                        <InfoItem
                                            icon={<IoFlagOutline className="w-4 h-4" />}
                                            label={t("priority")}
                                            value={ProspectData?.priority}
                                        />
                                        <InfoItem
                                            icon={<IoStatsChartOutline className="w-4 h-4" />}
                                            label={t("status")}
                                            value={ProspectData?.status}
                                        />
                                    </div>
                                </div>

                                {/* Employee Details */}
                                {/* {
                                ProspectData?.employeeRole && ProspectData?.employeeSeniority && (
                                    <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-6">
                                    <IoBriefcaseOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Employee Details
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InfoItem
                                        icon={<IoBriefcaseOutline className="w-4 h-4" />}
                                        label="Role"
                                        value={ProspectData?.employeeRole || "—"}
                                    />
                                    <InfoItem
                                        icon={<IoStatsChartOutline className="w-4 h-4" />}
                                        label="Seniority"
                                        value={ProspectData?.employeeSeniority || "—"}
                                    />
                                </div>
                            </div>
                                )
                            } */}


                                {hasPermission(PERMISSIONS.viewAssignProspectInformation) && <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-6">
                                        <MdOutlineLeaderboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {t("prospect_assign_information")}
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {ProspectData?.assignTo ? (() => {
  const { t } = useTranslation();
                                            const isAssigned = ProspectData.assignedAt
                                                ? formatDate(ProspectData.assignedAt)
                                                : "-";

                                            return (
                                                <>
                                                    <InfoItem
                                                        icon={<IoBriefcaseOutline className="w-4 h-4" />}
                                                        label={t("assign_to")}
                                                        value={`${ProspectData.assignTo.firstName} ${ProspectData.assignTo.lastName}` || "—"}
                                                    />

                                                    <InfoItem
                                                        icon={<IoStatsChartOutline className="w-4 h-4" />}
                                                        label={t("assign_at")}
                                                        value={isAssigned || "—"}
                                                    />
                                                </>
                                            );
                                        })() : null}
                                    </div>
                                </div>}

                                {/* {(ProspectData?.message || ProspectData?.membershipNotes) && (
                                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-6">
                                        <IoChatbubbleOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Notes & Messages
                                        </h3>
                                    </div>

                                    <div className="space-y-4">
                                        {ProspectData?.message && (
                                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <IoChatbubbleOutline className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Message
                                                    </p>
                                                </div>
                                                <p className="text-gray-900 dark:text-white">
                                                    {ProspectData.message}
                                                </p>
                                            </div>
                                        )}
                                        {ProspectData?.membershipNotes && (
                                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <IoDocumentText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Membership Notes
                                                    </p>
                                                </div>
                                                <p className="text-gray-900 dark:text-white">
                                                    {ProspectData.membershipNotes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )} */}
                            </>
                        )}

                        {/* Contact Tab */}
                        {activeTab === "contact" && (
                            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-6">
                                    <IoPersonOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {t("contact_information")}
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InfoItem
                                        icon={<IoPersonOutline className="w-4 h-4" />}
                                        label={t("full_name")}
                                        value={ProspectData?.fullName}
                                    />
                                    <MaskEmailField label={t("email")} value={ProspectData?.email} />
                                    <MaskPhoneField label={t("phone")} value={ProspectData?.phone} />
                                    <InfoItem
                                        icon={<IoBusinessOutline className="w-4 h-4" />}
                                        label={t("company")}
                                        value={ProspectData?.companyName || "—"}
                                    />
                                    <InfoItem
                                        icon={<IoLocationOutline className="w-4 h-4" />}
                                        label={t("city")}
                                        value={ProspectData?.location?.city || "—"}
                                    />
                                    <InfoItem
                                        icon={<IoGlobeOutline className="w-4 h-4" />}
                                        label={t("country")}
                                        value={ProspectData?.location?.country || "—"}
                                    />
                                    <InfoItem
                                        icon={<IoLocationOutline className="w-4 h-4" />}
                                        label={t("postal_code")}
                                        value={ProspectData?.location.zipcode || "—"}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Activity Tab */}
                        {activeTab === "activity" && (
                            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-6">
                                    <MdTimeline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {t("activity_timeline")}
                                    </h3>
                                </div>
                                <div className="text-center py-12">
                                    <IoInformationCircleOutline className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {t("activity_timeline_coming_soon")}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="w-1/3 flex flex-col gap-6 overflow-hidden">
                        {/* Creator Information */}
                        {ProspectData.createdBy && (
                            <div className="bg-linear-to-br from-blue-500 to-blue-600 p-6 rounded-xl border border-blue-400 shadow-lg ">
                                <div className="flex items-center gap-2 mb-4">
                                    <FaRegUser className="text-xl text-white" />
                                    <h2 className="text-white font-semibold text-xl">
                                        {t("creator_information")}
                                    </h2>
                                </div>
                                <div className="border-b border-white/30 w-full mb-4"></div>
                                <div className="space-y-4">
                                    <ProfileField
                                        icon={<IoPersonOutline className="w-4 h-4" />}
                                        label={t("name_2")}
                                        value={`${ProspectData.createdBy?.firstName} ${ProspectData.createdBy?.lastName ?? ""
                                            }`}
                                    />
                                    <ProfileField
                                        icon={<IoMailOutline className="w-4 h-4" />}
                                        label={t("email")}
                                        value={ProspectData.createdBy?.email}
                                    />
                                    <ProfileField
                                        icon={<IoCallOutline className="w-4 h-4" />}
                                        label={t("phone")}
                                        value={ProspectData.createdBy?.phone}
                                    />
                                    <ProfileField
                                        icon={<IoBusinessOutline className="w-4 h-4" />}
                                        label={t("company")}
                                        value={ProspectData.createdBy?.company || "—"}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Quick Stats */}
                        <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                {t("quick_stats")}
                            </h3>
                            <div className="space-y-3">
                                <StatItem
                                    label={t("in_deal")}
                                    value={ProspectData.assignTo?.id ? "Yes" : "No"}
                                    color={
                                        ProspectData.assignTo?.id
                                            ? "text-green-600 dark:text-green-400"
                                            : "text-gray-600 dark:text-gray-400"
                                    }
                                />
                                <StatItem
                                    label={t("created")}
                                    value={formatDate(ProspectData.createdAt)}
                                    color="text-gray-600 dark:text-gray-400"
                                />
                                <StatItem
                                    label={t("last_updated")}
                                    value={formatDate(ProspectData.updatedAt)}
                                    color="text-gray-600 dark:text-gray-400"
                                />
                            </div>
                        </div>

                        {/* Location Info */}
                        {(ProspectData?.location?.country || ProspectData?.location?.zipcode) && (
                            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <IoLocationOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {t("location_details")}
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    <StatItem
                                        label={t("country")}
                                        value={ProspectData?.location?.country ? ProspectData?.location?.country : "-"}
                                        color="text-gray-600 dark:text-gray-400"
                                    />
                                    <StatItem
                                        label={t("postal_code")}
                                        value={ProspectData?.location?.zipcode ? ProspectData?.location?.zipcode : null}
                                        color="text-gray-600 dark:text-gray-400"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showCallModal && callPhone && (
                <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">

                        {/* HEADER */}
                        <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl flex items-center justify-between">

                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <MdCall className="w-6 h-6 text-white" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {isCalling && "Calling..."}
                                        {ongoingCall && "Call in progress"}
                                        {!ongoingCall && !isCalling && "Start Call"}
                                    </h3>
                                    {
                                        (!ongoingCall && !isCalling) && <p className="text-sm text-blue-100">{t("call_this_phone_number")}</p>

                                    }
                                </div>
                            </div>

                            <button
                                onClick={closeCallModal}
                                className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
                            >
                                <IoClose className="w-5 h-5" />
                            </button>
                        </div>

                        {/* BODY */}
                        <div className="p-6 space-y-6">
                            {(!ongoingCall)
                                && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800 text-center">

                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                            {t("phone_number")}
                                        </p>

                                        <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                                            {callPhone}
                                        </p>

                                    </div>)}
                            {
                                isCalling ? (

                                    <div className="flex justify-center">
                                        <button
                                            onClick={() => {
                                                setIsCalling(false);
                                                setOngoingCall(true)
                                            }}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg cursor-not-allowed"
                                        >
                                            <MdCall className="w-5 h-5 animate-pulse" />
                                            {t("calling")}
                                        </button>
                                    </div>

                                ) : ongoingCall ? (

                                    <div className="flex justify-center">
                                        <CallModal phone={callPhone} onClose={closeCallModal} />
                                    </div>

                                ) : (

                                    <div className="flex justify-center">
                                        <button
                                            onClick={handleStartCall}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg"
                                        >
                                            <MdCall className="w-5 h-5" />
                                            {t("start_call")}
                                        </button>
                                    </div>

                                )
                            }
                        </div>

                        {/* FOOTER */}


                    </div>
                </div>
            )}

            {showMessageModal && callPhone && (
                <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">

                        {/* HEADER */}
                        <div className="bg-linear-to-r from-yellow-500 to-amber-500 px-6 py-5 rounded-t-2xl flex items-center justify-between">

                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <MdMessage className="w-6 h-6 text-white" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white">{t("send_message")}</h3>
                                    <p className="text-sm text-yellow-100">{t("send_sms_to_this_number")}</p>
                                </div>
                            </div>

                            <button
                                onClick={closeMessageModal}
                                className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
                            >
                                <IoClose className="w-5 h-5" />
                            </button>
                        </div>

                        {/* BODY */}
                        <div className="p-6 space-y-5">

                            {/* PHONE NUMBER */}
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-100 dark:border-yellow-800 text-center">

                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                    {t("phone_number")}
                                </p>

                                <p className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                                    {callPhone}
                                </p>

                            </div>

                            {/* MESSAGE INPUT */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                                    {t("message")}
                                </label>

                                <textarea
                                    rows={4}
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder={t("type_your_message")}
                                    className="w-full mt-2 p-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-yellow-500 focus:outline-none dark:bg-gray-700"
                                />
                            </div>

                            {/* SEND BUTTON */}
                            <div className="flex justify-center">
                                <button 
                                onClick={handleMessage}
                                disabled={isSendingMessage}
                                className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-semibold shadow-lg">
                                    <MdMessage className="w-5 h-5" />
                                    {isSendingMessage ? "Sending..." : "Send Message"}
                                </button>
                            </div>

                        </div>

                        {/* FOOTER */}

                    </div>
                </div>
            )}

            {showMailModal && callPhone && (
                <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">

                        {/* HEADER */}
                        <div className="bg-linear-to-r from-green-600 to-emerald-600 px-6 py-5 rounded-t-2xl flex items-center justify-between">

                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <MdEmail className="w-6 h-6 text-white" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white">{t("send_email")}</h3>
                                    <p className="text-sm text-green-100">{t("compose_and_send_an_email")}</p>
                                </div>
                            </div>

                            <button
                                onClick={closeMailModal}
                                className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
                            >
                                <IoClose className="w-5 h-5" />
                            </button>
                        </div>

                        {/* BODY */}
                        <div className="p-6 space-y-5">

                            {/* EMAIL INPUT */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                                    {t("email_address")}
                                </label>

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t("example_email_com")}
                                    className="w-full mt-2 p-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:outline-none dark:bg-gray-700"
                                />
                            </div>

                            {/* SUBJECT */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                                    {t("subject")}
                                </label>

                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder={t("email_subject")}
                                    className="w-full mt-2 p-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:outline-none dark:bg-gray-700"
                                />
                            </div>

                            {/* MESSAGE */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                                    {t("message")}
                                </label>

                                <div className="mt-2">
                                    <RichEditor value={mailText} onChange={setMailText} />
                                </div>
                            </div>

                            {/* SEND BUTTON */}
                            <div className="flex justify-center">
                                <button className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-lg">
                                    <MdEmail className="w-5 h-5" />
                                    {t("send_email")}
                                </button>
                            </div>

                        </div>

                        {/* FOOTER */}

                    </div>
                </div>
            )}
        </>
    );
};

export default ProspectViewPage;

// Component for metric cards
const MetricCard = ({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}) => (
    <div className="bg-white dark:bg-gray-700 p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-3 overflow-hidden">
            <div className={`${color} p-3 rounded-lg text-white`}>{icon}</div>
            <div className="flex-1 group:">
                <p className="text-sm text-gray-500 dark:text-gray-400 ">{label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 capitalize truncate w-42">
                    {value}
                </p>
            </div>
        </div>
    </div>
);

const InfoItem = ({
    icon,
    label,
    value,
}: {
    icon?: React.ReactNode;
    label: string;
    value: React.ReactNode;
}) => (
    <div className="group">
        <div className="flex items-center gap-2 mb-1">
            {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
        <p className="font-medium text-gray-900 dark:text-white pl-6">{value}</p>
    </div>
);

const ProfileField = ({
    icon,
    label,
    value,
}: {
    icon?: React.ReactNode;
    label: string;
    value: React.ReactNode;
}) => (
    <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
            {icon && <span className="text-white/80">{icon}</span>}
            <span className="text-sm text-white/80">{label}</span>
        </div>
        <div className="font-medium text-white pl-6">{value}</div>
    </div>
);

// Component for quick stats
const StatItem = ({
    label,
    value,
    color,
}: {
    label: string;
    value: string | undefined | number | null;
    color: string;
}) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600 last:border-0">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className={`text-sm font-medium ${color}`}>{value || "—"}</span>
    </div>
);
