"use client";
import React from "react";

interface CreatedAtProps {
  timestamp: string | number | Date;
}

const CreatedAt: React.FC<CreatedAtProps> = ({ timestamp }) => {
  const date = new Date(timestamp);

  const day = date.getDate().toString().padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  const formattedDate = `${day} ${month} ${year}`;

  return <span className="px-4 py-1.5 rounded-md bg-blue-200 text-sm text-blue-600 font-medium">{formattedDate}</span>;
};

export default CreatedAt;