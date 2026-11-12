"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RainChart({ data }: { data: { month: string; mm: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,.12)" strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#d5e0d6" }} />
        <YAxis tick={{ fontSize: 10, fill: "#d5e0d6" }} />
        <Tooltip />
        <Bar dataKey="mm" fill="#d8f34a" name="Normal rain (mm)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TmaxChart({ data }: { data: { month: string; c: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,.12)" strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#d5e0d6" }} />
        <YAxis tick={{ fontSize: 10, fill: "#d5e0d6" }} />
        <Tooltip />
        <ReferenceLine y={35} stroke="#d8f34a" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="c" stroke="#f4f7f2" name="Tmax normal °C" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SmapChart({
  data,
}: {
  data: { month: string; rootzone: number; surface: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,.12)" strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#d5e0d6" }} />
        <YAxis tick={{ fontSize: 10, fill: "#d5e0d6" }} domain={[0, 0.5]} />
        <Tooltip />
        <Line type="monotone" dataKey="rootzone" stroke="#d8f34a" name="Root zone m³/m³" />
        <Line type="monotone" dataKey="surface" stroke="#f4f7f2" name="Surface m³/m³" />
      </LineChart>
    </ResponsiveContainer>
  );
}
