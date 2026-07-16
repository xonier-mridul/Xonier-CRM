"use client";
import React from "react";

interface CreatedAtProps {
  timestamp: string | number | Date;
  time?: boolean;
}

const CreatedAt: React.FC<CreatedAtProps> = ({ timestamp , time = false}) => {
  const date = new Date(timestamp);

  const day = date.getDate().toString().padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");

  const formattedDate = `${day} ${month} ${year}` + (time ? ` ${hour}:${minute}` : "");

  return <span className="px-4 py-1.5 rounded-md bg-cyan-200 text-sm text-cyan-600 font-medium whitespace-nowrap ">{formattedDate}</span>;
};

export default CreatedAt;