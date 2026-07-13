"use client"
import extractErrorMessages from '@/src/app/utils/error.utils'
import { SIDEBAR_WIDTH } from '@/src/constants/constants'
import { TeamService } from '@/src/services/team.service'
import { Team } from '@/src/types/team/team.types'
import { User } from '@/src/types' 
import axios from 'axios'
import { useParams, useRouter } from 'next/navigation'
import React, { JSX, useState, useEffect } from 'react'
import { FaUsers } from "react-icons/fa";
import { toast } from 'react-toastify'
import { 
  IoArrowBack, 
  IoPeople, 
  IoShieldCheckmark, 
  IoEllipsisVertical,
  IoPersonAdd,
  IoSettings,
  IoBarChart,
  IoTrash,
  IoCheckmarkCircle,
  IoCloseCircle
} from 'react-icons/io5'
import { MdCategory } from 'react-icons/md'
import { FaCalendarAlt, FaSearch } from 'react-icons/fa'
import ConfirmPopup from '@/src/components/ui/ConfirmPopup'
import { usePermissions } from '@/src/hooks/usePermissions'
import Link from 'next/link'
import { useTranslation } from "react-i18next";

const Page = (): JSX.Element => {
  const { t } = useTranslation();
  const [teamData, setTeamData] = useState<Team | null>(null)
  const [err, setErr] = useState<string | string[]>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'activity'>('overview')

  const { id } = useParams()
  const router = useRouter()

  const {hasPermission} = usePermissions()

  const getTeamData = async () => {
    setIsLoading(true)
    try {
      const result = await TeamService.getById(id)

      if (result.status === 200) {
        const data = result.data.data
        setTeamData(data)
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error)
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error)
        setErr(messages)
        toast.error(`${messages}`)
      } else {
        setErr(["Something went wrong"])
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    getTeamData()
  }, [])



  const getFullName = (user: User) => {
    return `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
  }

  const getInitials = (user: User) => {
    const firstInitial = user.firstName?.[0] || ''
    const lastInitial = user.lastName?.[0] || ''
    return (firstInitial + lastInitial).toUpperCase()
  }

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

   const handleDelete = async (id: string, name: string) => {
      try {
        if (!id) {
          return setErr("Team ID not found ");
        }
  
        const confirm = await ConfirmPopup({
          title: "Are you sure",
          text: `Are you want to delete "${name}" team`,
          btnTxt: "Yes, delete",
        });
  
        if (confirm) {
          const result = await TeamService.delete(id);
  
          if (result.status === 200) {
  
            toast.success("Team deleted successfully");
            router.back()
          }
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

  if (isLoading) {
    return (
      <div className={`ml-72 mt-14 p-6`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-8">
          <div className="flex items-center gap-4 mb-6 animate-pulse">
            <div className="w-10 h-10 bg-slate-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="flex-1">
              <div className="h-8 bg-slate-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-1/4"></div>
            </div>
          </div>
          <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-slate-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-slate-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-slate-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!teamData) {
    return (
      <div className={`ml-72 mt-14 p-6`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-12 text-center">
          <div className="flex justify-center mb-4">
            <FaSearch className="text-6xl text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">{t("team_not_found")}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t("the_team_you're_looking_for_doesn't")}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <IoArrowBack />
            {t("go_back")}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`ml-72 mt-14 p-6`}>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            
            <div>
              <div className="flex items-center gap-3">
                
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><FaUsers />{teamData.name}</h1>
                {teamData.isDefault && (
                  <span className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full flex items-center gap-1">
                    <IoShieldCheckmark className="w-3 h-3" />
                    {t("default_team")}
                  </span>
                )}
                <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                  teamData.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {teamData.isActive ? (
                    <>
                      <IoCheckmarkCircle className="w-3 h-3" />
                      {t("active")}
                    </>
                  ) : (
                    <>
                      <IoCloseCircle className="w-3 h-3" />
                      {t("inactive")}
                    </>
                  )}
                </span>
              </div>
              {/* <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">/{teamData.slug}</p> */}
            </div>
          </div>
          <Link href={`/teams/update/${teamData.id}`} className="px-5 group py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center  gap-2">
            <IoSettings className="w-4 h-4 group-hover:rotate-90" />
            {t("edit_team")}
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-8">
          {(['overview', 'members', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 font-medium transition-colors cursor-pointer relative ${
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
        </nav>
      </div>

      
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white dark:bg-gray-700 rounded-xl border border-slate-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t("about")}</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {teamData.description || 'No description available for this team.'}
              </p>
            </div>

            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">{t("total_members")}</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{teamData.members.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                    <IoPeople className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">{t("managers")}</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{teamData.manager.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-600 dark:bg-purple-500 rounded-lg flex items-center justify-center">
                    <IoShieldCheckmark className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Managers Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t("team_managers")}</h2>
              <div className="space-y-3">
                {teamData.manager.length > 0 ? (
                  teamData.manager.map((manager) => (
                    <Link href={`/users/${manager.id}`} key={manager.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {getInitials(manager)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{getFullName(manager)}</p>
                        {/* <p className="text-sm text-gray-500 dark:text-gray-400">{manager.email}</p> */}
                      </div>
                      <span className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full flex items-center gap-1">
                        <IoShieldCheckmark className="w-3 h-3" />
                        {t("manager")}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">{t("no_managers_assigned")}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t("details")}</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <MdCategory className="w-4 h-4" />
                    {t("category")}
                  </p>
                  {/* <p className="text-gray-900 dark:text-white font-medium pl-6">{teamData?.category?.name}</p> */}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <FaCalendarAlt className="w-4 h-4" />
                    {t("created")}
                  </p>
                  <p className="text-gray-900 dark:text-white pl-6">{formatDate(teamData.createdAt)}</p>
                </div>
                {teamData.updatedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                      <FaCalendarAlt className="w-4 h-4" />
                      {t("last_updated")}
                    </p>
                    <p className="text-gray-900 dark:text-white pl-6">{formatDate(teamData.updatedAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t("created_by")}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {getInitials(teamData.createdBy)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{getFullName(teamData.createdBy)}</p>
                      {/* <p className="text-xs text-gray-500 dark:text-gray-400">{teamData.createdBy.email}</p> */}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t("quick_actions")}</h2>
              <div className="space-y-2">
                <Link href={`/teams/update/${teamData.id}`} className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-lg transition-colors flex items-center gap-2">
                  <IoPersonAdd className="w-4 h-4" />
                  {t("add_members")}
                </Link>
                
                <button className="w-full px-4 py-2 text-left text-sm font-medium cursor-not-allowed text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
                  <IoBarChart className="w-4 h-4" />
                  {t("view_analytics")}
                </button>
                <button className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 disabled:text-red-400 disabled:cursor-not-allowed dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer flex items-center gap-2" onClick={()=>handleDelete(teamData.id, teamData.name)} disabled={!hasPermission("team:delete")}>
                  <IoTrash className="w-4 h-4" />
                  {t("delete_team")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("all_members")}{teamData.members.length})</h2>
              <Link href={`/teams/update/${teamData.id}`} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors font-medium flex items-center gap-2">
                <IoPersonAdd className="w-4 h-4" />
                {t("add_member_2")}
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {teamData.members.length > 0 ? (
              teamData.members.map((member) => (
                <div key={member.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <Link href={`/users/${member.id}`} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {getInitials(member)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{getFullName(member)}</p>
                        {/* <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                        {member.phone && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">{member.phone}</p>
                        )} */}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      {teamData.manager.some(m => m.id === member.id) && (
                        <span className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full flex items-center gap-1">
                          <IoShieldCheckmark className="w-3 h-3" />
                          {t("manager")}
                        </span>
                      )}
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        member.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <IoEllipsisVertical className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <IoPeople className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">{t("no_members_in_this_team_yet")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-12 text-center">
          <div className="flex justify-center mb-4">
            <IoBarChart className="text-6xl text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t("activity_timeline")}</h3>
          <p className="text-gray-600 dark:text-gray-400">{t("activity_tracking_coming_soon_this_will")}</p>
        </div>
      )}
    </div>
  )
}

export default Page
