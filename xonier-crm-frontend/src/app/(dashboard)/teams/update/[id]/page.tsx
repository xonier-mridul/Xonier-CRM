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
import React, { FormEvent, JSX, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify';
import Input from '@/src/components/ui/Input';
import FormButton from '@/src/components/ui/FormButton';
import { useParams } from 'next/navigation';
import { ParamValue } from 'next/dist/server/request/params';
import ErrorComponent from '@/src/components/ui/ErrorComponent';
import SuccessComponent from '@/src/components/ui/SuccessComponent';
import { PERMISSIONS } from '@/src/constants/enum';
import { FaXmark } from 'react-icons/fa6';
import { FiCheck, FiChevronDown, FiSearch } from 'react-icons/fi';

const page = ():JSX.Element => {
  const [isPopupShow, setIsPopupShow] = useState<boolean>(false);
    const [err, setErr] = useState<string | string[]>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    
    const [teamData, setTeamData] = useState<Team | null>(null);
    const [categoryData, setCategoryData] = useState<TeamCategory[]>([])
    const [userData, setUserData] = useState<User[]>([])
 const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
 const [isUserOpen, setIsUserOpen] = useState<boolean>(false);
 const [isManagerOpen, setIsManagerOpen] = useState<boolean>(false);
const [searchCategory, setSearchCategory] = useState<string>("");
const [searchUser, setSearchUser] = useState<string>("");
const [searchManager, setSearchManager] = useState<string>("");
   

    const categoryDropdownRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const managerDropdownRef = useRef<HTMLDivElement>(null);
    
  
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

     useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          categoryDropdownRef.current &&
          !categoryDropdownRef.current.contains(event.target as Node)
        ) {
          setIsCategoryOpen(false);
        }
    
        if (
          userDropdownRef.current &&
          !userDropdownRef.current.contains(event.target as Node)
        ) {
          setIsUserOpen(false);
        }
        if(managerDropdownRef.current &&
          !managerDropdownRef.current.contains(event.target as Node)
        ) {
          setIsManagerOpen(false);
        }
      };
    
      document.addEventListener("mousedown", handleClickOutside);
    
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);
  
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



    const filteredUsers = useMemo(() => {
      return userData.filter((user) =>
        `${user.firstName} ${user.lastName} ${user.userRole
          .map((role) => role.name)
          .join(" ")}`
          .toLowerCase()
          .includes(searchUser.toLowerCase())
      );
    }, [userData, searchUser]);

    const filteredManager = useMemo(() => {
      return userData.filter((user) =>
        `${user.firstName} ${user.lastName} ${user.userRole
          .map((role) => role.name)
          .join(" ")}`
          .toLowerCase()
          .includes(searchUser.toLowerCase())
      );
    }, [userData, searchManager]);
    
  
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

    const filteredCategories = useMemo(() => {
    return categoryData.filter((item) =>
      item.name.toLowerCase().includes(searchCategory.toLowerCase())
    );
  }, [categoryData, searchCategory]);
  
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
   <div className={`ml-72 mt-14 p-6`}>
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

           <div className="relative w-full" ref={categoryDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                        className="w-full flex items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm"
                      >
                        <span>
                          {formData.category
                            ? categoryData.find((c) => c.id === formData.category)?.name
                            : "Select Category"}
                        </span>
    
                        <FiChevronDown
                          className={`transition-transform ${
                            isCategoryOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
    
                      {isCategoryOpen && (
                        <div className="absolute left-0 mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-50">
                        
                          <div className="relative p-2 border-b border-slate-300 dark:border-gray-700">
                            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
    
                            <input
                              type="text"
                              placeholder="Search category..."
                              value={searchCategory}
                              onChange={(e) => setSearchCategory(e.target.value)}
                              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent py-2 pl-10 pr-3 text-sm outline-none"
                            />
                          </div>
    
                        
                          <div className="max-h-60 overflow-y-auto ">
                            {filteredCategories.length > 0 ? (
                              filteredCategories.map((category) => (
                                <button
                                  key={category.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      category: category.id,
                                    }));
    
                                    setIsCategoryOpen(false);
                                    setSearchCategory("");
                                  }}
                                  className="flex w-full items-center my-2 justify-between capitalize px-4 py-2 text-left text-sm hover:bg-cyan-50 dark:hover:bg-gray-700"
                                >
                                  <span>{category.name}</span>
    
                                  {formData.category === category.id && (
                                    <FiCheck className="text-cyan-600" />
                                  )}
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-gray-500">
                                No category found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
    {/* <select
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
    </select> */}
  </div>

   <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Add Manager
                  </label>
  
                  {/* <select
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
                  )} */}

                                    <div className="relative w-full" ref={managerDropdownRef}>
                                      
                                        <button
                                          type="button"
                                          onClick={() => setIsManagerOpen(!isManagerOpen)}
                                          className="w-full flex items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm"
                                        >
                                          <span>Select Manager</span>
                  
                                          <FiChevronDown
                                            className={`transition-transform ${
                                              isManagerOpen ? "rotate-180" : ""
                                            }`}
                                          />
                                        </button>
                  
                                        {isManagerOpen && (
                                          <div className="absolute left-0 right-0 mt-2 rounded-lg border border-slate-200 bg-white dark:bg-gray-800 shadow-lg z-50">
                  
                                          
                                            <div className="relative p-2 border-b border-slate-300 dark:border-gray-700">
                                              <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                  
                                              <input
                                                value={searchManager}
                                                onChange={(e) => setSearchManager(e.target.value)}
                                                placeholder="Search user..."
                                                className="w-full border border-slate-200 rounded-md py-2 pl-10 pr-3 text-sm bg-transparent outline-none"
                                              />
                                            </div>
                  
                                            {/* Users */}
                                            <div className="max-h-60 overflow-y-auto mt-2">
                                              {filteredManager.length ? (
                                                filteredManager.map((user) => (
                                                  <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => {
                                                    
                                                      setSearchManager("");
                                                      setIsManagerOpen(false);
                                                      handleAddManager(user.id);
                                                    }}
                                                    className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-cyan-50 dark:hover:bg-gray-700"
                                                  >
                                                    <div>
                                                      <p className="font-medium capitalize">
                                                        {user.firstName} {user.lastName}
                                                      </p>
                  
                                                      <p className="text-xs text-gray-500">
                                                        {user.userRole.map((role) => role.name).join(", ")}
                                                      </p>
                                                    </div>
                  
                                                    <FiCheck className="opacity-0 group-hover:opacity-100" />
                                                  </button>
                                                ))
                                              ) : (
                                                <div className="p-4 text-slate-500 text-sm">
                                                  No user found
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      {formData.manager.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {formData.manager.map((managerId) => {
                                            const user = userData.find((u) => u.id === managerId);
                                            if (!user) return null;
                  
                                            return (
                                              <span
                                                key={managerId}
                                                className="flex items-center gap-2 bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm"
                                              >
                                                {user.firstName} {user.lastName}
                  
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveManager(managerId)}
                                                >
                                                  <FaXmark />
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

    {/* <select
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
    </div> */}
    <div className="relative w-full" ref={userDropdownRef}>
                      
                        <button
                          type="button"
                          onClick={() => setIsUserOpen(!isUserOpen)}
                          className="w-full flex items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm"
                        >
                          <span>Select User</span>
  
                          <FiChevronDown
                            className={`transition-transform ${
                              isUserOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
  
                        {isUserOpen && (
                          <div className="absolute left-0 right-0 mt-2 rounded-lg border border-slate-200 bg-white dark:bg-gray-800 shadow-lg z-50">
  
                            {/* Search */}
                            <div className="relative p-2 border-b border-slate-300 dark:border-gray-700">
                              <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
  
                              <input
                                value={searchUser}
                                onChange={(e) => setSearchUser(e.target.value)}
                                placeholder="Search user..."
                                className="w-full border border-slate-200 rounded-md py-2 pl-10 pr-3 text-sm bg-transparent outline-none"
                              />
                            </div>
  
                            {/* Users */}
                            <div className="max-h-60 overflow-y-auto mt-2">
                              {filteredUsers.length ? (
                                filteredUsers.map((user) => (
                                  <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => {
                                      handleAddMember(user.id);
                                      setSearchUser("");
                                      setIsUserOpen(false);
                                    }}
                                    className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-cyan-50 dark:hover:bg-gray-700"
                                  >
                                    <div>
                                      <p className="font-medium capitalize">
                                        {user.firstName} {user.lastName}
                                      </p>
  
                                      <p className="text-xs text-gray-500">
                                        {user.userRole.map((role) => role.name).join(", ")}
                                      </p>
                                    </div>
  
                                    <FiCheck className="opacity-0 group-hover:opacity-100" />
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-sm text-gray-500">
                                  No user found
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {formData.members.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.members.map((memberId) => {
                            const user = userData.find((u) => u.id === memberId);
                            if (!user) return null;
  
                            return (
                              <span
                                key={memberId}
                                className="flex items-center gap-2 bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm"
                              >
                                {user.firstName} {user.lastName}
  
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(memberId)}
                                >
                                  <FaXmark />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}



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
      className="rounded-md border border-gray-300 dark:border-gray-300/30 px-3 py-2 outline-none "
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
