"use client";

import { ToastContainer, TypeOptions } from "react-toastify";
import { AlertCircle, CircleCheck, CircleX, Info } from "lucide-react";
import "react-toastify/dist/ReactToastify.css";

const CustomIcon = ({ type }: { type: TypeOptions }) => {
  const iconProps = { size: 19, strokeWidth: 1.8, "aria-hidden": true as const };
  switch (type) {
    case "success": return <span className="xonier-toast-icon xonier-toast-icon--success"><CircleCheck {...iconProps} /></span>;
    case "error": return <span className="xonier-toast-icon xonier-toast-icon--error"><CircleX {...iconProps} /></span>;
    case "warning": return <span className="xonier-toast-icon xonier-toast-icon--warning"><AlertCircle {...iconProps} /></span>;
    case "info": return <span className="xonier-toast-icon xonier-toast-icon--info"><Info {...iconProps} /></span>;
    default: return <span className="xonier-toast-icon xonier-toast-icon--info"><Info {...iconProps} /></span>;
  }
};

/* ─── Provider ─────────────────────────────────────────────── */

const ToastProvider = () => {
  return (
    <ToastContainer
      position="top-center"
      autoClose={4000}
      hideProgressBar={true}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable={false}
      theme="light"
      toastClassName="xonier-toast"
      closeButton={false}
      icon={({ type }) => <CustomIcon type={type} />}
      limit={4}
    />
  );
};

export default ToastProvider;
