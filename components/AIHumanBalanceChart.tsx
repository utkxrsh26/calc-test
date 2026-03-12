'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const aiHumanData = [
  { name: 'AI Reviews', value: 60, fill: '#f59e0b' },
  { name: 'Human Reviews', value: 40, fill: '#06b6d4' },
];

const COLORS = ['#f59e0b', '#06b6d4'];

export default function AIHumanBalanceChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="cycle-card">
        <h3>AI vs. Human Review Balance</h3>
        <div style={{ height: '200px' }}></div>
      </div>
    );
  }

  return (
    <div className="cycle-card">
      <h3>AI vs. Human Review Balance</h3>
      <ChartContainer
        config={{
          'AI Reviews': {
            label: 'AI Reviews',
            color: '#f59e0b',
          },
          'Human Reviews': {
            label: 'Human Reviews',
            color: '#06b6d4',
          },
        }}
        className="h-[200px] w-full"
      >
        <PieChart>
          <Pie
            data={aiHumanData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {aiHumanData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent />} />
        </PieChart>
      </ChartContainer>
      <div className="cycle-legend">
        <span className="legend-item">
          <span className="dot" style={{backgroundColor: '#f59e0b'}}></span> AI Reviews (60%)
        </span>
        <span className="legend-item">
          <span className="dot" style={{backgroundColor: '#06b6d4'}}></span> Human Reviews (40%)
        </span>
      </div>
    </div>
  );
}
