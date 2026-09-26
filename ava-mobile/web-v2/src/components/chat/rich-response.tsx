import { memo, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MessageResponse } from "@/components/ai-elements/message";

/**
 * Agent markdown renderer: markdown, GFM tables, code (syntax + diff), mermaid,
 * math (KaTeX) via MessageResponse, plus ```chart JSON blocks rendered as graphs.
 *
 * Chart block shape:
 * { "type": "bar"|"line"|"area"|"pie", "title"?: string,
 *   "data": [{...}], "xKey"?: string, "yKeys"?: string[] }
 */

interface ChartSpec {
  type?: "bar" | "line" | "area" | "pie";
  title?: string;
  data: Record<string, string | number>[];
  xKey?: string;
  yKeys?: string[];
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const CHART_RE = /```(?:chart|graph|recharts)\s*\n([\s\S]*?)```/g;

type Segment = { kind: "md"; text: string } | { kind: "chart"; spec: ChartSpec } ;

function split(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(CHART_RE)) {
    const idx = m.index ?? 0;
    try {
      const spec = JSON.parse(m[1]!) as ChartSpec;
      if (!Array.isArray(spec.data) || !spec.data.length) continue;
      if (idx > last) out.push({ kind: "md", text: text.slice(last, idx) });
      out.push({ kind: "chart", spec });
      last = idx + m[0].length;
    } catch {
      /* incomplete while streaming — leave as code */
    }
  }
  if (last < text.length) out.push({ kind: "md", text: text.slice(last) });
  return out;
}

function ChartBlock({ spec }: { spec: ChartSpec }) {
  const first = spec.data[0] ?? {};
  const xKey = spec.xKey ?? Object.keys(first).find((k) => typeof first[k] === "string") ?? "name";
  const yKeys = spec.yKeys ?? Object.keys(first).filter((k) => k !== xKey && typeof first[k] === "number");
  const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false };
  const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 } };

  const chart =
    spec.type === "pie" ? (
      <PieChart>
        <Pie data={spec.data} dataKey={yKeys[0] ?? "value"} nameKey={xKey} innerRadius="45%" outerRadius="80%" paddingAngle={2}>
          {spec.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    ) : spec.type === "line" ? (
      <LineChart data={spec.data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} width={36} />
        <Tooltip {...tip} />
        {yKeys.map((k, i) => <Line key={k} dataKey={k} stroke={COLORS[i % 5]} strokeWidth={2} dot={false} />)}
      </LineChart>
    ) : spec.type === "area" ? (
      <AreaChart data={spec.data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} width={36} />
        <Tooltip {...tip} />
        {yKeys.map((k, i) => <Area key={k} dataKey={k} stroke={COLORS[i % 5]} fill={COLORS[i % 5]} fillOpacity={0.2} />)}
      </AreaChart>
    ) : (
      <BarChart data={spec.data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} width={36} />
        <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
        {yKeys.map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i % 5]} radius={[6, 6, 0, 0]} />)}
      </BarChart>
    );

  return (
    <figure className="glass my-3 rounded-2xl p-3">
      {spec.title && <figcaption className="mb-2 text-sm font-medium">{spec.title}</figcaption>}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>
      </div>
    </figure>
  );
}

export const RichResponse = memo(({ text }: { text: string }) => {
  const segments = useMemo(() => split(text), [text]);
  return (
    <>
      {segments.map((s, i) =>
        s.kind === "chart" ? <ChartBlock key={i} spec={s.spec} /> : <MessageResponse key={i}>{s.text}</MessageResponse>,
      )}
    </>
  );
});
RichResponse.displayName = "RichResponse";
