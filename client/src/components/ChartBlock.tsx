import type { Chart } from '../types/infographic';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  chart: Chart;
  theme: 'editorial-light' | 'midnight-data';
}

const COLORS_LIGHT = ['#4F46E5', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];
const COLORS_DARK = ['#00D9F5', '#7C6FF7', '#34D399', '#FBBF24', '#FB7185', '#A78BFA'];

function formatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

export default function ChartBlock({ chart, theme }: Props) {
  const isDark = theme === 'midnight-data';
  const colors = isDark ? COLORS_DARK : COLORS_LIGHT;
  const textColor = isDark ? '#8B97B5' : '#5C6280';
  const gridColor = isDark ? '#21262D' : '#E5E2D8';
  const primaryColor = isDark ? '#00D9F5' : '#4F46E5';

  const data = chart.labels.map((label, i) => ({
    name: label,
    value: chart.values[i] ?? 0,
  }));

  const renderChart = () => {
    if (chart.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: textColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              angle={-20}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fill: textColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatValue}
            />
            <Tooltip
              contentStyle={{
                background: isDark ? '#1C2230' : '#fff',
                border: `1px solid ${isDark ? '#21262D' : '#E5E2D8'}`,
                borderRadius: '8px',
                color: isDark ? '#E8EAF6' : '#1A1F36',
                fontSize: '12px',
              }}
              formatter={(value: number) => [formatValue(value), chart.title]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chart.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 15, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: textColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: textColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatValue}
            />
            <Tooltip
              contentStyle={{
                background: isDark ? '#1C2230' : '#fff',
                border: `1px solid ${isDark ? '#21262D' : '#E5E2D8'}`,
                borderRadius: '8px',
                color: isDark ? '#E8EAF6' : '#1A1F36',
                fontSize: '12px',
              }}
              formatter={(value: number) => [formatValue(value), chart.title]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={primaryColor}
              strokeWidth={2.5}
              dot={{ fill: primaryColor, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chart.type === 'donut') {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="75%"
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: isDark ? '#1C2230' : '#fff',
                border: `1px solid ${isDark ? '#21262D' : '#E5E2D8'}`,
                borderRadius: '8px',
                color: isDark ? '#E8EAF6' : '#1A1F36',
                fontSize: '12px',
              }}
              formatter={(value: number) => [formatValue(value), '']}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  // Legend for donut charts
  const renderLegend = () => {
    if (chart.type !== 'donut') return null;
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: colors[i % colors.length] }}
            />
            <span className="infographic-text-muted text-xs">{item.name}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="infographic-card rounded-2xl p-6 animate-fade-in">
      <h3 className="infographic-text-primary font-bold text-base mb-1">
        {chart.title}
      </h3>
      <div className="mt-4">
        {renderChart()}
        {renderLegend()}
      </div>
    </div>
  );
}
