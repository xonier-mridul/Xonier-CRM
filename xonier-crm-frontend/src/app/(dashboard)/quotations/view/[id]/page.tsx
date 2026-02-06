"use client"
import extractErrorMessages from '@/src/app/utils/error.utils';
import { SIDEBAR_WIDTH } from '@/src/constants/constants'
import { PERMISSIONS, QUOTATION_EVENT_TYPE, QuotationStatus } from '@/src/constants/enum';
import { QuoteService } from '@/src/services/quote.service';
import { Quotation } from '@/src/types/quotations/quote.types';
import { User } from '@/src/types';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import React, { JSX, useEffect, useState } from 'react'
import { toast } from 'react-toastify';
import { 
  IoArrowBack, 
  IoDocumentText, 
  IoCalendarOutline, 
  IoPricetagOutline,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoTimeOutline,
  IoBusinessOutline,
  IoPersonOutline,
  IoMailOutline,
  IoCallOutline,
  IoEllipsisVertical,
  IoCreateOutline,
  IoTrashOutline,
  IoDuplicateOutline,
  IoDownloadOutline,
  IoPrintOutline,
  IoSendOutline,
  IoInformationCircleOutline,
  IoCashOutline,
  IoTrendingUpOutline,
  IoFunnelOutline
} from 'react-icons/io5';
import { FaRegPaperPlane } from "react-icons/fa";
import { MdCategory, MdTimeline, MdDeleteOutline } from 'react-icons/md';
import ConfirmPopup from '@/src/components/ui/ConfirmPopup';
import { usePermissions } from '@/src/hooks/usePermissions';
import Link from 'next/link';
import { formatCurrency } from '@/src/app/utils/currency.utils';
import { MaskEmailField, MaskPhoneField } from '@/src/components/ui/LeadComponent';
import { QuotationHistory } from '@/src/types/quotations/quoteHistory.types';
import { QuoteHistoryService } from '@/src/services/quoteHistory.service';
import Skeleton from 'react-loading-skeleton';

