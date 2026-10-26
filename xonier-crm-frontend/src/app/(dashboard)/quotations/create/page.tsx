"use client";

// Reuse the full quotation composer used when converting a deal. Without a
// deal route parameter it creates a standalone quotation.
export { default } from "../../deals/quotation/[id]/page";
