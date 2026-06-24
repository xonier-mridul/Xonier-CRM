
export const productPages = [
    {
        id: 1,
        slug: "task-management",
        title: "Task Management",
        shortDesc:
            "Plan, assign, prioritize, and track tasks from a centralized workspace.",

        hero: {
            badge: "Product",
            title: "Task Management Built for ",
            title2: 'High-Performing Teams',
            desc: "Organize projects, streamline workflows, and ensure every task is completed on time with complete visibility."
        },

        stats: [
            { number: "35", suf: '%', label: "Higher Productivity", style: '' },
            { number: "50", suf: '%', label: "Fewer Delays", style: 'border-l border-white/20' },
            { number: "10", suf: 'K+', label: "Tasks Managed", style: 'col-span-2 md:col-span-1 md:border-l border-white/20' }
        ],

        features: [
            {
                title: "Task Assignment",
                desc: "Assign tasks to individuals or teams with clear ownership.",
                icon: "ClipboardCheck",
                color: "#1ba2c3",
                bgColor: "#E8F8FC"
            },
            {
                title: "Priority Management",
                desc: "Set priorities and focus on what matters most.",
                icon: "Flag",
                color: "#33bf8b",
                bgColor: "#EAFBF5"
            },
            {
                title: "Due Dates & Reminders",
                desc: "Keep projects on track with deadlines and notifications.",
                icon: "CalendarClock",
                color: "#16c2cf",
                bgColor: "#ECFCFD"
            },
            {
                title: "Kanban Boards",
                desc: "Visualize workflows and monitor progress easily.",
                icon: "LayoutDashboard",
                color: "#1ba2c3",
                bgColor: "#E8F8FC"
            }
        ],

        benefits: [
            {
                title: "Increase Productivity",
                desc: "Reduce time spent on manual coordination and improve efficiency.",
                icon: "TrendingUp",
                color: "#33bf8b",
                stat: "35% Faster"
            },
            {
                title: "Complete Visibility",
                desc: "Track every task and project status in real time.",
                icon: "Eye",
                color: "#1ba2c3",
                stat: "100% Transparency"
            },
            {
                title: "Improve Accountability",
                desc: "Clear ownership ensures work gets completed.",
                icon: "UserCheck",
                color: "#16c2cf",
                stat: "Higher Ownership"
            }
        ],

        useCases: [
            {
                title: "Project Management",
                desc: "Plan and execute projects with confidence.",
                icon: "FolderKanban",
                color: "#1ba2c3"
            },
            {
                title: "Marketing Teams",
                desc: "Manage campaigns and content production.",
                icon: "Megaphone",
                color: "#16c2cf"
            },
            {
                title: "Software Development",
                desc: "Track sprints, bugs, and releases.",
                icon: "Code2",
                color: "#33bf8b"
            }
        ],

        faq: [
            {
                question: "Can I assign tasks to multiple users?",
                answer: "Yes, tasks can be assigned to individuals or teams."
            },
            {
                question: "Can I track task progress?",
                answer: "Yes, Trackeroo provides real-time progress tracking."
            }
        ]
    },

    {
        id: 2,
        slug: "sales-crm",
        title: "Sales CRM",
        shortDesc:
            "Manage leads, contacts, opportunities, and customer relationships from one platform.",

        hero: {
            badge: "Product",
            title: "Sales CRM That Helps ",
            title2: 'You Close More Deals',
            desc: "Track leads, manage pipelines, automate follow-ups, and improve sales performance."
        },

        stats: [
            { number: "40", suf: '%', label: "More Qualified Leads", style: '' },
            { number: "25", suf: '%', label: "Higher Conversion", style: 'border-l border-white/20' },
            { number: "3", suf: 'X', label: "Pipeline Visibility", style: 'col-span-2 md:col-span-1 md:border-l border-white/20' }
        ],

        features: [
            {
                title: "Lead Management",
                desc: "Capture, organize, and nurture leads effectively.",
                icon: "Users",
                color: "#1ba2c3",
                bgColor: "#E8F8FC"
            },
            {
                title: "Pipeline Tracking",
                desc: "Monitor opportunities across every sales stage.",
                icon: "GitBranch",
                color: "#33bf8b",
                bgColor: "#EAFBF5"
            },
            {
                title: "Contact Management",
                desc: "Store customer information in one secure place.",
                icon: "Contact",
                color: "#16c2cf",
                bgColor: "#ECFCFD"
            },
            {
                title: "Sales Reporting",
                desc: "Gain actionable insights with detailed analytics.",
                icon: "BarChart3",
                color: "#1ba2c3",
                bgColor: "#E8F8FC"
            }
        ],

        benefits: [
            {
                title: "Boost Revenue",
                desc: "Convert more opportunities into paying customers.",
                icon: "DollarSign",
                color: "#33bf8b",
                stat: "25% More Sales"
            },
            {
                title: "Improve Customer Relationships",
                desc: "Keep every interaction organized and accessible.",
                icon: "Handshake",
                color: "#1ba2c3",
                stat: "Better Retention"
            },
            {
                title: "Faster Sales Cycles",
                desc: "Reduce delays with automation and visibility.",
                icon: "Zap",
                color: "#16c2cf",
                stat: "2X Faster"
            }
        ],

        useCases: [
            {
                title: "Sales Teams",
                desc: "Track opportunities and manage pipelines.",
                icon: "Target",
                color: "#1ba2c3"
            },
            {
                title: "Business Development",
                desc: "Generate and nurture high-quality leads.",
                icon: "TrendingUp",
                color: "#33bf8b"
            },
            {
                title: "Account Management",
                desc: "Build long-term customer relationships.",
                icon: "Briefcase",
                color: "#16c2cf"
            }
        ]
    },

    {
        id: 3,
        slug: "support-tickets",
        title: "Support Tickets",
        shortDesc:
            "Manage customer support requests and deliver exceptional service.",

        hero: {
            badge: "Product",
            title: "Customer Support ",
            title2: 'Ticketing Made Simple',
            desc: "Organize requests, automate workflows, and resolve issues faster."
        },

        stats: [
            { number: "60", suf: '%', label: "Faster Resolution", style: '' },
            { number: "95", suf: '%', label: "Customer Satisfaction", style: 'border-l border-white/20' },
            { number: "24", suf: '/7', label: "Ticket Tracking", style: 'col-span-2 md:col-span-1 md:border-l border-white/20' }
        ],

        features: [
            {
                title: "Ticket Management",
                desc: "Create, assign, and resolve support requests.",
                icon: "Ticket",
                color: "#1ba2c3",
                bgColor: "#E8F8FC"
            },
            {
                title: "Priority Routing",
                desc: "Automatically assign tickets to the right team.",
                icon: "Route",
                color: "#33bf8b",
                bgColor: "#EAFBF5"
            },
            {
                title: "Knowledge Base",
                desc: "Help customers find answers independently.",
                icon: "BookOpen",
                color: "#16c2cf",
                bgColor: "#ECFCFD"
            },
            {
                title: "SLA Tracking",
                desc: "Monitor response and resolution times.",
                icon: "Clock3",
                color: "#1ba2c3",
                bgColor: "#E8F8FC"
            }
        ],

        benefits: [
            {
                title: "Improve Satisfaction",
                desc: "Resolve issues faster and provide better experiences.",
                icon: "Smile",
                color: "#33bf8b",
                stat: "95% Satisfaction"
            },
            {
                title: "Reduce Response Time",
                desc: "Automate workflows and prioritize critical issues.",
                icon: "Timer",
                color: "#16c2cf",
                stat: "60% Faster"
            },
            {
                title: "Support Visibility",
                desc: "Track every customer request from start to finish.",
                icon: "Eye",
                color: "#1ba2c3",
                stat: "Full Visibility"
            }
        ],

        useCases: [
            {
                title: "Customer Support",
                desc: "Handle requests efficiently and consistently.",
                icon: "Headphones",
                color: "#1ba2c3"
            },
            {
                title: "IT Help Desk",
                desc: "Manage internal technical support operations.",
                icon: "MonitorCog",
                color: "#33bf8b"
            },
            {
                title: "Service Teams",
                desc: "Deliver reliable customer assistance.",
                icon: "LifeBuoy",
                color: "#16c2cf"
            }
        ]
    },

    {
        id: 4,
        slug: "integrations",
        title: "Integrations",
        shortDesc:
            "Connect Trackeroo with the tools your teams already use.",

        hero: {
            badge: "Product",
            title: "Integrations That Keep ",
            title2: 'Work Connected',
            desc: "Sync data, automate workflows, and eliminate information silos."
        },

        stats: [
            { number: "50", suf: '+', label: "Integration Options", style: '' },
            { number: "90", suf: '%', label: "Less Manual Work", style: 'border-l border-white/20' },
            { number: "24", suf: '/7', label: "Data Sync", style: 'col-span-2 md:col-span-1 md:border-l border-white/20' }
        ],

        features: [
            {
                title: "Third-Party Integrations",
                desc: "Connect productivity and business applications.",
                icon: "Plug",
                color: "#1ba2c3",
                bgColor: "#E8F8FC"
            },
            {
                title: "API Access",
                desc: "Build custom integrations for your business.",
                icon: "Code",
                color: "#33bf8b",
                bgColor: "#EAFBF5"
            },
            {
                title: "Workflow Automation",
                desc: "Automate repetitive actions between systems.",
                icon: "Workflow",
                color: "#16c2cf",
                bgColor: "#ECFCFD"
            },
            {
                title: "Webhooks",
                desc: "Receive real-time updates from connected tools.",
                icon: "Webhook",
                color: "#1ba2c3",
                bgColor: "#E8F8FC"
            }
        ],

        benefits: [
            {
                title: "Connected Ecosystem",
                desc: "Bring all business tools together.",
                icon: "Network",
                color: "#33bf8b",
                stat: "50+ Apps"
            },
            {
                title: "Reduce Manual Work",
                desc: "Automate repetitive processes.",
                icon: "Bot",
                color: "#16c2cf",
                stat: "90% Less Effort"
            },
            {
                title: "Real-Time Sync",
                desc: "Keep systems updated automatically.",
                icon: "RefreshCw",
                color: "#1ba2c3",
                stat: "Instant Updates"
            }
        ],

        useCases: [
            {
                title: "Enterprise Operations",
                desc: "Integrate multiple business systems.",
                icon: "Building2",
                color: "#1ba2c3"
            },
            {
                title: "Marketing Automation",
                desc: "Connect campaigns and lead generation tools.",
                icon: "Megaphone",
                color: "#16c2cf"
            },
            {
                title: "Sales Workflows",
                desc: "Synchronize CRM and productivity platforms.",
                icon: "Handshake",
                color: "#33bf8b"
            }
        ]
    }
];