import { DefaultActive } from "@/src/types/prospect/prospect.type";
export const ALL_COL: any = {
    "company": [
        { key: "id", label: "ID", required: true },
        { key: "enquiry_id", label: "Enquiry ID", required: false },
        { key: "fullName", label: "Full Name", required: true },
        { key: "email", label: "Email", required: false },
        { key: "phone", label: "Phone", required: false },
        { key: "companyName", label: "Company Name", required: false },
        // { key: "infoType", label: "Info Type", required: false },
        { key: "designation", label: "Designation", required: false },

        { key: "numberOfEmployees", label: "Employees", required: false },

        { key: "industry", label: "Industry", required: false },
        { key: "technologies", label: "Technologies", required: false },
        { key: "keywords", label: "Keywords", required: false },

        { key: "priority", label: "Priority", required: false },
        { key: "projectType", label: "Project Type", required: false },
        { key: "status", label: "Status", required: false },
        { key: "isActive", label: "Active", required: false },
        { key: "source", label: "Source", required: false },
        { key: "message", label: "Message", required: false },
        { key: "assignTo.firstName", label: "Assign To", required: false },

        // Location
        { key: "location.country", label: "Country", required: false },
        { key: "location.state", label: "State", required: false },
        { key: "location.city", label: "City", required: false },
        { key: "location.zipcode", label: "Zip Code", required: false },

        // Social Links
        { key: "socialLinks.linkedin", label: "LinkedIn", required: false },
        { key: "socialLinks.twitter", label: "Twitter", required: false },
        { key: "socialLinks.github", label: "Github", required: false },
        { key: "socialLinks.facebook", label: "Facebook", required: false },
        { key: "socialLinks.instagram", label: "Instagram", required: false },
        { key: "socialLinks.youtube", label: "YouTube", required: false },
        { key: "socialLinks.website", label: "Website", required: false },
        { key: "dataTags", label: "Data Tags", required: false },
        { key: "createdAt", label: "Created At", required: true },
        { key: "createdBy.firstName", label: "Created By", required: true },

        { key: "actions", label: "Actions", required: true },
    ],
    "people": [
        { key: "enquiry_id", label: "Enquiry ID", required: false },
        { key: "fullName", label: "Name", required: true },
        { key: "designation", label: "Designation", required: false },
        { key: "companyName", label: "Company", required: false },
        { key: "email", label: "Email", required: false },
        { key: "phone", label: "Phone", required: false },
        { key: "location", label: "Location", required: false },
        { key: "linkedin", label: "LinkedIn", required: false },
        { key: "status", label: "Status", required: false },
        { key: "dataTags", label: "Data Tags", required: false },
        { key: "createdAt", label: "Created At", required: true },
        { key: "createdBy.firstName", label: "Created By", required: true },
        { key: "actions", label: "Actions", required: true },
    ],
};

export const DEF_ACTIVE: DefaultActive = {
    "people": {
        enquiry_id: false,
        fullName: true,
        designation: true,
        companyName: true,
        email: true,
        phone: true,
        location: true,
        linkedin: true,
        status: true,
        dataTags: false,
        createdAt: true,
        "createdBy.firstName": true,
        actions: true,
    },
    company: {
        id: false,
        enquiry_id: false,
        fullName: true,
        email: true,
        phone: true,
        companyName: true,
        infoType: false,
        designation: true,

        numberOfEmployees: false,

        industry: false,
        technologies: false,
        keywords: false,

        priority: false,
        projectType: false,
        status: true,
        isActive: false,
        source: false,
        message: false,
        assignTo: false,

        "location.country": false,
        "location.state": false,
        "location.city": false,
        "location.zipcode": false,

        "socialLinks.linkedin": false,
        "socialLinks.twitter": false,
        "socialLinks.github": false,
        "socialLinks.facebook": false,
        "socialLinks.instagram": false,
        "socialLinks.youtube": false,
        "socialLinks.website": false,
        "socialLinks.other": false,
        "dataTags": false,
        deletedAt: false,
        createdAt: true,
        "createdBy.firstName": true,

        actions: true
    }

};