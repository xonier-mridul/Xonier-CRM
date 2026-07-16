"use client";
import SubscriptionViewComponent from "@/src/components/pages/subscription/SubscriptionViewComponent";
import { SubscriptionService } from "@/src/services/subscription.service";
import { Subscription } from "@/src/types/subscription/subscription.types";
import axios from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const SubscriptionViewPage = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [subscriptionData, setSubscriptionData] = useState<Subscription | null>(null);
  const [errMessage, setErrMessage] = useState<string | string[]>("");

  const { id } = useParams<{ id: string }>();

  const getDataById = async (): Promise<void> => {
    if (!id) return;
    setIsLoading(true);
    setSubscriptionData(null);
    setErrMessage("");
    try {
      const res = await SubscriptionService.getById(id);
      if (res.status === 200) {
        setSubscriptionData(res.data.data);
      }
    } catch (err) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(err);
      if (axios.isAxiosError(err)) {
        const msg = extractErrorMessages(err);
        setErrMessage(msg);
        toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
      } else {
        setErrMessage("Something went wrong");
        toast.error("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getDataById();
  }, [id]);

  return (
    <div className="ml-72 mt-14 p-6 flex flex-col gap-6">
      {errMessage && !isLoading && !subscriptionData && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">
            {Array.isArray(errMessage) ? errMessage.join(", ") : errMessage}
          </p>
          <button
            onClick={getDataById}
            className="text-sm font-bold px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            {t("retry")}
          </button>
        </div>
      )}
      <SubscriptionViewComponent
  subScriptionData={subscriptionData}
  isLoading={isLoading}
/>
    </div>
  );
};

export default SubscriptionViewPage;