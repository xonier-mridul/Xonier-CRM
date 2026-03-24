"use client";

import { useEffect } from "react";
import { useLoader } from "@/src/context/LoaderContext";
import { setLoaderHandler } from "@/src/lib/axios";

const LoaderInitializer: React.FC = () => {
  const { setLoading } = useLoader();

  useEffect(() => {
    // 🔥 connect axios with global loader
    setLoaderHandler(setLoading);
  }, [setLoading]);

  return null;
};

export default LoaderInitializer;
