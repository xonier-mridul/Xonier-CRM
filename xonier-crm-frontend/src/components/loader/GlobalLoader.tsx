"use client";

import { useLoader } from "@/src/context/LoaderContext";
import Image from "next/image";

const GlobalLoader: React.FC = () => {
  const { loading } = useLoader();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6">

        {/* Gear Container */}
        {/* <div className="relative w-32 h-32 flex items-center justify-center">

          {/* Big Gear 
          <svg
            className="w-24 h-24 text-blue-500 animate-[spin_3s_linear_infinite]"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <path d="M50 30a20 20 0 100 40 20 20 0 000-40zm45 20l-10-3a35 35 0 00-3-7l6-9-7-7-9 6a35 35 0 00-7-3l-3-10h-10l-3 10a35 35 0 00-7 3l-9-6-7 7 6 9a35 35 0 00-3 7l-10 3v10l10 3a35 35 0 003 7l-6 9 7 7 9-6a35 35 0 007 3l3 10h10l3-10a35 35 0 007-3l9 6 7-7-6-9a35 35 0 003-7l10-3V50z" />
          </svg>

          {/* Small Gear 
          <svg
            className="w-14 h-14 text-purple-500 absolute bottom-0 right-0 animate-[spin_2s_linear_infinite_reverse]"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <path d="M50 35a15 15 0 100 30 15 15 0 000-30zm35 15l-8-2a25 25 0 00-2-5l5-7-5-5-7 5a25 25 0 00-5-2l-2-8h-8l-2 8a25 25 0 00-5 2l-7-5-5 5 5 7a25 25 0 00-2 5l-8 2v8l8 2a25 25 0 002 5l-5 7 5 5 7-5a25 25 0 005 2l2 8h8l2-8a25 25 0 005 2l7 5 5-5-5-7a25 25 0 002-5l8-2v-8z" />
          </svg>

        </div> */}

        <div className="w-screen h-screen flex flex-col gap-10 items-center justify-center backdrop-blur-xs">

          {/* <div className="loader"></div> */}
               {/* <Image
                    src="/images/Blue.gif"
                    alt="Loading..."
                    width={220}
                    height={220}
                  /> */}

                  <span className="loader"></span>
          <p className="text-white text-sm tracking-wide">
          Processing Trackeroo System...
        </p>
        </div>
      </div>
    </div>
  );
};

export default GlobalLoader;