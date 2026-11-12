"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { fontSize: 12, fill: "#86684f" };
const GRID = "#ead8bb";
const TIP = {
  contentStyle: { background: "#fffbf3", border: "1px solid #dcc3a0", borderRadius: 10, fontSize: 13 },
};
const RABI = new Set(["NOV", "DEC", "JAN", "FEB", "MAR"]);

export function RainChart({ data, label }: { data: { month: string; mm: number }[]; label: string }) {
  const rows = data.map((d) => ({ ...d, mm: Math.round(d.mm) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip {...TIP} cursor={{ fill: "rgba(227,184,136,.25)" }} />
        <Bar
          dataKey="mm"
          name={label}
          radius={[6, 6, 0, 0]}
          shape={(props: unknown) => {
            const p = props as { x: number; y: number; width: number; height: number; payload: { month: string } };
            return (
              <rect x={p.x} y={p.y} width={p.width} height={p.height} rx={5} fill={RABI.has(p.payload.month) ? "#c9844a" : "#0f4c5c"} />
            );
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TmaxChart({ data, label }: { data: { month: string; c: number }[]; label: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={[20, 40]} />
        <Tooltip {...TIP} />
        <ReferenceLine y={35} stroke="#b4332a" strokeDasharray="5 4" label={{ value: "35 °C", fill: "#b4332a", fontSize: 12, position: "insideTopRight" }} />
        <Line type="monotone" dataKey="c" stroke="#e6b325" strokeWidth={3} name={label} dot={{ r: 3, fill: "#e6b325" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SmapChart({
  data,
  rootLabel,
  surfLabel,
}: {
  data: { month: string; rootzone: number; surface: number }[];
  rootLabel: string;
  surfLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={[0, 0.5]} />
        <Tooltip {...TIP} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Line type="monotone" dataKey="rootzone" stroke="#0f4c5c" strokeWidth={3} name={rootLabel} dot={false} />
        <Line type="monotone" dataKey="surface" stroke="#c9844a" strokeWidth={2} strokeDasharray="5 4" name={surfLabel} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
