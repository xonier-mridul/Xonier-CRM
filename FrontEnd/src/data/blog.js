import blogimg from '../assets/blogimg2.webp'
export const blogPageData = {
    hero: {
        badge: "Our Blog",
        title: "Insights, tips, and stories to help you ",
        title2: 'work smarter',
        desc: "Explore the latest industry trends, product updates, and best practices to grow your business and empower your team.",
        image: "/images/blog-hero.webp"
    },

    categories: [
        "All",
        "Productivity",
        "Project Management",
        "Customer Success",
        "Updates",
        "Tips & Guides"
    ],

    featuredPost: {
        id: 1,
        slug: "productivity-tips-transform-team",
        category: "Productivity",
        title: "10 Productivity Tips That Will Transform Your Team",
        excerpt:
            "Discover proven strategies to boost productivity, improve focus, and achieve more together.",
        image: blogimg,
        author: {
            name: "Sarah Johnson",
            avatar: blogimg
        },
        publishDate: "May 20, 2026",
        readTime: "5 min read"
    },

    posts: [
        {
            id: 1,
            slug: "productivity-tips-transform-team",
            category: "Productivity",
            title: "10 Productivity Tips That Will Transform Your Team",
            excerpt:
                "Discover proven strategies to boost productivity, improve focus, and achieve more together.",
            image: blogimg,
            author: "Sarah Johnson",
            publishDate: "May 20, 2026",
            readTime: "5 min read"
        },

        {
            id: 2,
            slug: "agile-vs-waterfall",
            category: "Project Management",
            title: "Agile vs Waterfall: Which Methodology Is Right for You?",
            excerpt:
                "A comprehensive comparison to help you choose the best approach for your next project.",
            image: blogimg,
            author: "Michael Chen",
            publishDate: "May 18, 2026",
            readTime: "7 min read"
        },

        {
            id: 3,
            slug: "customer-relationships-2026",
            category: "Customer Success",
            title: "Building Stronger Customer Relationships in 2026",
            excerpt:
                "Learn how to build trust, improve satisfaction, and increase customer retention.",
            image: blogimg,
            author: "Emily Roberts",
            publishDate: "May 15, 2026",
            readTime: "6 min read"
        },

        {
            id: 4,
            slug: "trackeroo-product-update",
            category: "Updates",
            title: "Trackeroo Product Update: What's New This Month",
            excerpt:
                "Explore the latest improvements, integrations, and performance enhancements.",
            image: blogimg,
            author: "Trackeroo Team",
            publishDate: "May 12, 2026",
            readTime: "4 min read"
        },

        {
            id: 5,
            slug: "crm-best-practices",
            category: "Tips & Guides",
            title: "CRM Best Practices for Growing Businesses",
            excerpt:
                "Discover practical CRM strategies that help teams close more deals and build stronger relationships.",
            image: blogimg,
            author: "David Wilson",
            publishDate: "May 10, 2026",
            readTime: "8 min read"
        },

        {
            id: 6,
            slug: "remote-team-management",
            category: "Productivity",
            title: "Managing Remote Teams Effectively",
            excerpt:
                "Learn how modern companies keep distributed teams aligned and productive.",
            image: blogimg,
            author: "James Walker",
            publishDate: "May 8, 2026",
            readTime: "6 min read"
        }
    ],

    popularPosts: [
        {
            title: "10 Productivity Tips That Will Transform Your Team",
            image: blogimg,
            publishDate: "May 20, 2026"
        },
        {
            title: "Agile vs Waterfall: Which Methodology Is Right for You?",
            image: blogimg,
            publishDate: "May 18, 2026"
        },
        {
            title: "Building Stronger Customer Relationships in 2026",
            image: blogimg,
            publishDate: "May 15, 2026"
        },
        {
            title: "Trackeroo Product Update: What's New This Month",
            image: blogimg,
            publishDate: "May 12, 2026"
        }
    ],

    newsletter: {
        title: "Subscribe to our newsletter",
        desc:
            "Get the latest insights, industry trends, and product updates delivered straight to your inbox.",
        placeholder: "Enter your email",
        buttonText: "Subscribe"
    },

    stats: [
        {
            number: "500+",
            label: "Articles Published"
        },
        {
            number: "50K+",
            label: "Monthly Readers"
        },
        {
            number: "100+",
            label: "Expert Guides"
        }
    ],

    seo: {
        title: "Trackeroo Blog",
        description:
            "Read insights, productivity tips, customer success strategies, project management best practices, and Trackeroo product updates.",
        keywords: [
            "productivity",
            "project management",
            "crm",
            "customer success",
            "trackeroo blog",
            "business growth"
        ]
    }
};