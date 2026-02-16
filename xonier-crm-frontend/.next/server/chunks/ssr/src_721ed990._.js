module.exports=[49909,a=>{"use strict";a.s(["default",0,a=>{let b=a?.response?.data;return b?Array.isArray(b.detail)?b.detail.map(a=>a.msg||"Invalid input"):"string"==typeof b.detail?[b.detail]:"string"==typeof b.message?[b.message]:["Unexpected error occurred"]:["Something went wrong"]}])},94988,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(71682);a.s(["default",0,({label:a,error:e,type:f="text",className:g="",required:h=!1,...i})=>{let[j,k]=(0,c.useState)(!1),l="password"===f,m="textarea"===f,n=`
    w-full px-3 py-2 rounded-md border
    bg-white dark:bg-gray-700 text-black dark:text-white
    border-gray-300 dark:border-gray-300/30
    disabled:opacity-60 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-violet-500
    ${e?"border-red-500 focus:ring-red-500":""}
    ${g}
  `;return(0,b.jsxs)("div",{className:"flex flex-col gap-1 w-full",children:[a&&(0,b.jsxs)("label",{className:"text-sm font-medium text-gray-700 dark:text-gray-200 capitalize",children:[h&&(0,b.jsx)("span",{className:"text-red-500 text-xl",children:"*"})," ",a]}),(0,b.jsxs)("div",{className:"relative",children:[m?(0,b.jsx)("textarea",{required:h,className:`${n} resize-none`,rows:5,...i}):(0,b.jsx)("input",{type:l&&j?"text":f,required:h,className:n,...i}),l&&(0,b.jsx)("button",{type:"button",onClick:()=>k(a=>!a),className:"absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-blue-500",children:j?(0,b.jsx)(d.FaEyeSlash,{}):(0,b.jsx)(d.FaEye,{})})]}),e&&(0,b.jsx)("span",{className:"text-sm text-red-500",children:e})]})}])},89254,a=>{"use strict";var b=a.i(28337);a.s(["EnquiryService",0,{getAll:a=>b.default.get(`/enquiry/all?${a.page?`page=${a.page}&`:""}${a.limit?`limit=${a.limit}&`:""}${a.enquiry_id?`enquiry_id=${a.enquiry_id}&`:""}${a.fullName?`fullName=${a.fullName}&`:""}${a.email?`email=${a.email}&`:""}${a.phone?`phone=${a.phone}&`:""}${a.companyName?`companyName=${a.companyName}&`:""}${a.projectType?`projectType=${a.projectType}&`:""}${a.priority?`priority=${a.priority}&`:""}`),getAllByCreator:(a,c,d)=>{let e=new URLSearchParams;return a&&e.append("page",String(a)),c&&e.append("limit",String(c)),d&&Object.entries(d).forEach(([a,b])=>{null!=b&&""!==b&&e.append(a,String(b))}),b.default.get(`/enquiry/all/by-creator?${e.toString()}`)},getById:a=>b.default.get(`/enquiry/get-by-id/${a}`),create:a=>b.default.post("/enquiry/create",a),bulkCreate:a=>b.default.post("/enquiry/create/bulk",a),update:(a,c)=>b.default.put(`/enquiry/update/${a}`,c),delete:a=>b.default.delete(`/enquiry/delete/${a}`)}])},38741,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(60239),e=a.i(83490),f=a.i(49909),g=a.i(20094),h=a.i(61914),i=a.i(94988),j=a.i(96407),k=a.i(89254);a.s(["default",0,()=>{let[a,l]=(0,c.useState)(!1),[m,n]=(0,c.useState)(),[o,p]=(0,c.useState)([]),[q,r]=(0,c.useState)({fullName:"",email:"",phone:"",companyName:"",priority:"",projectType:"",message:"",assignTo:"",source:""}),s=async()=>{try{let a=await h.AuthService.getAllActiveWithoutPagination();200===a.status&&p(a.data.data)}catch(a){if(console.error(a),e.default.isAxiosError(a)){let b=(0,f.default)(a);n(b),g.toast.error(`${b}`)}else n(["Something went wrong"])}};(0,c.useEffect)(()=>{s()},[]);let t=async a=>{a.preventDefault(),n(null),l(!0);try{let a=await k.EnquiryService.create({...q,priority:q.priority,projectType:q.projectType,source:q.source});201===a.status&&(g.toast.success(`${q.fullName}'s Enquiry registered successfully`),r({fullName:"",email:"",phone:"",companyName:"",priority:"",projectType:"",message:"",assignTo:"",source:""}),n(null))}catch(a){if(console.error(a),e.default.isAxiosError(a)){let b=(0,f.default)(a);n(b),g.toast.error(`${b}`)}else n(["Something went wrong"])}finally{l(!1)}};return(0,b.jsx)("div",{className:"ml-72 mt-14 p-6",children:(0,b.jsxs)("div",{className:"bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full",children:[(0,b.jsx)("h2",{className:"text-xl font-bold  dark:text-white text-slate-900 capitalize",children:"Create enquiry"}),(0,b.jsxs)("form",{onSubmit:t,className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[(0,b.jsx)(i.default,{label:"Full Name",placeholder:"Enter full name",required:!0,value:q.fullName,onChange:a=>r({...q,fullName:a.target.value})}),(0,b.jsx)(i.default,{label:"Email",type:"email",placeholder:"Enter email address",required:!0,value:q.email,onChange:a=>r({...q,email:a.target.value})}),(0,b.jsx)(i.default,{label:"Phone",placeholder:"Enter phone number",required:!0,value:q.phone,onChange:a=>r({...q,phone:a.target.value})}),(0,b.jsx)(i.default,{label:"Company Name",placeholder:"Optional",value:q.companyName,onChange:a=>r({...q,companyName:a.target.value})}),(0,b.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,b.jsx)("label",{className:"text-sm font-medium",children:"Priority"}),(0,b.jsxs)("select",{required:!0,className:`
            w-full px-3 py-2 rounded-md border
            bg-white dark:bg-gray-700  text-black dark:text-white
            border-gray-300 dark:border-gray-300/30
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-500
            ${m?"border-red-500 focus:ring-red-500":""}
            
          `,value:q.priority,onChange:a=>r({...q,priority:a.target.value}),children:[(0,b.jsx)("option",{value:"",children:"Select priority"}),Object.values(d.PRIORITY).map(a=>(0,b.jsx)("option",{value:a,children:a.toUpperCase()},a))]})]}),(0,b.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,b.jsx)("label",{className:"text-sm font-medium",children:"Project Type"}),(0,b.jsxs)("select",{required:!0,className:`
            w-full px-3 py-2 rounded-md border
            bg-white dark:bg-gray-700  text-black dark:text-white
            border-gray-300 dark:border-gray-300/30
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-500
            ${m?"border-red-500 focus:ring-red-500":""}
            
          `,value:q.projectType,onChange:a=>r({...q,projectType:a.target.value}),children:[(0,b.jsx)("option",{value:"",children:"Select project type"}),Object.values(d.PROJECT_TYPES).map(a=>(0,b.jsx)("option",{value:a,children:a.replace(/_/g," ").toUpperCase()},a))]})]}),(0,b.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,b.jsx)("label",{className:"text-sm font-medium",children:"Source"}),(0,b.jsxs)("select",{required:!0,className:`
      w-full px-3 py-2 rounded-md border
      bg-white dark:bg-gray-700 text-black dark:text-white
      border-gray-300 dark:border-gray-300/30
      disabled:opacity-60 disabled:cursor-not-allowed
      focus:outline-none focus:ring-2 focus:ring-violet-500
      ${m?"border-red-500 focus:ring-red-500":""}
    `,value:q.source,onChange:a=>r({...q,source:a.target.value}),children:[(0,b.jsx)("option",{value:"",children:"Select source"}),Object.values(d.SOURCE).map(a=>(0,b.jsx)("option",{value:a,children:a.replace(/_/g," ").toUpperCase()},a))]})]}),(0,b.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,b.jsx)("label",{className:"text-sm font-medium",children:"Assign To"}),(0,b.jsxs)("select",{className:`
            w-full px-3 py-2 rounded-md border
            bg-white dark:bg-gray-700  text-black dark:text-white
            border-gray-300 dark:border-gray-300/30
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-500
            ${m?"border-red-500 focus:ring-red-500":""}
            
          `,value:q.assignTo,onChange:a=>r({...q,assignTo:a.target.value}),children:[(0,b.jsx)("option",{value:"",children:"Unassigned"}),o?.map(a=>(0,b.jsxs)("option",{value:a.id,children:[a.firstName," ",a.lastName]},a.id))]})]}),(0,b.jsxs)("div",{className:"col-span-1 md:col-span-2 flex flex-col gap-1",children:[(0,b.jsx)("label",{className:"text-sm font-medium",children:"Message"}),(0,b.jsx)("textarea",{rows:4,placeholder:"Describe the enquiry...",className:`
            w-full px-3 py-2 rounded-md border
            bg-white dark:bg-gray-700  text-black dark:text-white
            border-gray-300 dark:border-gray-300/30
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-500
            ${m?"border-red-500 focus:ring-red-500":""}
            
          `,value:q.message,onChange:a=>r({...q,message:a.target.value})})]}),m&&(0,b.jsx)("div",{className:"col-span-1 md:col-span-2",children:(0,b.jsx)("div",{className:"rounded-md border border-red-500/40 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm text-red-600 dark:text-red-400",children:Array.isArray(m)?(0,b.jsx)("ul",{className:"list-disc pl-4",children:m.map((a,c)=>(0,b.jsx)("li",{children:a},c))}):m})}),(0,b.jsx)("div",{className:"col-span-1 md:col-span-2 flex justify-end",children:(0,b.jsxs)(j.default,{isLoading:a,type:"submit",children:[" ","Create Enquiry"]})})]})]})})}])}];

//# sourceMappingURL=src_721ed990._.js.map