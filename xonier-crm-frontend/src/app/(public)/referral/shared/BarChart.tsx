"use client";

import { useEffect, useRef } from "react";
import { Chart, BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend } from "chart.js";

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

const gridColor = "#DEDACB";
const textColor = "#5B675F";

export interface BarSeries {
  label: string;
  data: number[];
  color: string;
}

export default function BarChart({
  labels,
  series,
  height = 220,
}: {
  labels: string[];
  series: BarSeries[];
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: series.map((s) => ({
          label: s.label,
          data: s.data,
          backgroundColor: s.color,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { family: "Inter", size: 11 } } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: textColor, font: { family: "Inter", size: 10 } } },
          y: {
            stacked: true,
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: "Inter", size: 10 }, callback: (v) => "$" + Number(v) / 1000 + "k" },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [labels, series]);

  return (
    <div className="relative" style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
