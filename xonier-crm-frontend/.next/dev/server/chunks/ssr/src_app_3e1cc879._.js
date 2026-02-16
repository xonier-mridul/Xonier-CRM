module.exports = [
"[project]/src/app/utils/error.utils.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
const extractErrorMessages = (error)=>{
    const data = error?.response?.data;
    if (!data) return [
        "Something went wrong"
    ];
    if (Array.isArray(data.detail)) {
        return data.detail.map((err)=>err.msg || "Invalid input");
    }
    if (typeof data.detail === "string") {
        return [
            data.detail
        ];
    }
    if (typeof data.message === "string") {
        return [
            data.message
        ];
    }
    return [
        "Unexpected error occurred"
    ];
};
const __TURBOPACK__default__export__ = extractErrorMessages;
}),
"[project]/src/app/(dashboard)/quotations/update/[id]/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

const e = new Error("Could not parse module '[project]/src/app/(dashboard)/quotations/update/[id]/page.tsx'\n\nExpected ident");
e.code = 'MODULE_UNPARSABLE';
throw e;
}),
];

//# sourceMappingURL=src_app_3e1cc879._.js.map