"use client"
import React from "react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
} from "recharts"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"

// Define a color palette
// const COLORS = [
//   "#0088FE",
//   "#00C49F",
//   "#FFBB28",
//   "#FF8042",
//   "#AF19FF",
//   "#FF4560",
//   "#00E396",
//   "#775DD0",
//   "#FEB019",
//   "#FF66C3",
// ]

const COLORS = [
  "#02422b", // primary (dark green)
  "#dabd38", // primary-foreground (gold)
  "#37584f", // card-foreground (teal grey)
  "#efecd3", // secondary/muted background
  "#002017", // foreground (deep green-black)
  "#FCF9EB", // background (light beige)
  "#f7f5e9", // card background
  "#ef4444", // destructive red
];


const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0]
    return (
      <div className="bg-white/90 border border-gray-300 p-2 rounded shadow-sm text-sm">
        <strong>{name}</strong>
        <br />
        Percentage: {value}%
      </div>
    )
  }
  return null
}

const DonutChart = ({ data, title }) => {
  if (!data || data.length === 0) return null

  return (
    <Card className="h-full shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="y"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              label={({ name }) => name}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
            <RechartsLegend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default DonutChart
