"use client"
import extractErrorMessages from '@/src/app/utils/error.utils';
import ConfirmPopup from '@/src/components/ui/ConfirmPopup';
import { SIDEBAR_WIDTH } from '@/src/constants/constants'
import { usePermissions } from '@/src/hooks/usePermissions';
import { AuthService } from '@/src/services/auth.service';
import { TeamService } from '@/src/services/team.service';
import { TeamCategoryService } from '@/src/services/teamCategory.service';
import { User } from '@/src/types';
import { Team, TeamCategory, TeamCreatePayload, TeamUpdatePayload } from '@/src/types/team/team.types';
import axios from 'axios';
import React, { FormEvent, JSX, useEffect, useState } from 'react'
import { toast } from 'react-toastify';
import Input from '@/src/components/ui/Input';
import FormButton from '@/src/components/ui/FormButton';
import { useParams } from 'next/navigation';
import { ParamValue } from 'next/dist/server/request/params';
import ErrorComponent from '@/src/components/ui/ErrorComponent';
import SuccessComponent from '@/src/components/ui/SuccessComponent';
import { PERMISSIONS } from '@/src/constants/enum';
import { FaXmark } from 'react-icons/fa6';

const page = ():JSX.Element => {
  const [isPopupShow, setIsPopupShow] = useState<boolean>(false);
    const [err, setErr] = useState<string | string[]>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    
    const [teamData, setTeamData] = useState<Team | null>(null);
    const [categoryData, setCategoryData] = useState<TeamCategory[]>([])
    const [userData, setUserData] = useState<User[]>([])
   
  
    const [formData, setFormData] = useState<TeamUpdatePayload>({
      name: "",
      description: "",
      category:"",
      isActive: false,
      manager: [],
      members: [],
    });
    const [showSuccess, setShowSuccess] = useState<string>("");
  
    const { hasPermission } = usePermissions();

    const {id} = useParams()
  
  
    const getTeamData = async(id:ParamValue)=>{
      setIsLoading(true)
      try {
        const result = await TeamService.getById(id)
        if(result.status === 200){
          
          setTeamData(result.data.data);
          
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
        setIsLoading(false)
      }
    }
  
    const getUserData = async()=>{
      try {
        const response = await AuthService.getAllActiveWithoutPagination()
        if (response.status === 200){
          setUserData(response.data.data)
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
  
    }
  
    const getCategoryData = async()=>{
      try{
        const response = await TeamCategoryService.getAllWithoutPagination()
        if(response.status === 200){
          setCategoryData(response.data.data)
        }
      }
      catch(error){
        process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
        if (axios.isAxiosError(error)) {
          const messages = extractErrorMessages(error);
          setErr(messages);
          toast.error(`${messages}`);
        } else {
          setErr(["Something went wrong"]);
        }
      }
    }
  
    useEffect(() => {
      getCategoryData()
      getUserData()
      if(!id) return 
      getTeamData(id)
      
    }, [])

    useEffect(() => {
  if (!teamData) return;

  setFormData({
    name: teamData.name,
    description: teamData.description || "",
    category:
      typeof teamData.category === "string"
        ? teamData.category
        : teamData.category.id || teamData.category.id,
    isActive: teamData.isActive,
    manager:  teamData.manager.map(m => m.id || m.id),
    members: teamData.members.map(m => m.id || m.id),
  });
}, [teamData]);
  
    const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAddMember = (userId: string) => {
    setFormData(prev => {
      if (prev.members.includes(userId)) return prev;
      return { ...prev, members: [...prev.members, userId] };
    });
  };

    const handleAddManager = (userId: string) => {
    setFormData((prev) => {
      if (prev.members.includes(userId)) return prev;
      return { ...prev, manager: [...prev.manager, userId] };
    });
  };

  const handleRemoveManager = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      manager: prev.manager.filter((id) => id !== userId),
    }));
  };
  
  const handleRemoveMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(id => id !== userId),
    }));
  };


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!id) return;

  setIsLoading(true);
  try {
    const result = await TeamService.update(id, formData);

    if (result.status === 200) {
      toast.success("Team updated successfully");
      setShowSuccess("Team updated successfully");
      setTimeout(() => setShowSuccess(""), 3000);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      setErr(extractErrorMessages(error));
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
         <h2 className="text-xl font-bold dark:text-white">Update Team</h2>

{err && <ErrorComponent error={err} />}
{showSuccess && <SuccessComponent message={showSuccess} />}

<form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 ">
  {/* Team Name */}
  <Input
    label="Team Name"
    name="name"
    value={formData.name}
    onChange={handleChange}
    required
  />

 
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium dark:text-gray-200">Category</label>
    <select
      name="category"
      value={formData.category}
      onChange={(e) =>
        setFormData(prev => ({ ...prev, category: e.target.value }))
      }
      className=" px-3 py-2 rounded-md border border-gray-300 dark:border-gray-300/30"
      required
    >
      <option value="">Select category</option>
      {categoryData.map(cat => (
        <option key={cat.id || cat.id} value={cat.id || cat.id}>
          {cat.name}
        </option>
      ))}
    </select>
  </div>

   <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Add Manager
                  </label>
  
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddManager(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="bg-white dark:bg-gray-600 px-3 py-2 rounded-md border capitalize"
                  >
                    <option value="">Select user</option>
                    {userData.map((user) => (
                      <option key={user.id} value={user.id}>
                        {`${user.firstName} ${user.lastName} (${user.userRole.map((item) => item.name)})`}
                      </option>
                    ))}
                  </select>
  
                  {formData.manager.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.manager.map((memberId) => {
                        const user = userData.find((u) => u.id === memberId);
                        if (!user) return null;
  
                        return (
                          <span
                            key={memberId}
                            className="flex items-center gap-1 bg-blue-100 text-blue-600 
                           px-3 py-1 rounded-full text-sm"
                          >
                            {user.firstName} {user.lastName} (
                            {user.userRole.map((item) => item.name)})
                            <button
                              type="button"
                              onClick={() => handleRemoveManager(memberId)}
                              className="hover:text-red-500 cursor-pointer hover:rotate-90 transition-all duration-300"
                            >
                              <FaXmark size={14} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

  {/* Members */}
  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium dark:text-gray-200">
      Team Members
    </label>

    <select
      onChange={(e) => {
        if (e.target.value) {
          handleAddMember(e.target.value);
          e.target.value = "";
        }
      }}
      className=" px-3 py-2 rounded-md border border-gray-300 dark:border-gray-300/30"
    >
      <option value="">Add member</option>
      {userData.map(user => (
        <option key={user.id || user.id} value={user.id || user.id}>
          {user.firstName} {user.lastName}
        </option>
      ))}
    </select>

    <div className="flex flex-wrap gap-2">
      {formData.members.map(memberId => {
        const user = userData.find(u => (u.id || u.id) === memberId);
        if (!user) return null;

        return (
          <span
            key={memberId}
            className="flex items-center gap-1 bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm"
          >
            {user.firstName} {user.lastName}
            <button
              type="button"
              onClick={() => handleRemoveMember(memberId)}
              className="hover:text-red-500"
            >
              ✕
            </button>
          </span>
        );
      })}
    </div>
  </div>

 
  


  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={formData.isActive}
      onChange={(e) =>
        setFormData(prev => ({ ...prev, isActive: e.target.checked }))
      }
    />
    <span className="text-sm dark:text-gray-200">Active</span>
  </div>

  <div className="flex flex-col gap-1 col-span-2">
    <label className="text-sm font-medium dark:text-gray-200">
      Description
    </label>
    <textarea
    rows={3}
      name="description"
      value={formData.description}
      onChange={handleChange}
      className="rounded-md border border-gray-300 dark:border-gray-300/30 px-3 py-2  "
    />
  </div>


  <div className="flex gap-3 pt-4 col-span-2">
    <FormButton isLoading={isLoading} disabled={(formData.name === "" || formData.members.length <= 0 || formData.category === "") && hasPermission(PERMISSIONS.updateTeam)}>Update Team</FormButton>
  </div>
</form>

         
         </div>
      
    </div>
  )
}

export default page
