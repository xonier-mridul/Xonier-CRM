import { FaCode, FaGift, FaHeart, FaPen, FaRegCalendarMinus, FaRegClock, FaUsers, FaWallet } from "react-icons/fa";
import { BsFillRocketTakeoffFill } from "react-icons/bs";
import { BiSolidZap } from "react-icons/bi";
import { FaFaceSmile } from "react-icons/fa6";
import { RiNodejsLine } from "react-icons/ri"; import { ImBriefcase } from "react-icons/im";
import { TfiHeadphoneAlt } from "react-icons/tfi";
import { IoBriefcaseOutline } from "react-icons/io5";
import { LuMapPin } from "react-icons/lu";
import { TbAward } from "react-icons/tb";
import { LiaSuitcaseSolid } from "react-icons/lia";








export const careersPageData = {
    hero: {
        badge: "Careers",
        title: "Build the Future of ",
        title2: 'Work With Us',
        desc: "At Trackeroo, we're on a mission to simplify how teams manage work. Join a team of builders, thinkers, and innovators creating tools that help businesses grow faster.",
        primaryBtn: "View Open Positions",
        secondaryBtn: "Life at Trackeroo",
        image: "/images/careers-hero.webp"
    },

    stats: [
        {
            number: "50+",
            label: "Team Members"
        },
        {
            number: "12",
            label: "Countries"
        },
        {
            number: "95%",
            label: "Employee Satisfaction"
        },
        {
            number: "100%",
            label: "Remote Friendly"
        }
    ],

    values: [
        {
            id: 1,
            title: "People First",
            desc: "We prioritize people and foster a supportive workplace culture.",
            icon: <FaUsers />,
            color: "text-[#1ba2c3] border-[#1ba2c3] bg-[#E8F8FC]",
            bgColor: "#E8F8FC"
        },
        {
            id: 2,

            title: "Growth Mindset",
            desc: "Continuous learning and improvement are at our core.",
            icon: <BsFillRocketTakeoffFill />,
            color: "text-[#33bf8b] border-[#33bf8b] bg-[#EAFBF5]",

        },
        {
            id: 3,
            title: "Make Impact",
            desc: "Every contribution directly influences our product and customers.",
            icon: <BiSolidZap />,
            color: "text-[#ff6b6b] border-[#ff6b6b] bg-[#FFF0F0]",

        },
        {
            id: 4,
            title: "Work-Life Balance",
            desc: "Flexible schedules help you thrive personally and professionally.",
            icon: <FaHeart />,
            color: "text-[#ff7eb3] border-[#ff7eb3] bg-[#FFF2F8]",

        },
        {
            id: 5,
            title: "Great Benefits",
            desc: "Competitive compensation, healthcare, and growth opportunities.",
            icon: <FaGift />,
            color: "text-[#f59e0b] border-[#f59e0b] bg-[#FFF8E7]",

        },
        {
            id: 6,
            title: "Open Culture",
            desc: "Transparency, trust, and collaboration guide everything we do.",
            icon: <FaFaceSmile />,
            color: "text-[#14b8a6] border-[#14b8a6] bg-[#ECFEFF]",

        }
    ],

    benefits: [
        {
            title: "Remote-First Environment",
            desc: "Work from anywhere while staying connected with your team.",
            icon: "Globe"
        },
        {
            title: "Competitive Salary",
            desc: "Market-leading compensation packages.",
            icon: "BadgeDollarSign"
        },
        {
            title: "Health Coverage",
            desc: "Comprehensive health and wellness support.",
            icon: "ShieldPlus"
        },
        {
            title: "Paid Time Off",
            desc: "Take time when you need it and recharge.",
            icon: "CalendarHeart"
        },
        {
            title: "Learning Budget",
            desc: "Annual budget for courses, books, and certifications.",
            icon: "GraduationCap"
        },
        {
            title: "Team Retreats",
            desc: "Meet teammates in person through annual company events.",
            icon: "Plane"
        }
    ],

    departments: [
        "All",
        "Engineering",
        "Product",
        "Design",
        "Marketing",
        "Customer Success",
        "Operations"
    ],

    openings: [
        {
            id: 1,
            slug: "frontend-developer-react",
            title: "Frontend Developer (React)",
            department: "Engineering",
            location: "Remote",
            type: "Full-Time",
            experience: "1-3 Years",
            salary: "₹5L - ₹9L",
            icon: <FaCode />,
            color: "text-[#1ba2c3] border-[#1ba2c3] bg-[#E8F8FC]",


        },
        {
            id: 2,
            title: "Backend Developer (Node.js)",
            slug: "backend-developer-node",
            department: "Engineering",
            location: "Remote",
            type: "Full-Time",
            experience: "2-4 Years",
            salary: "₹6L - ₹12L",
            icon: <RiNodejsLine />,
            color: "text-[#1ba2c3] border-[#1ba2c3] bg-[#E8F8FC]",


        },
        {
            id: 3,
            title: "Product Manager",
            slug: "product-manager",
            department: "Product",
            location: "Remote",
            type: "Full-Time",
            experience: "3-5 Years",
            salary: "₹12L - ₹18L",
            icon: <ImBriefcase />,
            color: "text-[#1ba2c3] border-[#1ba2c3] bg-[#E8F8FC]",

        },
        {
            id: 4,
            title: "UI/UX Designer",
            slug: "ui/ux-designer",
            department: "Design",
            location: "Remote",
            type: "Full-Time",
            experience: "2-4 Years",
            salary: "₹5L - ₹10L",
            icon: <FaPen />,
            color: "text-[#1ba2c3] border-[#1ba2c3] bg-[#E8F8FC]",


        },
        {
            id: 5,
            title: "Customer Success Manager",
            slug: "customer-success-manager",
            department: "Customer Success",
            location: "Remote",
            type: "Full-Time",
            experience: "2-4 Years",
            salary: "₹6L - ₹10L",
            icon: <TfiHeadphoneAlt />,
            color: "text-[#1ba2c3] border-[#1ba2c3] bg-[#E8F8FC]",


        }
    ],

    lifeAtTrackeroo: {
        title: "More Than Just a Job",
        desc: "We offer a place where talented people can learn, grow, and make a meaningful impact.",
        points: [
            "Flexible remote work",
            "Health & wellness benefits",
            "Learning & development budget",
            "Paid vacation and holidays",
            "Parental leave",
            "Performance bonuses",
            "Latest equipment",
            "Annual team retreats"
        ],
        image: "/images/team-culture.webp"
    },

    hiringProcess: [
        {
            step: "01",
            title: "Application",
            desc: "Submit your application online."
        },
        {
            step: "02",
            title: "Initial Screening",
            desc: "Quick conversation with our team."
        },
        {
            step: "03",
            title: "Technical Assessment",
            desc: "Showcase your skills through practical tasks."
        },
        {
            step: "04",
            title: "Final Interview",
            desc: "Meet team members and leadership."
        },
        {
            step: "05",
            title: "Offer & Onboarding",
            desc: "Join the Trackeroo family."
        }
    ],

    testimonials: [
        {
            name: "Sarah Johnson",
            role: "Product Designer",
            quote:
                "Trackeroo provides the freedom, support, and opportunities to do the best work of my career.",
            image: "/images/team-1.webp"
        },
        {
            name: "David Wilson",
            role: "Frontend Engineer",
            quote:
                "The culture is collaborative, transparent, and focused on growth.",
            image: "/images/team-2.webp"
        }
    ],

    faq: [
        {
            question: "Do you offer remote positions?",
            answer:
                "Yes, most of our roles are fully remote with flexible working hours."
        },
        {
            question: "What is the hiring process like?",
            answer:
                "Application → Screening → Assessment → Interview → Offer."
        },
        {
            question: "Do you hire fresh graduates?",
            answer:
                "Yes, we regularly hire interns and entry-level professionals."
        },
        {
            question: "Can I apply for multiple roles?",
            answer:
                "Absolutely. Apply for any role that matches your skills and interests."
        }
    ],

    cta: {
        title: "Don't See the Right Role?",
        desc: "We're always looking for talented people. Send us your resume and let's stay connected.",
        button: "Send Your Resume"
    }
};


