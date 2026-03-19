import { FilterConfig } from "@/src/types/prospect/filterSideBar.types";
import {SALES_STATUS , PROJECT_TYPES} from "@/src/constants/enum";
import {
  FaSearch,
  FaMapMarkerAlt,
  FaUsers,
  FaTag,
  FaDollarSign,
  FaBriefcase,
  FaCog,
  FaChartBar,
  FaMoneyBill,
  FaCalendar,
  FaUserTie,
  FaGlobe,
  FaCrown,
} from "react-icons/fa";
import { GiFilmProjector } from "react-icons/gi";

const filterOptions: FilterConfig = {
  sections: [
    
    {
      key: "businessDescription",
      label: "Business description",
      icon: FaSearch,
      defaultOpen: true,
      type : "company",
      fields: [
        {
          key: "businessDescription_text",
          type: "text",
          placeholder: "e.g. real estate agency",
        },
        {
          key: "businessType",
          type: "checkbox_group",
          options: [
            { label: "B2B", value: "b2b", info: "Business to Business" },
            { label: "SaaS", value: "saas", info: "Software as a Service" },
            { label: "Tech company", value: "tech_company" },
            { label: "Startup", value: "startup" },
            { label: "Merchant", value: "merchant" },
            { label: "Digital", value: "digital" },
            { label: "AI", value: "ai" },
          ],
        },
      ],
      subSections: [
        {
          label: "INDUSTRY",
          collapsible: true,
          fields: [
            {
              key: "industry_section",
              label: "Section",
              type: "select",
              placeholder: "Select section...",
              options: [
                { label: "Technology", value: "technology" },
                { label: "Finance", value: "finance" },
                { label: "Healthcare", value: "healthcare" },
                { label: "Retail", value: "retail" },
                { label: "Manufacturing", value: "manufacturing" },
                { label: "Real Estate", value: "real_estate" },
                { label: "Education", value: "education" },
                { label: "Media", value: "media" },
              ],
            },
            {
              key: "industry_class",
              label: "Class",
              type: "select",
              placeholder: "Select class...",
              options: [
                { label: "Enterprise", value: "enterprise" },
                { label: "Mid-Market", value: "mid_market" },
                { label: "SMB", value: "smb" },
                { label: "Startup", value: "startup" },
              ],
            },
          ],
        },
        /*
        {
          label: "EXCLUDE",
          collapsible: true,
          fields: [
            {
              key: "businessDescription_exclude",
              type: "text",
              placeholder: "e.g. agencies, consulting",
            },
          ],
        },
        */
      ],
      /*
      aiEnrichment: {
        label: "AI Enrichment — free",
        description: "Enrich 500 companies with 3 criteria",
        ctaText: "+ Add criteria",
      },
      */
    },
    {
      key: "location",
      label: "Location",
      icon: FaMapMarkerAlt,
      defaultOpen: true,
      type : "both",
      fields: [
        {
          key: "location_country",
          label: "Country",
          type: "multi_select",
          placeholder: "Select country...",
          options: [
            { label: "United States", value: "us" },
            { label: "United Kingdom", value: "uk" },
            { label: "India", value: "in" },
            { label: "Germany", value: "de" },
            { label: "France", value: "fr" },
            { label: "Canada", value: "ca" },
            { label: "Australia", value: "au" },
            { label: "Singapore", value: "sg" },
          ],
        },
        {
          key: "location_type",
          type: "checkbox_group",
          options: [
            { label: "Company headquarters", value: "hq", info: "Primary company location" },
            { label: "Customer locations", value: "customer", info: "Where customers are based" },
          ],
        },
      ],
      subSections: [
        {
          label: "ADVANCED",
          collapsible: true,
          fields: [
            {
              key: "location_city",
              label: "City, state, region",
              type: "select",
              placeholder: "Select city or region...",
              options: [
                { label: "New York", value: "new_york" },
                { label: "London", value: "london" },
                { label: "San Francisco", value: "san_francisco" },
                { label: "Berlin", value: "berlin" },
                { label: "Mumbai", value: "mumbai" },
                { label: "Toronto", value: "toronto" },
              ],
            },
          ],
        },
        /*
        {
          label: "EXCLUDE",
          collapsible: true,
          fields: [
            {
              key: "location_exclude",
              type: "multi_select",
              placeholder: "Exclude countries...",
              options: [
                { label: "United States", value: "us" },
                { label: "United Kingdom", value: "uk" },
                { label: "China", value: "cn" },
                { label: "Russia", value: "ru" },
              ],
            },
          ],
        },
        */
      ],
    },
    {
      key: "employeeCount",
      label: "Employee count",
      icon: FaUsers,
      defaultOpen: true,
      type : "company",
      fields: [
        {
          key: "employeeCount_range",
          type: "range_slider",
          sliderConfig: {
            min: 1,
            max: 10000,
            step: 1,
            defaultValue: [1, 10000], // 👈 allows min & max control
            formatLabel: (v: number) =>
              v >= 10000 ? "10,000+" : v.toLocaleString(),
          },
        },
      ],
      subSections: [
        {
          label: "ADVANCED",
          collapsible: true,
          fields: [
            {
              key: "staffGrowth",
              label: "Staff growth: year over year",
              type: "checkbox_group",
              info: "Based on LinkedIn headcount data",
              options: [
                { label: "High growth (>50%)", value: "high_growth" },
                { label: "Growing (10-50%)", value: "growing" },
                { label: "Stable (±10%)", value: "stable" },
                { label: "Declining (<10%)", value: "declining" },
              ],
            },
          ],
        },
      ],
    },
    {
      key: "status",
      label: "Lead Status",
      icon: FaTag,
      defaultOpen: false,
      type : "both",
      fields: [
        {
          key: "status",
          type: "checkbox_group",
          options: Object.values(SALES_STATUS).map((status) => ({ label: status, value: status })),
        },
      ],
    },
    {
      key: "projectType",
      label: "Project Type",
      icon: GiFilmProjector,
      defaultOpen: false,
      type : "company",
      fields: [
        {
          key: "projectType",
          type: "checkbox_group",
          options: Object.values(PROJECT_TYPES).map((type) => ({ label: type, value: type })),
          info: "Project Type",
        },
      ],
    },  
    {
      key: "annualRevenue",
      label: "Annual Revenue",
      icon: FaDollarSign,
      defaultOpen: false,
      type : "company",
      fields: [
        {
          key: "revenue_range",
          type: "range_slider",
          sliderConfig: {
            min: 0,
            max: 1000000000,
            step: 1000000,
            formatLabel: (v) => {
              if (v >= 1000000000) return "$1B+";
              if (v >= 1000000) return `$${v / 1000000}M`;
              if (v >= 1000) return `$${v / 1000}K`;
              return `$${v}`;
            },
          },
        },
      ],
    },
    {
      key: "jobTitle",
      label: "Job Title",
      icon: FaBriefcase,
      defaultOpen: false,
      type : "both",
      fields: [
        {
          key: "jobTitle_text",
          type: "text",
          placeholder: "e.g. CEO, CTO, Marketing Manager",
        },
        {
          key: "jobTitle_level",
          type: "checkbox_group",
          options: [
            { label: "C-Suite", value: "c_suite" },
            { label: "VP", value: "vp" },
            { label: "Director", value: "director" },
            { label: "Manager", value: "manager" },
            { label: "Individual", value: "individual" },
          ],
        },
      ],
      /*
      subSections: [
        {
          label: "EXCLUDE",
          collapsible: true,
          fields: [
            {
              key: "jobTitle_exclude",
              type: "text",
              placeholder: "e.g. intern, assistant",
            },
          ],
        },
      ],
      */
    },
    {
      key: "technologies",
      label: "Technologies",
      icon: FaCog,
      defaultOpen: false,
      type : "company",
      fields: [
        {
          key: "technologies_include",
          type: "multi_select",
          placeholder: "Search technologies...",
          options: [
            { label: "React", value: "react" },
            { label: "Node.js", value: "nodejs" },
            { label: "Salesforce", value: "salesforce" },
            { label: "HubSpot", value: "hubspot" },
            { label: "AWS", value: "aws" },
            { label: "Azure", value: "azure" },
            { label: "Shopify", value: "shopify" },
            { label: "WordPress", value: "wordpress" },
          ],
        },
      ],
      /*
      subSections: [
        {
          label: "EXCLUDE",
          collapsible: true,
          fields: [
            {
              key: "technologies_exclude",
              type: "multi_select",
              placeholder: "Exclude technologies...",
              options: [
                { label: "React", value: "react" },
                { label: "Salesforce", value: "salesforce" },
                { label: "HubSpot", value: "hubspot" },
              ],
            },
          ],
        },
      ],
      */
    },
    {
      key: "websiteTraffic",
      label: "Website Traffic",
      icon: FaChartBar,
      defaultOpen: false,
      type : "company",
      fields: [
        {
          key: "traffic_range",
          label: "Monthly traffic",
          type: "range_slider",
          sliderConfig: {
            min: 0,
            max: 10000000,
            step: 10000,
            formatLabel: (v) => {
              if (v >= 10000000) return "10M+";
              if (v >= 1000000) return `${v / 1000000}M`;
              if (v >= 1000) return `${v / 1000}K`;
              return `<10`;
            },
          },
        },
      ],
    },
    {
      key: "funding",
      label: "Funding",
      icon: FaMoneyBill,
      defaultOpen: false,
      type : "company",
      fields: [
        {
          key: "funding_stage",
          type: "checkbox_group",
          options: [
            { label: "Pre-Seed", value: "pre_seed" },
            { label: "Seed", value: "seed" },
            { label: "Series A", value: "series_a" },
            { label: "Series B", value: "series_b" },
            { label: "Series C+", value: "series_c" },
            { label: "IPO", value: "ipo" },
            { label: "Bootstrapped", value: "bootstrapped" },
          ],
        },
        {
          key: "funding_total",
          label: "Total funding raised",
          type: "range_slider",
          sliderConfig: {
            min: 0,
            max: 500000000,
            step: 1000000,
            formatLabel: (v) => {
              if (v >= 500000000) return "$500M+";
              if (v >= 1000000) return `$${v / 1000000}M`;
              if (v >= 1000) return `$${v / 1000}K`;
              return `$${v}`;
            },
          },
        },
      ],
    },
    {
      key: "founded",
      label: "Founded",
      icon: FaCalendar,
      defaultOpen: false,
      type : "company",
      fields: [
        {
          key: "founded_range",
          type: "date_range",
          dateRangeConfig: {
            fromLabel: "From",
            toLabel: "To",
            options: [
              "2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009",
              "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019",
              "2020", "2021", "2022", "2023", "2024", "2025"
            ],
          },
        },
      ],
    },
    {
      key: "hiring",
      label: "Hiring",
      icon: FaUserTie,
      defaultOpen: false,
      type : "company",
      fields: [
        {
          key: "hiring_roles",
          type: "multi_select",
          placeholder: "Search job roles...",
          options: [
            { label: "Software Engineer", value: "swe" },
            { label: "Sales", value: "sales" },
            { label: "Marketing", value: "marketing" },
            { label: "Product Manager", value: "pm" },
            { label: "Data Scientist", value: "data" },
            { label: "Designer", value: "design" },
          ],
        },
      ],
    },
    {
      key: "remoteTeams",
      label: "Remote teams",
      icon: FaGlobe,
      defaultOpen: false,
      type : "company",
      fields: [
        {
          key: "remote_type",
          type: "checkbox_group",
          options: [
            { label: "Fully remote", value: "fully_remote" },
            { label: "Hybrid", value: "hybrid" },
            { label: "On-site only", value: "onsite" },
          ],
        },
      ],
    },
    {
      key: "foundersOrigin",
      label: "Founders origin",
      icon: FaCrown,
      defaultOpen: false,
      type : "company",
      fields: [
        {
          key: "founders_country",
          type: "multi_select",
          placeholder: "Select country of origin...",
          options: [
            { label: "United States", value: "us" },
            { label: "India", value: "in" },
            { label: "United Kingdom", value: "uk" },
            { label: "Israel", value: "il" },
            { label: "China", value: "cn" },
            { label: "Germany", value: "de" },
          ],
        },
      ],
    },
  ],
};

export default filterOptions;