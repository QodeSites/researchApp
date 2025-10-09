"use client"
import React, { useState, useEffect } from "react"
import Highcharts from "highcharts"
import HighchartsReact from "highcharts-react-official"
import ChartColorManager from "./ChartColorManager"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"

const DEFAULT_COLORS = [
  "#81b17b", // light green
  "#4e8e75", // teal green
  "#417f70", // darker teal
  "#7cb484", // soft green
  "#0a1d1e", // very dark green/black
]

const AnnualReturnsChart = ({ portfolios }) => {
  const [chartOptions, setChartOptions] = useState({ series: [] })

  useEffect(() => {
    const allYearsSet = new Set()
    portfolios.forEach((portfolio) => {
      portfolio.result?.annual_returns?.forEach((entry) =>
        allYearsSet.add(entry.year)
      )
    })
    const allYears = Array.from(allYearsSet).sort()

    const initialSeries = portfolios.map((portfolio, index) => {
      const annualReturnsMap = new Map()
      portfolio.result?.annual_returns?.forEach((entry) => {
        annualReturnsMap.set(entry.year, parseFloat(entry.return.toFixed(2)))
      })

      const data = allYears.map((year) => annualReturnsMap.get(year) || null)

      return {
        name: portfolio.portfolio_name || `Portfolio ${index + 1}`,
        data,
        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        dataLabels: {
          enabled: true,
          format: "{y:.2f}%",
          style: { fontSize: "12px" },
        },
      }
    })

    setChartOptions({
      chart: { type: "column", height: 600, backgroundColor: "#FCF9EB" },
      title: { text: null },
      xAxis: {
        categories: allYears,
        title: { text: "Year", style: { fontSize: "14px" } },
        labels: { style: { fontSize: "12px" } },
      },
      yAxis: {
        title: { text: "Return (%)", style: { fontSize: "14px" } },
        labels: {
          formatter: function () {
            return `${this.value.toFixed(1)}%`
          },
          style: { fontSize: "12px" },
        },
      },
      tooltip: {
        shared: true,
        useHTML: true,
        formatter: function () {
          let tooltip = `<span style="font-size:10px">${this.x}</span><br/>`
          this.points.forEach((point) => {
            tooltip += `<span style="color:${point.series.color}">\u25CF</span> ${
              point.series.name
            }: <b>${point.y !== null ? point.y.toFixed(2) + "%" : "-"}</b><br/>`
          })
          return tooltip
        },
        style: { fontSize: "12px" },
      },
      plotOptions: { column: { grouping: true, shadow: false, borderWidth: 0 } },
      series: initialSeries,
      credits: { enabled: false },
      legend: {
        enabled: true,
        align: "center",
        verticalAlign: "bottom",
        layout: "horizontal",
        itemStyle: { fontSize: "12px" },
      },
    })
  }, [portfolios])

  return (
    <Card className="shadow w-full">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg font-semibold">
          Annual Returns Comparison with CAGR
        </CardTitle>
        <ChartColorManager
          chartOptions={chartOptions}
          setChartOptions={setChartOptions}
        />
      </CardHeader>
      <CardContent>
        <HighchartsReact
          highcharts={Highcharts}
          options={chartOptions}
          containerProps={{ style: { height: "600px", width: "100%" } }}
        />
      </CardContent>
    </Card>
  )
}

export default AnnualReturnsChart
