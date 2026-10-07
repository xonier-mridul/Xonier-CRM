import re

file_path = "../xonier-crm-frontend/src/components/pages/pipeline/PipelineContent.tsx"
with open(file_path, "r") as f:
    content = f.read()

# I need to add state for activeTab
if "const [activeTab, setActiveTab]" not in content:
    content = content.replace(
        "const [selectedCampaign, setSelectedCampaign] = useState<ICampaign | null>(null);",
        "const [selectedCampaign, setSelectedCampaign] = useState<ICampaign | null>(null);\n  const [activeTab, setActiveTab] = useState<'Fresh Inquiry' | 'In-progress' | 'Lost'>('Fresh Inquiry');"
    )

new_stats_data = """
  const STATS_DATA = {
    'Fresh Inquiry': [
      { label: "CRMJEE Requirement", count: 1, color: "bg-red-500" },
      { label: "HRJEE Requirement", count: 54, color: "bg-cyan-400" },
      { label: "ERPJEE", count: 167, color: "bg-yellow-400" },
      { label: "Custom Requirement", count: 80, color: "bg-yellow-600" }
    ],
    'In-progress': [
      { label: "Interested", count: 77, color: "bg-red-500" },
      { label: "Hot Follow Up", count: 3, color: "bg-cyan-400" },
      { label: "Cold Follow up", count: 5, color: "bg-yellow-400" },
      { label: "Details Shared", count: 40, color: "bg-yellow-600" },
      { label: "Call Back", count: 141, color: "bg-indigo-900" },
      { label: "future lead", count: 40, color: "bg-slate-900" }
    ],
    'Lost': [
      { label: "demo done dropped", count: 0, color: "bg-red-500" },
      { label: "Not Interested", count: 582, color: "bg-cyan-400" },
      { label: "Plan Postponed", count: 7, color: "bg-yellow-400" },
      { label: "No Requirement", count: 412, color: "bg-yellow-600" },
      { label: "Budget Issue", count: 2, color: "bg-indigo-900" },
      { label: "Lost to Competition", count: 3, color: "bg-slate-900" }
    ]
  };

  const totalCampaigns = campaigns.length;
  const totalLeads = campaigns.reduce((acc, camp) => acc + (camp.totalLeads || 0), 0) || 1515; // Just a mock sum
"""

# Replace LEAD_STATS and total calculation
content = re.sub(
    r"// Mock data for the stats breakdown.*?const totalLeads = [^\n]+;",
    new_stats_data.strip(),
    content,
    flags=re.DOTALL
)

new_ui = """
        <div className="flex flex-col flex-1 overflow-hidden mt-2">
          {/* Tabs */}
          <div className="flex justify-between items-center px-1 mb-2">
            {['Fresh Inquiry', 'In-progress', 'Lost'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`text-sm font-bold pb-1 transition-colors uppercase tracking-wider relative ${
                  activeTab === tab 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-500 rounded-t-md"></div>
                )}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          <div className="bg-gray-100 dark:bg-gray-800/80 rounded-xl p-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            <ul className="space-y-4">
              {STATS_DATA[activeTab].map((stat, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-md shrink-0 ${stat.color}`}></div>
                  <span className="text-[15px] font-medium text-gray-600 dark:text-gray-300">
                    {stat.label} ({stat.count})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
"""

# Replace the previous stats box
content = re.sub(
    r'<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60 flex flex-col flex-1 overflow-hidden">.*?</ul>\s*</div>\s*</div>',
    new_ui.strip(),
    content,
    flags=re.DOTALL
)

with open(file_path, "w") as f:
    f.write(content)
print("Updated Tabs UI successfully")
