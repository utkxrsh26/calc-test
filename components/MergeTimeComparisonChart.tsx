'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import Image from 'next/image';

// Order determines x-axis position: left -> right
const data = [
  { tool: 'Other Tools', time: 7500 }, // 15 hours = 900 minutes
  { tool: 'Codity', time: 708 },
];

const COLORS = {
  Codity: '#3b82f6',
  'Other Tools': '#9ca3af',
} as const;

// Custom label component to render logo above Codity bar
const CodityLogoLabel = (props: any & { isMobile?: boolean }) => {
  const { x, y, width, value, index, isMobile = false } = props;
  
  // Only show logo for Codity (index 1)
  if (index !== 1) return null;
  
  const logoSize = isMobile ? 24 : 32;
  const logoX = x + width / 2 - logoSize / 2;
  const logoY = y - logoSize - 8; // 8px gap above bar
  
  return (
    <g>
      <foreignObject x={logoX} y={logoY} width={logoSize} height={logoSize}>
        <div style={{ width: logoSize, height: logoSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image src="/logo-main.svg" alt="Codity" width={logoSize} height={logoSize} />
        </div>
      </foreignObject>
    </g>
  );
};

// Custom XAxis label with time values below
const CustomXAxisLabel = (props: any & { isMobile?: boolean }) => {
  const { x, y, payload, isMobile = false } = props;
  
  const timeValues: Record<string, string> = {
    'Other Tools': '4–6 hours',
    'Codity': '7.08 minutes'
  };
  
  const timeValue = timeValues[payload.value] || '';
  const fontSize = isMobile ? '10' : '12';
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#9ca3af" fontSize={fontSize} fontWeight="500">
        {payload.value}
      </text>
      <text x={0} y={0} dy={32} textAnchor="middle" fill="#9ca3af" fontSize={fontSize} fontWeight="500">
        {timeValue}
      </text>
    </g>
  );
};

export default function MergeTimeComparisonChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted) {
    return (
      <div className="cycle-card">
        <h3>Faster reviews with Codity</h3>
        <div style={{ height: isMobile ? '200px' : '300px' }}></div>
      </div>
    );
  }

  return (
    <div className="cycle-card">
      
      <ChartContainer
        config={{
          time: {
            label: 'Review Time (minutes)',
            color: '#3b82f6',
          },
        }}
        className={`aspect-auto w-full merge-time-chart ${isMobile ? 'h-[250px]' : 'h-[300px]'}`}
      >
  <BarChart data={data} barCategoryGap="5%" margin={{ bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="tool"
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            tick={(props: any) => <CustomXAxisLabel {...props} isMobile={isMobile} /> as any}
          />
          <YAxis hide domain={[0, 950]} />
          <Bar dataKey="time" radius={[6, 6, 0, 0]} barSize={isMobile ? 36 : 48} className="merge-time-bar">
            {data.map((entry) => (
              <Cell key={`cell-${entry.tool}`} fill={COLORS[entry.tool as keyof typeof COLORS]} />
            ))}
            <LabelList dataKey="time" content={(props: any) => CodityLogoLabel({ ...props, isMobile })} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
