import re

file_path = "../xonier-crm-frontend/src/components/pages/pipeline/PipelineContent.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add Fi icons import if not present
if "from \"react-icons/fi\"" not in content:
    content = content.replace(
        'import { FaPlus } from "react-icons/fa6";',
        'import { FaPlus } from "react-icons/fa6";\nimport { FiLayers, FiUsers, FiActivity, FiBriefcase, FiTrendingUp } from "react-icons/fi";'
    )

new_return = """
  // Mock data for the stats breakdown (as requested by user)
  const LEAD_STATS = [
    { label: "Interested", count: 74 },
    { label: "Hot Follow Up", count: 3 },
    { label: "Cold Follow up", count: 5 },
    { label: "Details Shared", count: 40 },
    { label: "Call Back", count: 139 },
    { label: "Future Lead", count: 40 },
    { label: "Demo Rescheduled", count: 3 },
    { label: "Demo Scheduled", count: 11 },
    { label: "ERPJEE", count: 3 },
    { label: "HRJEE", count: 8 },
    { label: "Custom Requirement", count: 0 },
    { label: "CRM", count: 0 },
    { label: "Demo Pending", count: 1 },
    { label: "Demo Completed", count: 5 },
    { label: "Follow-up Requested", count: 0 },
    { label: "Pricing Discussion Needed", count: 0 },
    { label: "Decision Pending", count: 8 },
    { label: "Feature Request", count: 0 },
    { label: "Future Prospect", count: 0 },
    { label: "No Need", count: 1 },
    { label: "Not Interested", count: 2 },
    { label: "Purchased Other Software", count: 2 },
    { label: "Deny to Take Meeting", count: 0 },
    { label: "Invalid Meeting", count: 1 },
    { label: "Satisfy with Existing Software", count: 0 },
    { label: "Searching another software", count: 0 },
    { label: "Payment pending", count: 0 },
    { label: "Part payment received", count: 0 },
    { label: "Under negotiation", count: 3 },
  ];

  // Calculate totals
  const totalCampaigns = campaigns.length;
  // Calculate total leads from the backend data if possible, or just mock it based on the sum
  const totalLeads = campaigns.reduce((acc, camp) => acc + (camp.totalLeads || 0), 0) || LEAD_STATS.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-6 p-6 overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
      
      {/* LEFT PANEL - STATS */}
      <div className="w-full lg:w-[320px] xl:w-[380px] flex flex-col gap-4 h-full shrink-0">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          <FiTrendingUp className="text-cyan-500" />
          Pipeline Overview
        </h2>
        
        <div className="grid grid-cols-2 gap-4 shrink-0">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60 flex flex-col justify-center items-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-cyan-50 dark:bg-cyan-900/20 rounded-full transition-transform group-hover:scale-150"></div>
            <FiLayers className="text-cyan-500 text-xl mb-2 relative z-10" />
            <span className="text-3xl font-bold text-gray-800 dark:text-white relative z-10">{totalCampaigns}</span>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1 relative z-10">Campaigns</span>
          </div>
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-4 rounded-xl shadow-md border border-transparent flex flex-col justify-center items-center relative overflow-hidden group">
            <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full transition-transform group-hover:scale-150"></div>
            <FiUsers className="text-white text-xl mb-2 relative z-10" />
            <span className="text-3xl font-bold text-white relative z-10">{totalLeads}</span>
            <span className="text-xs font-medium text-cyan-100 uppercase tracking-wider mt-1 relative z-10">Total Leads</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60 flex flex-col flex-1 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/80">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <FiActivity className="text-cyan-500" />
              Lead Status Breakdown
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
            <ul className="space-y-1">
              {LEAD_STATS.map((stat, idx) => (
                <li key={idx} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">{stat.label}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stat.count > 0 ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {stat.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - CAMPAIGNS */}
      <div className="flex-1 flex flex-col bg-transparent h-full overflow-hidden">
        {/* Header section */}
        <div className="flex justify-between items-end mb-6 shrink-0 pt-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("Campaigns") || "Campaigns"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t("Manage your active pipelines") || "Manage your active pipelines"}
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 shadow-md transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-offset-gray-900"
          >
            <FaPlus />
            {t("Create Campaign") || "Create Campaign"}
          </button>
        </div>

        {/* List section */}
        <div className="flex-1 overflow-y-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 pr-2">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm h-40">
                  <Skeleton height={24} width="60%" className="mb-4" />
                  <Skeleton height={16} width="40%" className="mb-2" />
                  <Skeleton height={16} width="30%" />
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <FiBriefcase className="text-gray-400 text-2xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Campaigns Found</h3>
              <p className="text-gray-500 text-sm mt-1 text-center max-w-sm">You haven't created any campaigns yet. Click the button above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {campaigns.map((camp) => (
                <div
                  key={camp.id || camp._id}
                  onClick={() => setSelectedCampaign(camp)}
                  className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200/60 dark:border-gray-700 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-[180px]"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="pr-2">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1" title={camp.name}>
                        {camp.name}
                      </h3>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1.5 font-medium uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                        {camp.distributionMode.replace("_", " ")}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={camp.status} />
                    </div>
                  </div>
                  
                  <div className="mt-auto grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-1">Managers</span>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200">
                        <FiUsers className="text-gray-400" />
                        {camp.managers?.length || 0}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-1">Agents</span>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200">
                        <FiUsers className="text-gray-400" />
                        {camp.agents?.length || 0}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-gray-700/30">
                    <span><CreatedAt timestamp={camp.createdAt} /></span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1">
                      View <span className="text-lg leading-none">&rarr;</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {!isLoading && campaigns.length > 0 && (
            <div className="mt-8 flex justify-center pb-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateCampaignModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchCampaigns();
          }}
        />
      )}
    </div>
  );
"""

# Extract the existing code up to "return (" line inside the component body
start_idx = content.find("return (", content.find("  // If a campaign is selected, show the detail view"))
end_idx = content.rfind("};")

if start_idx != -1 and end_idx != -1:
    final_content = content[:start_idx] + new_return + "\n" + content[end_idx:]
    with open(file_path, "w") as f:
        f.write(final_content)
    print("Successfully replaced.")
else:
    print("Could not find start or end index.")