export const jobDetails = [
    {
        id: 1,
        slug: "frontend-developer-react",

        title: "Frontend Developer (React)",
        department: "Engineering",
        location: "Remote",
        jobType: "Full-Time",
        experience: "1-3 Years",
        salary: "₹5L - ₹9L",
        postedOn: "May 22, 2026",

        icon: <FaCode />,

        overview: {
            title: "About the Role",
            desc: "We're looking for a talented Frontend Developer (React) to build intuitive, high-performance user interfaces that power real impact for thousands of teams worldwide. You'll collaborate with designers, product managers, and engineers to deliver exceptional user experiences."
        },

        responsibilities: {
            title: "What You'll Do",
            points: [
                "Build responsive and accessible UI components using React and Tailwind CSS.",
                "Collaborate with product and design teams to translate ideas into user experiences.",
                "Optimize applications for speed, scalability, and performance.",
                "Write clean, maintainable, and reusable code.",
                "Participate in code reviews and engineering discussions.",
                "Contribute to frontend architecture and technical decisions.",
                "Integrate REST APIs and third-party services.",
                "Ensure cross-browser compatibility and responsive design."
            ]
        },

        requirements: {
            title: "Who You Are",
            points: [
                "1-3 years of experience building web applications with React.",
                "Strong knowledge of JavaScript (ES6+), HTML5, and CSS3.",
                "Experience with Tailwind CSS.",
                "Understanding of state management solutions.",
                "Experience consuming REST APIs.",
                "Knowledge of Git and modern development workflows.",
                "Strong problem-solving skills.",
                "Excellent communication and collaboration abilities."
            ]
        },

        preferredQualifications: {
            title: "Nice To Have",
            points: [
                "Experience with TypeScript.",
                "Knowledge of Next.js.",
                "Familiarity with Node.js.",
                "Understanding of testing frameworks.",
                "Experience with SaaS products."
            ]
        },

        benefits: {
            title: "Benefits & Perks",
            points: [
                "Competitive salary package",
                "Flexible remote work",
                "Health and wellness benefits",
                "Learning & development budget",
                "Annual performance bonus",
                "Paid vacation and holidays",
                "Parental leave",
                "Latest work equipment",
                "Annual team retreats"
            ]
        },

        aboutCompany: {
            title: "About Trackeroo",
            desc: "Trackeroo helps businesses manage projects, customers, support operations, and performance from one unified platform. Our mission is to simplify work and empower teams to achieve more."
        },

        hiringProcess: [
            {
                step: "01",
                title: "Application Review",
                desc: "Our team reviews your application."
            },
            {
                step: "02",
                title: "Initial Interview",
                desc: "Meet with our hiring team."
            },
            {
                step: "03",
                title: "Technical Assessment",
                desc: "Showcase your technical skills."
            },
            {
                step: "04",
                title: "Final Interview",
                desc: "Meet leadership and future teammates."
            },
            {
                step: "05",
                title: "Offer",
                desc: "Receive and discuss your offer."
            }
        ],

        sidebar: {
            title: "Job Overview",

            details:
                [{
                    label: "Job Title",
                    value: "Frontend Developer (React)",
                    icon: <LiaSuitcaseSolid />

                },
                {
                    label: "Department",
                    value: "Engineering",
                    icon: <IoBriefcaseOutline />

                },
                {
                    label: "Location",
                    value: "Remote",
                    icon: <LuMapPin />

                },
                {
                    label: "Job Type",
                    value: "Full-Time",
                    icon: <FaRegCalendarMinus />


                },
                {
                    label: "Experience",
                    value: "1-3 Years",
                    icon: <TbAward />
                },
                {
                    label: "Salary",
                    value: "₹5L - ₹9L",
                    icon: <FaWallet />
                },
                {
                    label: "Posted On",
                    value: "May 22, 2026",
                    icon: <FaRegClock />

                }
                ]
        },

        cta: {
            title: "Ready to Build the Future With Us?",
            desc: "Join a team that values ownership, creativity, and innovation.",
            primaryBtn: "Apply Now",
            secondaryBtn: "Save Job"
        }
    },
    {
        id: 2,
        slug: "backend-developer-node",

        title: "Backend Developer (Node)",
        department: "Engineering",
        location: "Remote",
        jobType: "Full-Time",
        experience: "1-3 Years",
        salary: "₹5L - ₹9L",
        postedOn: "May 22, 2026",

        icon: <RiNodejsLine />,



        overview: {
            title: "About the Role",
            desc: "We're looking for a Backend Developer (Node.js) to build scalable APIs, optimize server-side performance, and contribute to the architecture of Trackeroo's core platform. You'll work closely with frontend developers, product managers, and DevOps engineers to deliver secure and reliable solutions."
        },

        responsibilities: {
            title: "What You'll Do",
            points: [
                "Design and develop scalable RESTful APIs using Node.js and Express.js.",
                "Build and maintain backend services that support business-critical features.",
                "Design database schemas and optimize MongoDB queries.",
                "Implement authentication, authorization, and security best practices.",
                "Collaborate with frontend teams to integrate APIs efficiently.",
                "Monitor application performance and troubleshoot production issues.",
                "Write clean, maintainable, and well-documented code.",
                "Participate in architecture discussions and technical planning."
            ]
        },

        requirements: {
            title: "Who You Are",
            points: [
                "2-4 years of experience with Node.js and Express.js.",
                "Strong understanding of JavaScript and asynchronous programming.",
                "Experience working with MongoDB or similar databases.",
                "Knowledge of REST API development and integrations.",
                "Understanding of authentication systems such as JWT.",
                "Experience with Git and collaborative development workflows.",
                "Strong debugging and problem-solving skills.",
                "Excellent communication and teamwork abilities."
            ]
        },

        preferredQualifications: {
            title: "Nice To Have",
            points: [
                "Experience with TypeScript.",
                "Knowledge of Docker and containerized deployments.",
                "Experience with AWS, Azure, or Google Cloud.",
                "Understanding of CI/CD pipelines.",
                "Experience building SaaS products."
            ]
        },

        benefits: {
            title: "Benefits & Perks",
            points: [
                "Competitive salary package",
                "Flexible remote work",
                "Health and wellness benefits",
                "Learning & development budget",
                "Annual performance bonus",
                "Paid vacation and holidays",
                "Parental leave",
                "Latest work equipment",
                "Annual team retreats"
            ]
        },

        aboutCompany: {
            title: "About Trackeroo",
            desc: "Trackeroo helps businesses manage projects, customers, support operations, and performance from one unified platform. Our mission is to simplify work and empower teams to achieve more."
        },

        hiringProcess: [
            {
                step: "01",
                title: "Application Review",
                desc: "Our team reviews your application."
            },
            {
                step: "02",
                title: "Initial Interview",
                desc: "Meet with our hiring team."
            },
            {
                step: "03",
                title: "Technical Assessment",
                desc: "Showcase your technical skills."
            },
            {
                step: "04",
                title: "Final Interview",
                desc: "Meet leadership and future teammates."
            },
            {
                step: "05",
                title: "Offer",
                desc: "Receive and discuss your offer."
            }
        ],

        sidebar: {
            title: "Job Overview",

            details:
                [{
                    label: "Job Title",
                    value: "Frontend Developer (React)",
                    icon: <LiaSuitcaseSolid />

                },
                {
                    label: "Department",
                    value: "Engineering",
                    icon: <IoBriefcaseOutline />

                },
                {
                    label: "Location",
                    value: "Remote",
                    icon: <LuMapPin />

                },
                {
                    label: "Job Type",
                    value: "Full-Time",
                    icon: <FaRegCalendarMinus />


                },
                {
                    label: "Experience",
                    value: "1-3 Years",
                    icon: <TbAward />
                },
                {
                    label: "Salary",
                    value: "₹5L - ₹9L",
                    icon: <FaWallet />
                },
                {
                    label: "Posted On",
                    value: "May 22, 2026",
                    icon: <FaRegClock />

                }
                ]
        },

        cta: {
            title: "Ready to Build the Future With Us?",
            desc: "Join a team that values ownership, creativity, and innovation.",
            primaryBtn: "Apply Now",
            secondaryBtn: "Save Job"
        }
    },
    {
        id: 3,
        slug: "ui/ux-designer",

        title: "UI/UX Designer",
        department: "Engineering",
        location: "Remote",
        jobType: "Full-Time",
        experience: "1-3 Years",
        salary: "₹5L - ₹9L",
        postedOn: "May 22, 2026",

        icon: <FaPen />,



        overview: {
            title: "About the Role",
            desc: "We're seeking a UI/UX Designer who is passionate about creating intuitive and visually appealing experiences. You'll collaborate with product managers and developers to design workflows, interfaces, and interactions that delight users."
        },

        responsibilities: {
            title: "What You'll Do",
            points: [
                "Create wireframes, mockups, and interactive prototypes.",
                "Design user-centric interfaces for web and mobile applications.",
                "Conduct user research and usability testing.",
                "Collaborate with developers to ensure design consistency.",
                "Maintain and evolve Trackeroo's design system.",
                "Translate business requirements into intuitive user experiences.",
                "Analyze user feedback and improve product usability.",
                "Stay updated with design trends and best practices."
            ]
        },

        requirements: {
            title: "Who You Are",
            points: [
                "2-4 years of experience in UI/UX design.",
                "Strong portfolio demonstrating design thinking and execution.",
                "Proficiency in Figma, Adobe XD, or similar tools.",
                "Understanding of responsive and accessible design principles.",
                "Ability to create wireframes, prototypes, and design systems.",
                "Strong communication and collaboration skills.",
                "Attention to detail and visual consistency.",
                "Passion for solving user problems through design."
            ]
        },

        preferredQualifications: {
            title: "Nice To Have",
            points: [
                "Experience designing SaaS products.",
                "Basic HTML/CSS knowledge.",
                "Experience with motion design and micro-interactions.",
                "Knowledge of user analytics tools.",
                "Familiarity with frontend development workflows."
            ]
        }
        ,
        benefits: {
            title: "Benefits & Perks",
            points: [
                "Competitive salary package",
                "Flexible remote work",
                "Health and wellness benefits",
                "Learning & development budget",
                "Annual performance bonus",
                "Paid vacation and holidays",
                "Parental leave",
                "Latest work equipment",
                "Annual team retreats"
            ]
        },

        aboutCompany: {
            title: "About Trackeroo",
            desc: "Trackeroo helps businesses manage projects, customers, support operations, and performance from one unified platform. Our mission is to simplify work and empower teams to achieve more."
        },

        hiringProcess: [
            {
                step: "01",
                title: "Application Review",
                desc: "Our team reviews your application."
            },
            {
                step: "02",
                title: "Initial Interview",
                desc: "Meet with our hiring team."
            },
            {
                step: "03",
                title: "Technical Assessment",
                desc: "Showcase your technical skills."
            },
            {
                step: "04",
                title: "Final Interview",
                desc: "Meet leadership and future teammates."
            },
            {
                step: "05",
                title: "Offer",
                desc: "Receive and discuss your offer."
            }
        ],

        sidebar: {
            title: "Job Overview",

            details:
                [{
                    label: "Job Title",
                    value: "Frontend Developer (React)",
                    icon: <LiaSuitcaseSolid />

                },
                {
                    label: "Department",
                    value: "Engineering",
                    icon: <IoBriefcaseOutline />

                },
                {
                    label: "Location",
                    value: "Remote",
                    icon: <LuMapPin />

                },
                {
                    label: "Job Type",
                    value: "Full-Time",
                    icon: <FaRegCalendarMinus />


                },
                {
                    label: "Experience",
                    value: "1-3 Years",
                    icon: <TbAward />
                },
                {
                    label: "Salary",
                    value: "₹5L - ₹9L",
                    icon: <FaWallet />
                },
                {
                    label: "Posted On",
                    value: "May 22, 2026",
                    icon: <FaRegClock />

                }
                ]
        },

        cta: {
            title: "Ready to Build the Future With Us?",
            desc: "Join a team that values ownership, creativity, and innovation.",
            primaryBtn: "Apply Now",
            secondaryBtn: "Save Job"
        }
    },
    {
        id: 4,
        slug: "customer-success-manager",

        title: "Customer Success Manager",
        department: "Engineering",
        location: "Remote",
        jobType: "Full-Time",
        experience: "1-3 Years",
        salary: "₹5L - ₹9L",
        postedOn: "May 22, 2026",

        icon: <TfiHeadphoneAlt />,

        overview: {
            title: "About the Role",
            desc: "We're looking for a Customer Success Manager to build strong customer relationships, drive product adoption, and ensure our clients achieve their business goals using Trackeroo."
        },

        responsibilities: {
            title: "What You'll Do",
            points: [
                "Manage customer onboarding and implementation processes.",
                "Develop strong relationships with customers and stakeholders.",
                "Monitor customer health and engagement metrics.",
                "Provide product guidance and best-practice recommendations.",
                "Identify opportunities for account growth and retention.",
                "Collaborate with support and product teams to resolve issues.",
                "Conduct regular customer reviews and feedback sessions.",
                "Advocate for customer needs within the organization."
            ]
        },

        requirements: {
            title: "Who You Are",
            points: [
                "2-4 years of experience in Customer Success or Account Management.",
                "Strong communication and relationship-building skills.",
                "Ability to understand customer challenges and business goals.",
                "Experience working with CRM and customer success platforms.",
                "Excellent problem-solving and organizational skills.",
                "Ability to manage multiple accounts simultaneously.",
                "Customer-first mindset and proactive approach.",
                "Strong presentation and training abilities."
            ]
        },

        preferredQualifications: {
            title: "Nice To Have",
            points: [
                "Experience working in SaaS companies.",
                "Knowledge of customer lifecycle management.",
                "Experience with onboarding and implementation projects.",
                "Understanding of CRM platforms.",
                "Experience managing enterprise customers."
            ]
        },

        benefits: {
            title: "Benefits & Perks",
            points: [
                "Competitive salary package",
                "Flexible remote work",
                "Health and wellness benefits",
                "Learning & development budget",
                "Annual performance bonus",
                "Paid vacation and holidays",
                "Parental leave",
                "Latest work equipment",
                "Annual team retreats"
            ]
        },

        aboutCompany: {
            title: "About Trackeroo",
            desc: "Trackeroo helps businesses manage projects, customers, support operations, and performance from one unified platform. Our mission is to simplify work and empower teams to achieve more."
        },

        hiringProcess: [
            {
                step: "01",
                title: "Application Review",
                desc: "Our team reviews your application."
            },
            {
                step: "02",
                title: "Initial Interview",
                desc: "Meet with our hiring team."
            },
            {
                step: "03",
                title: "Technical Assessment",
                desc: "Showcase your technical skills."
            },
            {
                step: "04",
                title: "Final Interview",
                desc: "Meet leadership and future teammates."
            },
            {
                step: "05",
                title: "Offer",
                desc: "Receive and discuss your offer."
            }
        ],

        sidebar: {
            title: "Job Overview",

            details:
                [{
                    label: "Job Title",
                    value: "Frontend Developer (React)",
                    icon: <LiaSuitcaseSolid />

                },
                {
                    label: "Department",
                    value: "Engineering",
                    icon: <IoBriefcaseOutline />

                },
                {
                    label: "Location",
                    value: "Remote",
                    icon: <LuMapPin />

                },
                {
                    label: "Job Type",
                    value: "Full-Time",
                    icon: <FaRegCalendarMinus />


                },
                {
                    label: "Experience",
                    value: "1-3 Years",
                    icon: <TbAward />
                },
                {
                    label: "Salary",
                    value: "₹5L - ₹9L",
                    icon: <FaWallet />
                },
                {
                    label: "Posted On",
                    value: "May 22, 2026",
                    icon: <FaRegClock />

                }
                ]
        },

        cta: {
            title: "Ready to Build the Future With Us?",
            desc: "Join a team that values ownership, creativity, and innovation.",
            primaryBtn: "Apply Now",
            secondaryBtn: "Save Job"
        }
    },
    {
        id: 5,
        slug: "product-manager",

        title: "Product Manager",
        department: "Engineering",
        location: "Remote",
        jobType: "Full-Time",
        experience: "1-3 Years",
        salary: "₹5L - ₹9L",
        postedOn: "May 22, 2026",

        icon: <ImBriefcase />,


        overview: {
            title: "About the Role",
            desc: "We're seeking a Product Manager to define product strategy, prioritize initiatives, and work cross-functionally to deliver features that create value for customers and drive business growth."
        },

        responsibilities: {
            title: "What You'll Do",
            points: [
                "Define and communicate product vision and roadmap.",
                "Gather and prioritize customer and business requirements.",
                "Work closely with engineering and design teams.",
                "Conduct market and competitor research.",
                "Write product specifications and user stories.",
                "Track product performance and success metrics.",
                "Coordinate product launches and feature rollouts.",
                "Drive continuous improvement through customer feedback."
            ]
        },

        requirements: {
            title: "Who You Are",
            points: [
                "3-5 years of experience in Product Management.",
                "Strong understanding of product development processes.",
                "Experience working with agile methodologies.",
                "Ability to translate business needs into product requirements.",
                "Strong analytical and problem-solving skills.",
                "Excellent communication and stakeholder management abilities.",
                "Experience using product management tools.",
                "Customer-focused mindset with strategic thinking."
            ]
        },

        preferredQualifications: {
            title: "Nice To Have",
            points: [
                "Experience managing SaaS products.",
                "Technical background or software development experience.",
                "Knowledge of UX/UI principles.",
                "Experience with data-driven decision making.",
                "MBA or related business qualification."
            ]
        },

        benefits: {
            title: "Benefits & Perks",
            points: [
                "Competitive salary package",
                "Flexible remote work",
                "Health and wellness benefits",
                "Learning & development budget",
                "Annual performance bonus",
                "Paid vacation and holidays",
                "Parental leave",
                "Latest work equipment",
                "Annual team retreats"
            ]
        },

        aboutCompany: {
            title: "About Trackeroo",
            desc: "Trackeroo helps businesses manage projects, customers, support operations, and performance from one unified platform. Our mission is to simplify work and empower teams to achieve more."
        },

        hiringProcess: [
            {
                step: "01",
                title: "Application Review",
                desc: "Our team reviews your application."
            },
            {
                step: "02",
                title: "Initial Interview",
                desc: "Meet with our hiring team."
            },
            {
                step: "03",
                title: "Technical Assessment",
                desc: "Showcase your technical skills."
            },
            {
                step: "04",
                title: "Final Interview",
                desc: "Meet leadership and future teammates."
            },
            {
                step: "05",
                title: "Offer",
                desc: "Receive and discuss your offer."
            }
        ],
        sidebar: {
            title: "Job Overview",

            details:
                [{
                    label: "Job Title",
                    value: "Frontend Developer (React)",
                    icon: <LiaSuitcaseSolid />

                },
                {
                    label: "Department",
                    value: "Engineering",
                    icon: <IoBriefcaseOutline />

                },
                {
                    label: "Location",
                    value: "Remote",
                    icon: <LuMapPin />

                },
                {
                    label: "Job Type",
                    value: "Full-Time",
                    icon: <FaRegCalendarMinus />


                },
                {
                    label: "Experience",
                    value: "1-3 Years",
                    icon: <TbAward />
                },
                {
                    label: "Salary",
                    value: "₹5L - ₹9L",
                    icon: <FaWallet />
                },
                {
                    label: "Posted On",
                    value: "May 22, 2026",
                    icon: <FaRegClock />

                }
                ]
        },

        cta: {
            title: "Ready to Build the Future With Us?",
            desc: "Join a team that values ownership, creativity, and innovation.",
            primaryBtn: "Apply Now",
            secondaryBtn: "Save Job"
        }
    },

]