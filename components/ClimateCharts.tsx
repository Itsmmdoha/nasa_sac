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

export function RainChart({
  data,
  name = "Normal rain (mm)",
}: {
  data: { month: string; mm: number }[];
  name?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="mm" fill="#047857" name={name} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TmaxChart({
  data,
  name = "Tmax normal °C",
}: {
  data: { month: string; c: number }[];
  name?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <ReferenceLine y={35} stroke="#dc2626" strokeDasharray="4 4" label="35°C" />
        <Line type="monotone" dataKey="c" stroke="#b45309" name={name} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SmapChart({
  data,
  rootLabel = "Root zone m³/m³",
  surfaceLabel = "Surface m³/m³",
}: {
  data: { month: string; rootzone: number; surface: number }[];
  rootLabel?: string;
  surfaceLabel?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} domain={[0, 0.5]} />
        <Tooltip />
        <Line type="monotone" dataKey="rootzone" stroke="#0369a1" name={rootLabel} />
        <Line type="monotone" dataKey="surface" stroke="#7c3aed" name={surfaceLabel} />
      </LineChart>
    </ResponsiveContainer>
  );
}
