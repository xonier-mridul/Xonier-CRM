"use client";

import React, { JSX } from "react";
import Link from "next/link";
import { FiArrowLeft, FiHome } from "react-icons/fi";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900 px-6">
      <div className="max-w-xl w-full text-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-slate-200 dark:border-gray-700 p-10">
        
        
        <h1 className="text-7xl font-extrabold text-blue-600 dark:text-blue-400 mb-4">
          404
        </h1>

        
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
          Page Not Found
        </h2>

        
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Sorry, the page you’re looking for doesn’t exist, has been removed,
          or the URL might be incorrect.
        </p>

        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
          >
            <FiHome className="text-lg" />
            Go to Dashboard
          </Link>

          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition-all"
          >
            <FiArrowLeft className="text-lg" />
            Go Back
          </button>
        </div>

        
        <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">
          If you believe this is an error, please contact your system administrator.
        </p>
      </div>
    </div>
  );
};

export default NotFound;

