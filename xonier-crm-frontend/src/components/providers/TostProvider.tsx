"use client";

import { ToastContainer, TypeOptions } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* ─── Custom SVG Icons ─────────────────────────────────────── */

const SuccessIcon = () => (
  <span className="xonier-toast-icon xonier-toast-icon--success">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  </span>
);

const ErrorIcon = () => (
  <span className="xonier-toast-icon xonier-toast-icon--error">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </span>
);

const WarningIcon = () => (
  <span className="xonier-toast-icon xonier-toast-icon--warning">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  </span>
);

const InfoIcon = () => (
  <span className="xonier-toast-icon xonier-toast-icon--info">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  </span>
);

const CustomIcon = ({ type }: { type: TypeOptions }) => {
  switch (type) {
    case "success": return <SuccessIcon />;
    case "error":   return <ErrorIcon />;
    case "warning": return <WarningIcon />;
    case "info":    return <InfoIcon />;
    default:        return <InfoIcon />;
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
      bodyClassName="xonier-toast-body"
      closeButton={false}
      icon={({ type }) => <CustomIcon type={type} />}
      limit={4}
    />
  );
};

export default ToastProvider;
