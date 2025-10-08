"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

const PYTHON_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://calculator.qodeinvest.com"
    : "http://localhost:5080";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${PYTHON_BASE_URL}/api/clienttracker/dashboard_summary`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("API error:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full min-h-screen p-6 text-foreground">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Overall Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Overall Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-lg">
                <div>
                  <p className="font-semibold text-md">Total Clients</p>
                  <p>{data?.overall_summary.total_clients ?? "-"}</p>
                </div>
                <div>
                  <p className="font-semibold text-md">Total AUM</p>
                  <p>₹{(data?.overall_summary.total_aum ?? 0).toLocaleString()}</p>
                </div>
                <div className="col-span-1">
                  <p className="font-semibold text-md">Latest Data Date</p>
                  <p>
                    {data?.overall_summary.max_date
                      ? new Date(data.overall_summary.max_date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strategy Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Strategy Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Strategy</TableHead>
                    <TableHead className="text-right">Clients</TableHead>
                    <TableHead className="text-right">AUM (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.strategy_summary.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>{s.strategy}</TableCell>
                      <TableCell className="text-right">{s.num_clients}</TableCell>
                      <TableCell className="text-right">
                        {s.aum.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
