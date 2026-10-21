import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.TRAKEROO_UI_PREVIEW === "1" ? ".next-ui-preview" : ".next",
  /* config options here */
  images:{
    qualities:[25,50,75,100]
  }
};

export default nextConfig;
