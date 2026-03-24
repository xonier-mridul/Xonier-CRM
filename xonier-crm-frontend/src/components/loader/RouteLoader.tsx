"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLoader } from "@/src/context/LoaderContext";

export default function RouteLoader() {
  const pathname = usePathname();
  const { setLoading } = useLoader();

  useEffect(() => {
    setLoading(true);

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 300); // smooth transition

    return () => clearTimeout(timeout);
  }, [pathname]);

  return null;
}