const Page = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<Quotation | null>(null);
  const [quoteHistoryData, setQuoteHistoryData] = useState<QuotationHistory[]| null>(null)
  const [err, setErr] = useState<string[] | string>("");
  const [quoteHistoryInfo, setQuoteHistoryInfo] = useState<string[] | string>("")
  const [activeTab, setActiveTab] = useState<'overview' | 'deal' | 'timeline'>('overview');
  const { id } = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const getQuoteData = async (id: string) => {
    setIsLoading(true);
    try {
      const result = await QuoteService.get_by_id(id);
      if (result.status === 200) {
        setQuoteData(result.data.data);
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

  const getQuoteHistory = async(quoteId:string)=>{
    try {
      const result = await QuoteHistoryService.getHistoryByQuote(quoteId)

      if(result.status === 200){
        const data = result.data.data
        // Sort by date descending (newest first)
        const sortedData = Array.isArray(data) ? data.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ) : [];
        setQuoteHistoryData(sortedData)
      }
      
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setQuoteHistoryInfo(messages);
      } else {
        setQuoteHistoryInfo(["Quote history data not found"]);
      }
    }
  }

  useEffect(() => {
    if (!id) return;
    getQuoteData(String(id));
    getQuoteHistory(String(id))
  }, [id]);

  const getFullName = (user: User) => {
    return `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
  };

  const getInitials = (user: User) => {
    const firstInitial = user.firstName?.[0] || '';
    const lastInitial = user.lastName?.[0] || '';
    return (firstInitial + lastInitial).toUpperCase();
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | Date) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: QuotationStatus) => {
    const colors = {
      [QuotationStatus.DRAFT]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      [QuotationStatus.SENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      [QuotationStatus.UPDATED]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      [QuotationStatus.RESEND]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      [QuotationStatus.VIEWED]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      [QuotationStatus.ACCEPTED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      [QuotationStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      [QuotationStatus.DELETE]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      [QuotationStatus.EXPIRED]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return colors[status] || colors[QuotationStatus.DRAFT];
  };

  const getStatusIcon = (status: QuotationStatus) => {
    switch (status) {
      case QuotationStatus.ACCEPTED:
        return <IoCheckmarkCircle className="w-4 h-4" />;
      case QuotationStatus.REJECTED:
        return <IoCloseCircle className="w-4 h-4" />;
      case QuotationStatus.EXPIRED:
        return <IoTimeOutline className="w-4 h-4" />;
      case QuotationStatus.SENT:
        return <IoSendOutline className="w-4 h-4" />;
      case QuotationStatus.VIEWED:
        return <IoInformationCircleOutline className="w-4 h-4" />;
      default:
        return <IoDocumentText className="w-4 h-4" />;
    }
  };

  const handleDelete = async () => {
    if (!quoteData) return;
    
    try {
      const confirm = await ConfirmPopup({
        title: "Are you sure?",
        text: `Do you want to delete quotation "${quoteData.quoteId}"?`,
        btnTxt: "Yes, delete",
      });

      if (confirm) {
        const result = await QuoteService.delete(quoteData.id);
        if (result.status === 200) {
          toast.success("Quotation deleted successfully");
          router.push('/quotations');
        }
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(`${messages}`);
      } else {
        toast.error("Something went wrong");
      }
    }
  };

  const handleDuplicate = async () => {
    toast.info("Duplicate functionality coming soon");
  };

  const handleDownload = async () => {
    toast.info("Download functionality coming soon");
  };

  const handlePrint = async () => {
    window.print();
  };

  const handleResend = async (id:string) => {
    setIsResending(true)
    try {

      const result = await QuoteService.resend(id)

      if(result.status === 200){
        toast.success("Quotation resend successfully")
        await getQuoteData(id)
      }
      
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(`${messages}`);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setIsResending(false)
    }
  };

  if (isLoading) {
    return (
      <div className={`ml-72 mt-14 p-6 flex flex-col gap-6 animate-pulse`}>
        <Skeleton height={120}  borderRadius={12} className='dark:bg-gray-700 w-full animate-pulse'/>
        <Skeleton height={60}  borderRadius={12} className='dark:bg-gray-700 w-full animate-pulse'/>
        <div className="flex items-start gap-6">
          <div className='w-2/3 flex flex-col gap-6'>
          <Skeleton height={240}  borderRadius={12} className='dark:bg-gray-700 w-full animate-pulse '/>
          <Skeleton height={130}  borderRadius={12} className='dark:bg-gray-700 w-full animate-pulse '/>
          </div>
          <div className='w-1/3'>
          <Skeleton height={330}  borderRadius={12} className='dark:bg-gray-700 w-full animate-pulse '/>
          
          </div>

        </div>
      </div>
    );
  }

  if (!quoteData) {
    return (
      <div className={`ml-72 mt-14 p-6`}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <IoDocumentText className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Quotation Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The quotation you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <IoArrowBack className="w-5 h-5" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = new Date(quoteData.valid) < new Date();

  return (
    <div className={`ml-72 mt-14 p-6 min-h-screen`}>
      {/* Header */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {quoteData.quoteId}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quoteData.quotationStatus)}`}>
                  {getStatusIcon(quoteData.quotationStatus)}
                  {quoteData.quotationStatus}
                </span>
                {isExpired && quoteData.quotationStatus !== QuotationStatus.ACCEPTED && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <IoTimeOutline className="w-4 h-4" />
                    Expired
                  </span>
                )}
              </div>
              {quoteData.title && (
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  {quoteData.title}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
              onClick={()=>handleResend(quoteData.id)}
              disabled={quoteData.quotationStatus === QuotationStatus.ACCEPTED || quoteData.quotationStatus === QuotationStatus.DRAFT || quoteData.quotationStatus === QuotationStatus.REJECTED || quoteData.quotationStatus === QuotationStatus.EXPIRED || quoteData.quotationStatus === QuotationStatus.DELETE}
                className="inline-flex items-center gap-2 cursor-pointer px-4 disabled:cursor-not-allowed py-2 bg-green-600 disabled:bg-green-300 disabled:opacity-90  hover:bg-green-700 text-white rounded-lg transition-colors group"
                >
                  <FaRegPaperPlane className="w-4 h-4 group-hover:rotate-22 "/>
                {isResending ? "Resending..." : "Resend"}
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <IoDownloadOutline className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors cursor-pointer"
              >
                <IoPrintOutline className="w-4 h-4" />
                Print
              </button>
              
              <div className="relative group">
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors cursor-pointer">
                  <IoEllipsisVertical className="w-4 h-4" />
                </button>
                <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                  {(hasPermission(PERMISSIONS.updateQuote) && (quoteData.quotationStatus !== QuotationStatus.DELETE) ) ? <Link
                    href={`/quotations/update/${quoteData.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <IoCreateOutline className="w-4 h-4" />
                    Edit
                  </Link> : <span className="flex items-center gap-2 px-4 py-2 text-gray-400 dark:text-gray-30 cursor-not-allowed transition-colors" >
                    <IoCreateOutline className="w-4 h-4" /> Edit

                    </span>}
                  <button
                    onClick={handleDelete}
                    disabled={!hasPermission("quotation:delete") || (quoteData.quotationStatus === QuotationStatus.DELETE)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <IoTrashOutline className="w-4 h-4" />
                    {(quoteData.quotationStatus === QuotationStatus.DELETE) ? "Already Deleted" :"Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-700 mb-5 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex gap-8 overflow-x-auto px-6 py-3.5">
          {(['overview', 'deal', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1.5 px-1 font-medium transition-colors cursor-pointer relative whitespace-nowrap ${
                activeTab === tab
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-b-xl lg:rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <IoCashOutline className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  Financial Summary
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Subtotal</span>
                      <IoPricetagOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {formatCurrency(quoteData.subTotal)}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Total Amount</span>
                      <IoCashOutline className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {formatCurrency(quoteData.total)}
                    </p>
                  </div>
                </div>

                {quoteData.total !== quoteData.subTotal && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Tax/Adjustments</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(quoteData.total - quoteData.subTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {quoteData.description && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IoDocumentText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    Description
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {quoteData.description}
                  </p>
                </div>
              )}

              {/* Customer Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <IoPersonOutline className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  Customer Information
                </h2>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                      {quoteData.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-lg">
                        {quoteData.customerName}
                      </p>
                      {quoteData.companyName && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mt-1">
                          <IoBusinessOutline className="w-4 h-4" />
                          {quoteData.companyName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <IoMailOutline className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          <MaskEmailField label='email' value={quoteData.customerEmail} />
                        </p>
                      </div>
                    </div>

                    {quoteData.customerPhone && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <IoCallOutline className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            <MaskPhoneField label='phone' value={quoteData.customerPhone} />
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'deal' && (
            <div className="bg-white dark:bg-gray-800 rounded-b-xl lg:rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <IoFunnelOutline className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Associated Deal
              </h2>

              {quoteData.deal ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {quoteData.deal.dealName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Deal ID: {quoteData.deal.deal_id}
                      </p>
                    </div>
                    <Link
                      href={`/deals/view/${quoteData.deal.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      View Full Deal
                      <IoArrowBack className="w-4 h-4 rotate-180" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-2">
                        <IoCashOutline className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Deal Amount</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {formatCurrency(quoteData.deal.amount)}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <IoTrendingUpOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Stage</span>
                      </div>
                      <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                        {quoteData.deal.dealStage}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-2">
                        <MdCategory className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Type</span>
                      </div>
                      <p className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                        {quoteData.deal.dealType}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pipeline</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {quoteData.deal.dealPipeline}
                      </p>
                    </div>

                    {quoteData.deal.dealProbability !== null && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Win Probability</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {quoteData.deal.dealProbability}%
                        </p>
                      </div>
                    )}

                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Created Date</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatDate(quoteData.deal.createDate)}
                      </p>
                    </div>

                    {quoteData.deal.closeDate && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Close Date</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatDate(quoteData.deal.closeDate)}
                        </p>
                      </div>
                    )}
                  </div>

                  {quoteData.deal.dealDescription && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Description</p>
                      <p className="text-gray-900 dark:text-white leading-relaxed">
                        {quoteData.deal.dealDescription}
                      </p>
                    </div>
                  )}

                  {quoteData.deal.nextStep && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Next Step</p>
                      <p className="text-gray-900 dark:text-white">
                        {quoteData.deal.nextStep}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <IoFunnelOutline className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No deal associated with this quotation</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="bg-white dark:bg-gray-800 rounded-b-xl lg:rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <MdTimeline className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Activity Timeline
              </h2>
              
              {quoteHistoryData && quoteHistoryData.length > 0 ? (
                <div className="space-y-4">
                  {quoteHistoryData.map((history, index) => {
                    const isLast = index === quoteHistoryData.length - 1;
                    
                    const getEventIcon = (eventType: string) => {
                      const type = eventType.toLowerCase();
                      if (type.includes(QUOTATION_EVENT_TYPE.CREATED)) {
                        return {
                          icon: <IoCheckmarkCircle className="w-5 h-5" />,
                          bgColor: 'bg-green-100 dark:bg-green-900/30',
                          textColor: 'text-green-600 dark:text-green-400'
                        };
                      } else if (type.includes(QUOTATION_EVENT_TYPE.UPDATED)) {
                        return {
                          icon: <IoCreateOutline className="w-5 h-5" />,
                          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
                          textColor: 'text-blue-600 dark:text-blue-400'
                        };
                      } else if (type.includes(QUOTATION_EVENT_TYPE.STATUS_CHANGED)) {
                        return {
                          icon: <IoTimeOutline className="w-5 h-5" />,
                          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
                          textColor: 'text-purple-600 dark:text-purple-400'
                        };
                      } else if (type.includes(QUOTATION_EVENT_TYPE.EMAIL_SENT)) {
                        return {
                          icon: <IoSendOutline className="w-5 h-5" />,
                          bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
                          textColor: 'text-indigo-600 dark:text-indigo-400'
                        };
                      } else if (type.includes(QUOTATION_EVENT_TYPE.VIEWED)) {
                        return {
                          icon: <IoInformationCircleOutline className="w-5 h-5" />,
                          bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
                          textColor: 'text-cyan-600 dark:text-cyan-400'
                        };
                      } else if (type.includes(QUOTATION_EVENT_TYPE.ACCEPTED)) {
                        return {
                          icon: <IoCheckmarkCircle className="w-5 h-5" />,
                          bgColor: 'bg-green-100 dark:bg-green-900/30',
                          textColor: 'text-green-600 dark:text-green-400'
                        };
                      } else if (type.includes(QUOTATION_EVENT_TYPE.REJECTED)) {
                        return {
                          icon: <IoCloseCircle className="w-5 h-5" />,
                          bgColor: 'bg-red-100 dark:bg-red-900/30',
                          textColor: 'text-red-600 dark:text-red-400'
                        };
                      }else if (type.includes(QUOTATION_EVENT_TYPE.DELETE)) {
                        return {
                          icon: <MdDeleteOutline className="w-5 h-5" />,
                          bgColor: 'bg-red-100 dark:bg-red-900/30',
                          textColor: 'text-red-600 dark:text-red-400'
                        };
                      }
                      return {
                        icon: <IoDocumentText className="w-5 h-5" />,
                        bgColor: 'bg-gray-100 dark:bg-gray-700',
                        textColor: 'text-gray-600 dark:text-gray-400'
                      };
                    };

                    const eventStyle = getEventIcon(history.eventType);

                    return (
                      <div key={history.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full ${eventStyle.bgColor} flex items-center justify-center ${eventStyle.textColor}`}>
                            {eventStyle.icon}
                          </div>
                          {!isLast && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-2 min-h-[2rem]"></div>}
                        </div>
                        
                        <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-semibold text-gray-900 dark:text-white capitalize">
                              {history.eventType.replace(/_/g, ' ')}
                            </p>
                            <time className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                              {formatDateTime(history.createdAt)}
                            </time>
                          </div>

                          {(history.previousStatus || history.newStatus) && (
                            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <div className="flex items-center gap-2 text-sm flex-wrap">
                                {history.previousStatus && (
                                  <>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(history.previousStatus)}`}>
                                      {history.previousStatus}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                  </>
                                )}
                                {history.newStatus && (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(history.newStatus)}`}>
                                    {history.newStatus}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {history.delta && Object.keys(history.delta).length > 0 && (
                            <div className="mt-2 space-y-2">
                              {Object.entries(history.delta).map(([field, change]) => (
                                <div key={field} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1 capitalize">
                                    {field.replace(/([A-Z])/g, ' $1').trim()}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm flex-wrap">
                                    <span className="text-gray-600 dark:text-gray-400 line-through">
                                      {typeof change.old === 'number' && (field.toLowerCase().includes('total') || field.toLowerCase().includes('subtotal'))
                                        ? formatCurrency(change.old)
                                        : String(change.old || 'N/A')}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-gray-900 dark:text-white font-medium">
                                      {typeof change.new === 'number' && (field.toLowerCase().includes('total') || field.toLowerCase().includes('subtotal'))
                                        ? formatCurrency(change.new)
                                        : String(change.new || 'N/A')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {history.performedBy && (
                            <div className="flex items-center gap-2 mt-3">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                                {getInitials(history.performedBy)}
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                by {getFullName(history.performedBy)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {quoteHistoryInfo && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-300 text-center">
                        <IoInformationCircleOutline className="w-5 h-5 inline mr-2" />
                        {typeof quoteHistoryInfo === 'string' ? quoteHistoryInfo : quoteHistoryInfo[0]}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <IoCheckmarkCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2"></div>
                    </div>
                    <div className="flex-1 pb-8">
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">Quotation Created</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {formatDateTime(quoteData.createdAt)}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                          {getInitials(quoteData.createdBy)}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          by {getFullName(quoteData.createdBy)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {quoteData.updatedBy && quoteData.updatedAt !== quoteData.createdAt && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <IoCreateOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2"></div>
                      </div>
                      <div className="flex-1 pb-8">
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">Last Updated</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {formatDateTime(quoteData.updatedAt)}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                            {getInitials(quoteData.updatedBy)}
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            by {getFullName(quoteData.updatedBy)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        quoteData.quotationStatus === QuotationStatus.ACCEPTED 
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : quoteData.quotationStatus === QuotationStatus.REJECTED
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        {getStatusIcon(quoteData.quotationStatus)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">Current Status</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {quoteData.quotationStatus}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <IoInformationCircleOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Details
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                  <IoCalendarOutline className="w-4 h-4" />
                  Issue Date
                </p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatDate(quoteData.issueDate)}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                  <IoTimeOutline className="w-4 h-4" />
                  Valid Until
                </p>
                <p className={`font-semibold ${
                  isExpired 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {formatDate(quoteData.valid)}
                </p>
                {isExpired && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    This quotation has expired
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Created</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(quoteData.createdAt)}
                </p>
              </div>

              {quoteData.updatedAt && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Updated</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(quoteData.updatedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Created By</h3>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shrink-0">
                {getInitials(quoteData.createdBy)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {getFullName(quoteData.createdBy)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {quoteData.createdBy.email}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            
            <div className="space-y-2">
               {(hasPermission(PERMISSIONS.updateQuote) && (quoteData.quotationStatus !== QuotationStatus.DELETE) ) ?<Link
                href={`/quotations/update/${quoteData.id}`}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
              >
                <IoCreateOutline className="w-5 h-5" />
                <span className="font-medium">Edit Quotation</span>
              </Link> : <span className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50   rounded-lg transition-colors text-gray-400 dark:text-gray-10 opacity-80 cursor-not-allowed" >
                    <IoCreateOutline className="w-4 h-4" /> Edit

                    </span>}

              <button
                onClick={handlePrint}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
              >
                <IoPrintOutline className="w-5 h-5" />
                <span className="font-medium">Print Quotation</span>
              </button>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleDelete}
                  disabled={!hasPermission("quotation:delete") || quoteData.quotationStatus === QuotationStatus.ACCEPTED || quoteData.quotationStatus === QuotationStatus.DRAFT || quoteData.quotationStatus === QuotationStatus.REJECTED || quoteData.quotationStatus === QuotationStatus.EXPIRED || quoteData.quotationStatus === QuotationStatus.DELETE}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IoTrashOutline className="w-5 h-5" />
                  <span className="font-medium capitalize">{(quoteData.quotationStatus === QuotationStatus.DELETE) ? "Already deleted" :"Delete Quotation"}</span>
                </button>
              </div>
            </div>
          </div>

          {isExpired && quoteData.quotationStatus !== QuotationStatus.ACCEPTED && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex gap-3">
                <IoTimeOutline className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">Quotation Expired</h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    This quotation expired on {formatDate(quoteData.valid)}. Consider creating a new quotation or extending the validity period.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;