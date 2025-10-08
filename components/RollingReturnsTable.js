"use client"
import React from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"

const RollingReturnsTable = ({ portfolios }) => {
  const periods = ["1y", "3y", "5y", "7y"]

  const renderValue = (value) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">N/A</span>
    }
    const color = value > 0 ? "text-[#008455]" : "text-[#550e0e]"
    return <span className={`${color} font-medium`}>{value.toFixed(2)}</span>
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Rolling Returns Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center align-middle"></TableHead>
                {portfolios.map((portfolio, index) => (
                  <TableHead
                    key={`portfolio-header-${index}`}
                    colSpan={3}
                    className="text-center"
                  >
                    {portfolio.portfolio_name || `Portfolio ${index + 1}`}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow>
                <TableHead className="text-center bg-primary text-white">Period</TableHead>
                {portfolios.map((_, index) => (
                  <React.Fragment key={`subheader-${index}`}>
                    <TableHead className="text-center bg-primary text-white">Avg (%)</TableHead>
                    <TableHead className="text-center bg-primary text-white">High (%)</TableHead>
                    <TableHead className="text-center bg-primary text-white">Low (%)</TableHead>
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((period) => (
                <TableRow key={period}>
                  <TableCell className="text-center font-medium">
                    {period.replace("y", " Year")}
                  </TableCell>
                  {portfolios.map((portfolio, pIndex) => {
                    const stats = portfolio.result?.rolling_returns?.[period]
                    return (
                      <React.Fragment key={`row-${period}-portfolio-${pIndex}`}>
                        <TableCell className="text-center">
                          {renderValue(stats?.avg)}
                        </TableCell>
                        <TableCell className="text-center">
                          {renderValue(stats?.high)}
                        </TableCell>
                        <TableCell className="text-center">
                          {renderValue(stats?.low)}
                        </TableCell>
                      </React.Fragment>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default RollingReturnsTable
