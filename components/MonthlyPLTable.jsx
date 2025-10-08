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
import { Alert, AlertDescription } from "@/components/ui/alert"

function MonthlyPLTable({ portfolios }) {
  if (!portfolios || portfolios.length === 0) {
    return (
      <Alert variant="destructive" className="text-center">
        <AlertDescription>No data available</AlertDescription>
      </Alert>
    )
  }

  const monthsShort = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]

  const monthsFull = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  const renderCell = (value) => {
    const numValue = parseFloat(value)
    const cellValue = isNaN(numValue) ? "0.0%" : `${numValue.toFixed(2)}%`

    let cellClass = "text-center"
    if (numValue > 4) {
      cellClass += " bg-green-100 text-green-700 font-semibold"
    } else if (numValue < -4) {
      cellClass += " bg-red-100 text-red-700 font-semibold"
    }

    return <TableCell className={cellClass}>{cellValue}</TableCell>
  }

  return (
    <Card className="shadow-sm mb-6">
      <CardHeader>
        <CardTitle>Monthly PnL Table (%)</CardTitle>
      </CardHeader>
      <CardContent>
        {portfolios.map((portfolio, index) => (
          <div key={index} className="mb-6">
            <h5 className="font-semibold mb-3 text-lg">
              {portfolio.portfolio_name || `Portfolio ${index + 1}`}
            </h5>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center bg-primary text-white">Year</TableHead>
                    {monthsShort.map((month) => (
                      <TableHead key={month} className="text-center bg-primary text-white">
                        {month}
                      </TableHead>
                    ))}
                    <TableHead className="text-center bg-primary text-white">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolio?.result?.monthly_pl_table?.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell className="text-center font-semibold bg-muted">
                        {row.Year}
                      </TableCell>
                      {monthsFull.map((month) => renderCell(row[month]))}
                      {renderCell(row.Total)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {index < portfolios.length - 1 && (
              <hr className="my-6 border-border" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default MonthlyPLTable
