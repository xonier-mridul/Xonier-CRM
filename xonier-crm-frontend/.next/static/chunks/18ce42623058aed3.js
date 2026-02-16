(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,2988,e=>{"use strict";e.s(["default",0,e=>{let r=e?.response?.data;return r?Array.isArray(r.detail)?r.detail.map(e=>e.msg||"Invalid input"):"string"==typeof r.detail?[r.detail]:"string"==typeof r.message?[r.message]:["Unexpected error occurred"]:["Something went wrong"]}])},3812,e=>{"use strict";var r=e.i(43476),a=e.i(71645),t=e.i(11152);e.s(["default",0,({label:e,error:l,type:s="text",className:i="",required:o=!1,...d})=>{let[n,c]=(0,a.useState)(!1),u="password"===s,p="textarea"===s,g=`
    w-full px-3 py-2 rounded-md border
    bg-white dark:bg-gray-700 text-black dark:text-white
    border-gray-300 dark:border-gray-300/30
    disabled:opacity-60 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-violet-500
    ${l?"border-red-500 focus:ring-red-500":""}
    ${i}
  `;return(0,r.jsxs)("div",{className:"flex flex-col gap-1 w-full",children:[e&&(0,r.jsxs)("label",{className:"text-sm font-medium text-gray-700 dark:text-gray-200 capitalize",children:[o&&(0,r.jsx)("span",{className:"text-red-500 text-xl",children:"*"})," ",e]}),(0,r.jsxs)("div",{className:"relative",children:[p?(0,r.jsx)("textarea",{required:o,className:`${g} resize-none`,rows:5,...d}):(0,r.jsx)("input",{type:u&&n?"text":s,required:o,className:g,...d}),u&&(0,r.jsx)("button",{type:"button",onClick:()=>c(e=>!e),className:"absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-blue-500",children:n?(0,r.jsx)(t.FaEyeSlash,{}):(0,r.jsx)(t.FaEye,{})})]}),l&&(0,r.jsx)("span",{className:"text-sm text-red-500",children:l})]})}])},72537,e=>{"use strict";var r=e.i(63816);e.s(["EnquiryService",0,{getAll:e=>r.default.get(`/enquiry/all?${e.page?`page=${e.page}&`:""}${e.limit?`limit=${e.limit}&`:""}${e.enquiry_id?`enquiry_id=${e.enquiry_id}&`:""}${e.fullName?`fullName=${e.fullName}&`:""}${e.email?`email=${e.email}&`:""}${e.phone?`phone=${e.phone}&`:""}${e.companyName?`companyName=${e.companyName}&`:""}${e.projectType?`projectType=${e.projectType}&`:""}${e.priority?`priority=${e.priority}&`:""}`),getAllByCreator:(e,a,t)=>{let l=new URLSearchParams;return e&&l.append("page",String(e)),a&&l.append("limit",String(a)),t&&Object.entries(t).forEach(([e,r])=>{null!=r&&""!==r&&l.append(e,String(r))}),r.default.get(`/enquiry/all/by-creator?${l.toString()}`)},getById:e=>r.default.get(`/enquiry/get-by-id/${e}`),create:e=>r.default.post("/enquiry/create",e),bulkCreate:e=>r.default.post("/enquiry/create/bulk",e),update:(e,a)=>r.default.put(`/enquiry/update/${e}`,a),delete:e=>r.default.delete(`/enquiry/delete/${e}`)}])},27086,e=>{"use strict";var r=e.i(43476),a=e.i(71645),t=e.i(77344),l=e.i(81949),s=e.i(2988),i=e.i(70319),o=e.i(69036),d=e.i(3812),n=e.i(30648),c=e.i(72537);e.s(["default",0,()=>{let[e,u]=(0,a.useState)(!1),[p,g]=(0,a.useState)(),[m,x]=(0,a.useState)([]),[y,f]=(0,a.useState)({fullName:"",email:"",phone:"",companyName:"",priority:"",projectType:"",message:"",assignTo:"",source:""}),b=async()=>{try{let e=await o.AuthService.getAllActiveWithoutPagination();200===e.status&&x(e.data.data)}catch(e){if(console.error(e),l.default.isAxiosError(e)){let r=(0,s.default)(e);g(r),i.toast.error(`${r}`)}else g(["Something went wrong"])}};(0,a.useEffect)(()=>{b()},[]);let h=async e=>{e.preventDefault(),g(null),u(!0);try{let e=await c.EnquiryService.create({...y,priority:y.priority,projectType:y.projectType,source:y.source});201===e.status&&(i.toast.success(`${y.fullName}'s Enquiry registered successfully`),f({fullName:"",email:"",phone:"",companyName:"",priority:"",projectType:"",message:"",assignTo:"",source:""}),g(null))}catch(e){if(console.error(e),l.default.isAxiosError(e)){let r=(0,s.default)(e);g(r),i.toast.error(`${r}`)}else g(["Something went wrong"])}finally{u(!1)}};return(0,r.jsx)("div",{className:"ml-72 mt-14 p-6",children:(0,r.jsxs)("div",{className:"bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full",children:[(0,r.jsx)("h2",{className:"text-xl font-bold  dark:text-white text-slate-900 capitalize",children:"Create enquiry"}),(0,r.jsxs)("form",{onSubmit:h,className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[(0,r.jsx)(d.default,{label:"Full Name",placeholder:"Enter full name",required:!0,value:y.fullName,onChange:e=>f({...y,fullName:e.target.value})}),(0,r.jsx)(d.default,{label:"Email",type:"email",placeholder:"Enter email address",required:!0,value:y.email,onChange:e=>f({...y,email:e.target.value})}),(0,r.jsx)(d.default,{label:"Phone",placeholder:"Enter phone number",required:!0,value:y.phone,onChange:e=>f({...y,phone:e.target.value})}),(0,r.jsx)(d.default,{label:"Company Name",placeholder:"Optional",value:y.companyName,onChange:e=>f({...y,companyName:e.target.value})}),(0,r.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,r.jsx)("label",{className:"text-sm font-medium",children:"Priority"}),(0,r.jsxs)("select",{required:!0,className:`
            w-full px-3 py-2 rounded-md border
            bg-white dark:bg-gray-700  text-black dark:text-white
            border-gray-300 dark:border-gray-300/30
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-500
            ${p?"border-red-500 focus:ring-red-500":""}
            
          `,value:y.priority,onChange:e=>f({...y,priority:e.target.value}),children:[(0,r.jsx)("option",{value:"",children:"Select priority"}),Object.values(t.PRIORITY).map(e=>(0,r.jsx)("option",{value:e,children:e.toUpperCase()},e))]})]}),(0,r.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,r.jsx)("label",{className:"text-sm font-medium",children:"Project Type"}),(0,r.jsxs)("select",{required:!0,className:`
            w-full px-3 py-2 rounded-md border
            bg-white dark:bg-gray-700  text-black dark:text-white
            border-gray-300 dark:border-gray-300/30
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-500
            ${p?"border-red-500 focus:ring-red-500":""}
            
          `,value:y.projectType,onChange:e=>f({...y,projectType:e.target.value}),children:[(0,r.jsx)("option",{value:"",children:"Select project type"}),Object.values(t.PROJECT_TYPES).map(e=>(0,r.jsx)("option",{value:e,children:e.replace(/_/g," ").toUpperCase()},e))]})]}),(0,r.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,r.jsx)("label",{className:"text-sm font-medium",children:"Source"}),(0,r.jsxs)("select",{required:!0,className:`
      w-full px-3 py-2 rounded-md border
      bg-white dark:bg-gray-700 text-black dark:text-white
      border-gray-300 dark:border-gray-300/30
      disabled:opacity-60 disabled:cursor-not-allowed
      focus:outline-none focus:ring-2 focus:ring-violet-500
      ${p?"border-red-500 focus:ring-red-500":""}
    `,value:y.source,onChange:e=>f({...y,source:e.target.value}),children:[(0,r.jsx)("option",{value:"",children:"Select source"}),Object.values(t.SOURCE).map(e=>(0,r.jsx)("option",{value:e,children:e.replace(/_/g," ").toUpperCase()},e))]})]}),(0,r.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,r.jsx)("label",{className:"text-sm font-medium",children:"Assign To"}),(0,r.jsxs)("select",{className:`
            w-full px-3 py-2 rounded-md border
            bg-white dark:bg-gray-700  text-black dark:text-white
            border-gray-300 dark:border-gray-300/30
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-500
            ${p?"border-red-500 focus:ring-red-500":""}
            
          `,value:y.assignTo,onChange:e=>f({...y,assignTo:e.target.value}),children:[(0,r.jsx)("option",{value:"",children:"Unassigned"}),m?.map(e=>(0,r.jsxs)("option",{value:e.id,children:[e.firstName," ",e.lastName]},e.id))]})]}),(0,r.jsxs)("div",{className:"col-span-1 md:col-span-2 flex flex-col gap-1",children:[(0,r.jsx)("label",{className:"text-sm font-medium",children:"Message"}),(0,r.jsx)("textarea",{rows:4,placeholder:"Describe the enquiry...",className:`
            w-full px-3 py-2 rounded-md border
            bg-white dark:bg-gray-700  text-black dark:text-white
            border-gray-300 dark:border-gray-300/30
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-500
            ${p?"border-red-500 focus:ring-red-500":""}
            
          `,value:y.message,onChange:e=>f({...y,message:e.target.value})})]}),p&&(0,r.jsx)("div",{className:"col-span-1 md:col-span-2",children:(0,r.jsx)("div",{className:"rounded-md border border-red-500/40 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm text-red-600 dark:text-red-400",children:Array.isArray(p)?(0,r.jsx)("ul",{className:"list-disc pl-4",children:p.map((e,a)=>(0,r.jsx)("li",{children:e},a))}):p})}),(0,r.jsx)("div",{className:"col-span-1 md:col-span-2 flex justify-end",children:(0,r.jsxs)(n.default,{isLoading:e,type:"submit",children:[" ","Create Enquiry"]})})]})]})})}])}]);