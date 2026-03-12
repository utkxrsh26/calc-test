'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const mergeTimeData = [
  { month: 'Jan', 'Merge Time (days)': 4.5 },
  { month: 'Feb', 'Merge Time (days)': 3.8 },
  { month: 'Mar', 'Merge Time (days)': 2.5 },
  { month: 'Apr', 'Merge Time (days)': 2.2 },
  { month: 'May', 'Merge Time (days)': 1.9 },
  { month: 'Jun', 'Merge Time (days)': 1.7 },
];

export default function MergeTimeChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="cycle-card">
        <h3>Merge Time Trends</h3>
        <div style={{ height: '200px' }}></div>
      </div>
    );
  }

  return (
    <div className="cycle-card">
      <h3>Merge Time Trends</h3>
      <ChartContainer
        config={{
          'Merge Time (days)': {
            label: 'Merge Time (days)',
            color: '#3b82f6',
          },
        }}
        className="h-[200px] w-full"
      >
        <LineChart data={mergeTimeData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="month" 
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}d`}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="Merge Time (days)"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 3 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
