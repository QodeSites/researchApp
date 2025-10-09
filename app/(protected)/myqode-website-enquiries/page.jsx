"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const COLUMNS = [
  { key: "row", label: "S.No" },
  { key: "type", label: "Type" },
  { key: "nuvama_code", label: "Code" },
  { key: "client_id", label: "Client ID" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "data_preview", label: "Data" },
  { key: "user_email", label: "User Email" },
  { key: "subject", label: "Subject" },
  { key: "email_to", label: "Email To" },
  { key: "email_from", label: "Email From" },
  { key: "created_at", label: "Created At" },
  { key: "updated_at", label: "Updated At" },
  { key: "resolved_at", label: "Resolved At" },
]

function formatDT(s) {
  if (!s) return "-"
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString()
}
function isDateKey(k) {
  return ["created_at", "updated_at", "resolved_at"].includes(k)
}
function includesInsensitive(a, query) {
  if (!query) return true
  if (a == null) return false
  return String(a).toLowerCase().includes(query.toLowerCase())
}

export default function TicketsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")

  const [showJson, setShowJson] = useState(false)
  const [jsonRow, setJsonRow] = useState(null)

  async function fetchTickets() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/ticket")
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to fetch")
      setRows(Array.isArray(json?.results) ? json.results : [])
    } catch (e) {
      setError(e.message || "Failed")
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const allStatuses = useMemo(
    () => [...new Set((rows ?? []).map((r) => r.status).filter(Boolean))],
    [rows]
  )
  const allTypes = useMemo(
    () => [...new Set((rows ?? []).map((r) => r.type).filter(Boolean))],
    [rows]
  )

  const filtered = useMemo(() => {
    return (rows ?? []).filter((r) => {
      if (search && !includesInsensitive(JSON.stringify(r), search)) return false
      if (typeFilter && r.type !== typeFilter) return false
      if (statusFilter && r.status !== statusFilter) return false
      return true
    })
  }, [rows, search, typeFilter, statusFilter])

  return (
    <div className="p-6 text-foreground min-h-screen">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-primary">Tickets</h2>
          <Button onClick={fetchTickets} disabled={loading}>
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background rounded-lg"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-background rounded-lg">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {allTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-background rounded-lg">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              {allStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin h-6 w-6 text-primary" />
            </div>
          ) : error ? (
            <div className="text-red-600 bg-red-100 p-3 rounded">{error}</div>
          ) : (
            <Table className="bg-background rounded-lg font-bold">
              <TableHeader className="bg-primary rounded-lg text-white font-bold">
                <TableRow>
                  {COLUMNS.map((c) => (
                    <TableHead key={c.key} className="bg-primary text-white font-bold">{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length} className="text-center py-4">
                      No results
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r, idx) => (
                    <TableRow key={r.id || idx}>
                      {COLUMNS.map((c) => {
                        if (c.key === "row")
                          return <TableCell key={c.key}>{idx + 1}</TableCell>
                        if (c.key === "data_preview")
                          return (
                            <TableCell key={c.key}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setJsonRow(r)
                                  setShowJson(true)
                                }}
                              >
                                View JSON
                              </Button>
                            </TableCell>
                          )
                        if (isDateKey(c.key))
                          return (
                            <TableCell key={c.key}>{formatDT(r[c.key])}</TableCell>
                          )
                        return <TableCell key={c.key}>{r[c.key] ?? "-"}</TableCell>
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* JSON Dialog */}
      <Dialog open={showJson} onOpenChange={setShowJson}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Row JSON</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted rounded p-3 text-sm whitespace-pre-wrap">
            {JSON.stringify(jsonRow?.data ?? jsonRow, null, 2)}
          </pre>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowJson(false)}>
              Close
            </Button>
            <Button
              onClick={() =>
                navigator.clipboard.writeText(
                  JSON.stringify(jsonRow?.data ?? jsonRow, null, 2)
                )
              }
            >
              Copy JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
