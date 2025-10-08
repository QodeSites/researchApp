import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const DrawdownChart = ({ data }) => {
    if (!data?.length) return null;
  
    // Get number of portfolios from first data point
    const portfolioCount = Object.keys(data[0])
      .filter(key => key.startsWith('drawdown')).length;
  
    // Define colors for each portfolio line
    const colors = [
      "#4682B4", // Steel Blue
      "#20B2AA", // Light Sea Green
      "#87CEEB", // Sky Blue
      "#66CDAA", // Medium Aquamarine
      "#6495ED", // Cornflower Blue
    ];
  
    return (
      <div className="w-full h-[400px]">
        <h2 className="text-xl font-semibold mb-4">Portfolio Drawdowns</h2>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 30,
              left: 10,
              bottom: 30,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              type="number"
              domain={['auto', 'auto']}
              scale="time"
              tickFormatter={(timestamp) => {
                const date = new Date(timestamp);
                return `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
              }}
            />
            <YAxis
              tickFormatter={(value) => `${Math.abs(value).toFixed(1)}%`}
              domain={[-50, 0]}
              label={{ 
                value: 'Drawdown (%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip
              formatter={(value, name) => [
                `${Math.abs(value).toFixed(1)}%`,
                data[0][`portfolioName${name.slice(-1)}`]
              ]}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Legend />
            {[...Array(portfolioCount)].map((_, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={`drawdown${index}`}
                name={data[0][`portfolioName${index}`]}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };
  
  export default DrawdownChart;