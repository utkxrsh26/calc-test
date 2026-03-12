'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const reviewerData = [
  { reviewer: 'Reviewer A', load: 25 },
  { reviewer: 'Reviewer B', load: 35 },
  { reviewer: 'Reviewer C', load: 20 },
  { reviewer: 'Reviewer D', load: 20 },
];

export default function ReviewerLoadChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="cycle-card">
        <h3>Reviewer Load</h3>
        <div style={{ height: '200px' }}></div>
      </div>
    );
  }

  return (
    <div className="cycle-card">
      <h3>Reviewer Load</h3>
      <ChartContainer
        config={{
          load: {
            label: 'Load %',
            color: '#10b981',
          },
        }}
        className="h-[200px] w-full"
      >
        <BarChart data={reviewerData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="reviewer" 
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar 
            dataKey="load" 
            fill="#10b981"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
