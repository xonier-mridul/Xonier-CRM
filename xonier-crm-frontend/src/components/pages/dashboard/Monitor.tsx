"use client";

import Image from "next/image";
import React from "react";

const stats = [
  {
    img: "/images/customer.gif",
    title: "Total Organisations",
    value: "125",
    items: [
      { label: "Yearly", value: "50" },
      { label: "Half-yearly", value: "20" },
      { label: "Quarterly", value: "20" },
      { label: "Monthly", value: "35" },
    ],
  },
  { 
    img: "/images/license.gif",
    title: "Total Licences",
    value: "570",
    items: [
      { label: "Yearly", value: "150" },
      { label: "Half-yearly", value: "260" },
      { label: "Quarterly", value: "350" },
      { label: "Monthly", value: "155" },
    ],
  },
  {
    img: "/images/sales.gif",
    title: "Total Revenue",
    value: "$2,250",
    items: [
      { label: "Yearly", value: "$500" },
      { label: "Half-yearly", value: "$600" },
      { label: "Quarterly", value: "$500" },
      { label: "Monthly", value: "$550" },
    ],
  },
  {
    img: "/images/teamwork.gif",
    title: "Total Users",
    value: "30",
    items: [
      { label: "Active Users", value: "25" },
      { label: "Today's Punch In", value: "23" },
      { label: "Today's Punch Out", value: "23" },
    ],
  },
];

const Monitor = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <span className="text-gray-500 dark:text-gray-400 text-lg">
          Welcome Admin
        </span>
        <h1 className="text-slate-900 dark:text-white font-medium text-4xl">
          Admin Dashboard
        </h1>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((card, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-4"
          >
            {/* Top section */}
            <div className="flex items-center gap-4">
              {/* Icon placeholder */}
              <div className="w-18 h-18 rounded-lg flex items-center justify-center">
                <Image src={card.img} height={20} width={20} alt="icon" className="w-full h-full rounded-sm"/>
              </div>

              <div>
                <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">
                  {card.value}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {card.title}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Stats */}
            <div className="flex flex-col gap-2 text-sm">
              {card.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-gray-600 dark:text-gray-300"
                >
                  <span>{item.label}</span>
                  <span className="font-medium text-slate-900 font-semibold dark:text-white">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Monitor;
