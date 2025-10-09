"use client"
import React from "react"
import PropTypes from "prop-types"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"

const TrailingReturnsTable = ({ portfolios }) => {
  const periods = ["10d", "1w", "1m", "3m", "6m", "1y", "3y", "5y"]

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Portfolio Trailing Returns Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-white bg-primary">Portfolio</TableHead>
                {periods.map((period) => ( 
                  <TableHead key={period} className="text-center text-white bg-primary">
                    {period.toUpperCase()}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolios.map((portfolio, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    {portfolio.portfolio_name ||
                      `Portfolio ${portfolio.portfolio_index}`}
                  </TableCell>
                  {periods.map((period) => {
                    const value = portfolio.result?.trailing_returns?.[period]
                    const formattedValue =
                      value != null ? `${value.toFixed(2)}%` : "-"
                    const color =
                      value > 0
                        ? "text-green-600"
                        : value < 0
                        ? "text-red-600"
                        : "text-foreground"

                    return (
                      <TableCell
                        key={period}
                        className={`text-center ${color} font-medium`}
                      >
                        {formattedValue}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground space-y-1">
        <p>Returns ≥ 1y are CAGR</p>
        <p>Returns &lt; 1y are Absolute</p>
      </CardFooter>
    </Card>
  )
}

TrailingReturnsTable.propTypes = {
  portfolios: PropTypes.arrayOf(
    PropTypes.shape({
      portfolio_name: PropTypes.string,
      portfolio_index: PropTypes.number,
      result: PropTypes.shape({
        trailing_returns: PropTypes.object,
      }),
    })
  ).isRequired,
}

export default TrailingReturnsTable
