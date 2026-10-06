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
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="mm" fill="#047857" name="Normal rain (mm)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TmaxChart({ data }: { data: { month: string; c: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <ReferenceLine y={35} stroke="#dc2626" strokeDasharray="4 4" label="35°C" />
        <Line type="monotone" dataKey="c" stroke="#b45309" name="Tmax normal °C" dot={false} />
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
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} domain={[0, 0.5]} />
        <Tooltip />
        <Line type="monotone" dataKey="rootzone" stroke="#0369a1" name="Root zone m³/m³" />
        <Line type="monotone" dataKey="surface" stroke="#7c3aed" name="Surface m³/m³" />
      </LineChart>
    </ResponsiveContainer>
  );
}
