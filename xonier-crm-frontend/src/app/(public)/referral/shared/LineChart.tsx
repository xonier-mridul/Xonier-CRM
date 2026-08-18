"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend);

const gridColor = "#DEDACB";
const textColor = "#5B675F";

export interface LineSeries {
  label?: string;
  data: number[];
  color: string;
  dashed?: boolean;
  fillArea?: boolean;
}

export default function LineChart({
  labels,
  series,
  showLegend = false,
  height = 220,
}: {
  labels: string[];
  series: LineSeries[];
  showLegend?: boolean;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: series.map((s) => ({
          label: s.label,
          data: s.data,
          borderColor: s.color,
          backgroundColor: s.fillArea ? `${s.color}14` : "transparent",
          fill: !!s.fillArea,
          tension: 0.3,
          borderWidth: s.dashed ? 1.5 : 2,
          borderDash: s.dashed ? [4, 3] : undefined,
          pointRadius: s.dashed ? 0 : 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: showLegend,
            labels: { color: textColor, font: { family: "Inter", size: 11 } },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { family: "Inter", size: 10 } } },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: "Inter", size: 10 },
              callback: (v) => "$" + (Number(v) >= 1000 ? (Number(v) / 1000).toFixed(0) + "k" : v),
            },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [labels, series, showLegend]);

  return (
    <div className="relative" style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
