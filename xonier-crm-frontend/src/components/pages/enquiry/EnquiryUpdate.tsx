
import React, { JSX } from 'react'
import Input from '../../ui/Input'
import FormButton from '../../ui/FormButton'
import { UpdateEnquiryCompProps } from '@/src/types/enquiry/enquiry.types'
import { PRIORITY, PROJECT_TYPES, SOURCE } from '@/src/constants/enum'

const EnquiryUpdate = ({isLoading, formData, setFormData, handleSubmit,usersData, err}:UpdateEnquiryCompProps):JSX.Element => {
  return (
    <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full">
        <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
          Update Enquiry
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
              {Object.values(PRIORITY).map((p, i) => (
                <option key={i} value={p}>
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
              {Object.values(PROJECT_TYPES).map((type, i) => (
                <option key={i} value={type}>
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
              {Object.values(SOURCE).map((src, i) => (
                <option key={i} value={src}>
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
  )
}

export default EnquiryUpdate
