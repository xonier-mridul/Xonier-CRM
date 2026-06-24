
import { BsBarChartFill } from "react-icons/bs";
import { IoIosFunnel } from 'react-icons/io';
import { FaCalendarDays, FaUsers } from 'react-icons/fa6';
import { PiFileTextFill } from "react-icons/pi";
import { AiOutlineProduct } from 'react-icons/ai'
import { RiFileEditLine } from "react-icons/ri";
import { FaUserGroup } from "react-icons/fa6";
import { LuCircleDollarSign, LuTarget } from "react-icons/lu"
import lead from '../assets/LeadPipeline.png'
import team from '../assets/TeamOverview.png'
import rev from '../assets/Revenue.png'

export const dashFeatureData =

    [
        {
            "id": 1,
            "title": "At-a-Glance Overview",
            "description": "Monitor key metrics and KPIs in real-time. Get a snapshot of what matters most.",
            "icon": <BsBarChartFill />,
            "iconBg": "#EFF6FF",
            "iconBorder": "#93C5FD",
            "iconColor": "#2563EB",
            "cardBorder": "#BFDBFE",
            "cardGradient": "from-blue-50 to-transparent"
        },
        {
            "id": 2,
            "title": "Lead & Sales Pipeline",
            "description": "Track every lead and deal across the pipeline. Know exactly where you stand.",
            "icon": <IoIosFunnel />,
            "iconBg": "#ECFDF5",
            "iconBorder": "#86EFAC",
            "iconColor": "#16A34A",
            "cardBorder": "#BBF7D0",
            "cardGradient": "from-green-50 to-transparent"
        },
        {
            "id": 3,
            "title": "Revenue Tracking",
            "description": "Monitor earnings, conversions, and financial performance in real-time.",
            "icon": <LuCircleDollarSign />,
            "iconBg": "#FFF7ED",
            "iconBorder": "#FDBA74",
            "iconColor": "#EA580C",
            "cardBorder": "#FED7AA",
            "cardGradient": "from-orange-50 to-transparent"
        },
        {
            "id": 4,
            "title": "Team Performance",
            "description": "Manage users, teams, and activities effortlessly. Boost productivity together.",
            "icon": <FaUsers />,
            "iconBg": "#F5F3FF",
            "iconBorder": "#C4B5FD",
            "iconColor": "#7C3AED",
            "cardBorder": "#DDD6FE",
            "cardGradient": "from-violet-50 to-transparent"
        },
        {
            "id": 5,
            "title": "Activity Calendar",
            "description": "Stay on top of important tasks, meetings, and follow-ups.",
            "icon": <FaCalendarDays />,
            "iconBg": "#FDF2F8",
            "iconBorder": "#F9A8D4",
            "iconColor": "#DB2777",
            "cardBorder": "#FBCFE8",
            "cardGradient": "from-pink-50 to-transparent"
        },
        {
            "id": 6,
            "title": "Custom Reports",
            "description": "Create custom reports and download insights in just a few clicks.",
            "icon": <PiFileTextFill />,
            "iconBg": "#ECFEFF",
            "iconBorder": "#67E8F9",
            "iconColor": "#0891B2",
            "cardBorder": "#A5F3FC",
            "cardGradient": "from-cyan-50 to-transparent"
        }
    ]


export const heroData = [
    { id: 1, icon: <AiOutlineProduct />, head: 'Real-time insights and analysis.', color: 'bg-cyan-50 border border-cyan-500 text-cyan-500' },
    { id: 2, icon: <FaUserGroup />, head: 'Track leads, revenue & team performance.', color: 'bg-cyan-50 border border-cyan-500 text-cyan-500' },
    { id: 3, icon: <RiFileEditLine />, head: 'Customizable widget and reports.', color: 'bg-cyan-50 border border-cyan-500 text-cyan-500' },

]


export const insightsData = [
    {
        "id": 1,
        "title": "Team Overview",
        "description": "Get a clear view of user distribution, activity status, and team engagement across your organization.",
        "icon": <FaUsers />,
        "iconBg": "#F5F3FF",
        "iconBorder": "#C4B5FD",
        "iconColor": "#7C3AED",
        "cardBorder": "#DDD6FE",
        "image": team,

    },
    {
        "id": 2,
        "title": "Lead Pipeline",
        "description": "Visualize lead movement through every stage and identify opportunities to improve conversions.",
        "icon": <LuTarget />,
        "iconBg": "#ECFEFF",
        "iconBorder": "#67E8F9",
        "iconColor": "#0891B2",
        "cardBorder": "#A5F3FC",
        "image": lead,

    },
    {
        "id": 3,
        "title": "Revenue & Conversion",
        "description": "Track revenue performance, deal values, close rates, and conversion metrics in real-time.",
        "icon": <LuCircleDollarSign />,
        "iconBg": "#FFF7ED",
        "iconBorder": "#FDBA74",
        "iconColor": "#EA580C",
        "cardBorder": "#FED7AA",
        "image": rev,

    }
]
