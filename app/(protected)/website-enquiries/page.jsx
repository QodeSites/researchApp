"use client"

import React, { useEffect, useState, useMemo } from "react"
import { parseISO, format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, Filter, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

// --- CSV Helpers ---
const generateCsv = (data, type) => {
  const headers =
    type === "newsletter"
      ? ["S.No", "Email", "Subscribed At"]
      : [
        "S.No",
        "Source",
        "Name",
        "Email",
        "Phone",
        "Location",
        "Message",
        "Investment Goal",
        "Investment Experience",
        "Preferred Strategy",
        "Initial Investment Size",
        "Status",
        "Additional Comments",
        "Email Sent",
        "Email ID",
        "Zoho Lead ID",
        "Created Date",
        "Updated Date",
      ]

  const rows = data.map((item, index) => {
    if (type === "newsletter") {
      return [
        index + 1,
        item.email || "-",
        item.createdAt
          ? format(parseISO(item.createdAt), "dd/MM/yyyy, HH:mm:ss")
          : "-",
      ].join(",")
    } else {
      return [
        index + 1,
        item.source || "-",
        `"${(item.name || item.fullName || "").replace(/"/g, '""')}"`,
        item.email || "-",
        item.phone_number || item.contactNumber || "-",
        item.location || "-",
        `"${(item.message || item.additional_message || "").replace(/"/g, '""')}"`,
        item.investment_goal || "-",
        item.investment_experience || "-",
        item.preferred_strategy || "-",
        item.initial_investment_size || "-",
        item.status || "-",
        `"${(item.additionalComments || "").replace(/"/g, '""')}"`,
        item.emailSent || "-",
        item.emailId || "-",
        item.zohoLeadId || "-",
        item.createdAt || item.submittedAt
          ? format(parseISO(item.createdAt || item.submittedAt), "dd/MM/yyyy, HH:mm:ss")
          : "-",
        item.updatedAt
          ? format(parseISO(item.updatedAt), "dd/MM/yyyy, HH:mm:ss")
          : "-",
      ].join(",")
    }
  })

  const filename = type === "newsletter"
    ? `newsletter_${new Date().toISOString().split("T")[0]}.csv`
    : `all_enquiries_${new Date().toISOString().split("T")[0]}.csv`

  return {
    csvContent: [headers.join(","), ...rows].join("\n"),
    filename,
  }
}

const downloadCsv = (csvContent, filename) => {
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Clean message function
const cleanMessage = (msg) => {
  if (!msg) return "-";
  return msg.trim().replace(/\s+/g, ' ');
}

// --- Inquiry Row Component ---
const InquiryRow = ({ inq, index, isSelected, onSelect, onStatusChange, onCommentsChange, onUpdate, updateStates }) => {
  const [expanded, setExpanded] = useState(false)
  const message = cleanMessage(inq.message || inq.additional_message)

  return (
    <TableRow key={inq.unique_id || inq.id} className="hover:bg-muted/50 border-b">
      <TableCell className="w-12 p-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
        />
      </TableCell>
      <TableCell className="font-medium p-2">{index + 1}</TableCell>
      <TableCell className="p-2">
        <span
          className={cn(
            "px-2 py-1 rounded-full text-xs font-semibold",
            inq.source === "website" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
          )}
        >
          {inq.source === "website" ? "Web" : "Client"}
        </span>
      </TableCell>
      <TableCell className="p-2 font-medium max-w-[150px] truncate">{inq.name || inq.fullName || "-"}</TableCell>
      <TableCell className="p-2 max-w-[200px] truncate">{inq.email || "-"}</TableCell>
      <TableCell className="p-2 max-w-[120px] truncate">{inq.phone_number || inq.contactNumber || "-"}</TableCell>
      <TableCell className="p-2 max-w-[100px] truncate">{inq.location || "-"}</TableCell>
      <TableCell className="p-2 max-w-[300px] break-words whitespace-normal">
        {message}
      </TableCell>
      <TableCell className="p-2 max-w-[120px] truncate">{inq.investment_goal || "-"}</TableCell>
      <TableCell className="p-2 max-w-[80px] truncate">{inq.investment_experience || "-"}</TableCell>
      <TableCell className="p-2 max-w-[100px] truncate">{inq.preferred_strategy || "-"}</TableCell>
      <TableCell className="p-2 max-w-[100px] truncate">{inq.initial_investment_size || "-"}</TableCell>
      <TableCell className="p-2">
        <Select
          onValueChange={(val) => onStatusChange(inq.id, val)}
          defaultValue={inq.status || "yet to contact"}
        >
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Contacted">Contacted</SelectItem>
            <SelectItem value="Dummy">Dummy</SelectItem>
            <SelectItem value="yet to contact">Yet to Contact</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="p-2 whitespace-nowrap text-xs text-muted-foreground">
        {inq.createdAt || inq.submittedAt
          ? format(parseISO(inq.createdAt || inq.submittedAt), "dd/MM/yy")
          : "-"}
      </TableCell>
      <TableCell className="p-2">
        <div className={cn("space-y-2", expanded ? "block" : "hidden")}>
          <div className="text-xs space-y-1">
            <p className="font-medium">Full Message:</p>
            <p className="bg-muted p-2 rounded text-xs break-words">{message}</p>
          </div>
          <Textarea
            placeholder="Add comments..."
            value={
              updateStates[inq.id]?.additionalComments ??
              inq.additionalComments ??
              ""
            }
            onChange={(e) => onCommentsChange(inq.id, e.target.value)}
            className="text-xs min-h-[60px] w-full"
          />
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              onUpdate(inq.id)
              setExpanded(false)
            }}
          >
            Update
          </Button>
        </div>
        {!expanded && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6 px-2"
            onClick={() => setExpanded(true)}
          >
            Edit
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

// --- Newsletter Row Component ---
const NewsletterRow = ({ email, index, isSelected, onSelect }) => (
  <TableRow key={email.unique_id || email.id} className="hover:bg-muted/50 border-b">
    <TableCell className="w-12 p-2">
      <Checkbox checked={isSelected} onCheckedChange={onSelect} />
    </TableCell>
    <TableCell className="font-medium p-2">{index + 1}</TableCell>
    <TableCell className="p-2 max-w-[300px] truncate">{email.email}</TableCell>
    <TableCell className="p-2 whitespace-nowrap text-xs text-muted-foreground">
      {email.createdAt ? format(parseISO(email.createdAt), "dd/MM/yy") : "-"}
    </TableCell>
  </TableRow>
)

// --- Main Component ---
const DataViewer = () => {
  const [allInquiries, setAllInquiries] = useState([])
  const [newsletterEmails, setNewsletterEmails] = useState([])
  const [loading, setLoading] = useState({ inquiries: true, newsletter: true })
  const [error, setError] = useState(null)
  const [selectedInquiries, setSelectedInquiries] = useState([])
  const [selectedNewsletterEmails, setSelectedNewsletterEmails] = useState([])
  const [updateStates, setUpdateStates] = useState({})
  const [searchQuery, setSearchQuery] = useState({ inquiries: "", newsletter: "" })
  const [sourceFilter, setSourceFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  // Fetch data
  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        setLoading((prev) => ({ ...prev, inquiries: true }))
        const response = await fetch("/api/websiteEnquiries")
        const data = await response.json()
        if (data.success) {
          setAllInquiries(data.data || [])
        } else {
          throw new Error(data.message || "Failed to fetch inquiries")
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading((prev) => ({ ...prev, inquiries: false }))
      }
    }

    const fetchNewsletterEmails = async () => {
      try {
        setLoading((prev) => ({ ...prev, newsletter: true }))
        const response = await fetch("/api/newsletterEmails")
        const data = await response.json()
        if (data.success) {
          setNewsletterEmails(data.data || [])
        } else {
          throw new Error(data.message || "Failed to fetch newsletter emails")
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading((prev) => ({ ...prev, newsletter: false }))
      }
    }

    fetchInquiries()
    fetchNewsletterEmails()
  }, [])

  const handleStatusChange = (id, status) => {
    setUpdateStates((prev) => ({ ...prev, [id]: { ...prev[id], status } }))
  }

  const handleCommentsChange = (id, comments) => {
    setUpdateStates((prev) => ({ ...prev, [id]: { ...prev[id], additionalComments: comments || "" } }))
  }

  const handleUpdate = async (id) => {
    const { status = "yet to contact", additionalComments = "" } = updateStates[id] || {}
    try {
      const response = await fetch("/api/updateInquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, additionalComments }),
      })
      const data = await response.json()
      if (data.success) {
        alert("Inquiry updated successfully")
        setAllInquiries((prev) =>
          prev.map((inq) => (inq.id === id ? { ...inq, status, additionalComments } : inq))
        )
        setUpdateStates((prev) => {
          const newStates = { ...prev }
          delete newStates[id]
          return newStates
        })
      }
    } catch (error) {
      alert("Error updating inquiry")
    }
  }

  const clearFilters = () => {
    setSearchQuery({ inquiries: "", newsletter: "" })
    setSourceFilter("all")
    setStatusFilter("all")
  }

  // Memoized filtered data
  const filteredInquiries = useMemo(() => {
    return allInquiries.filter((inq) => {
      const cleanMsg = cleanMessage(inq.message || inq.additional_message)
      const matchesSearch =
        searchQuery.inquiries === "" ||
        (inq.name || inq.fullName || "").toLowerCase().includes(searchQuery.inquiries.toLowerCase()) ||
        (inq.email || "").toLowerCase().includes(searchQuery.inquiries.toLowerCase()) ||
        (inq.phone_number || inq.contactNumber || "").toLowerCase().includes(searchQuery.inquiries.toLowerCase()) ||
        (inq.location || "").toLowerCase().includes(searchQuery.inquiries.toLowerCase()) ||
        cleanMsg.toLowerCase().includes(searchQuery.inquiries.toLowerCase())

      const matchesSource = sourceFilter === "all" || inq.source === sourceFilter
      const matchesStatus = statusFilter === "all" || (inq.status || "yet to contact") === statusFilter

      return matchesSearch && matchesSource && matchesStatus
    })
  }, [allInquiries, searchQuery.inquiries, sourceFilter, statusFilter])

  const filteredNewsletterEmails = useMemo(() => {
    return newsletterEmails.filter((email) =>
      email.email.toLowerCase().includes(searchQuery.newsletter.toLowerCase())
    )
  }, [newsletterEmails, searchQuery.newsletter])

  const websiteCount = allInquiries.filter((inq) => inq.source === "website").length
  const clientCount = allInquiries.filter((inq) => inq.source === "client_enquiry").length
  const hasActiveFilters = searchQuery.inquiries !== "" || sourceFilter !== "all" || statusFilter !== "all"

  return (
    <div className="p-6 min-h-screen bg-background">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Website Data</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Tabs defaultValue="inquiries" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inquiries">Inquiries ({allInquiries.length})</TabsTrigger>
          <TabsTrigger value="newsletter">Newsletter ({newsletterEmails.length})</TabsTrigger>
        </TabsList>

        {/* Inquiries Tab */}
        <TabsContent value="inquiries" className="mt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <p className="text-sm text-muted-foreground">
              Website: <span className="font-semibold">{websiteCount}</span> |
              Client: <span className="font-semibold">{clientCount}</span> |
              Total: <span className="font-semibold">{allInquiries.length}</span>
              {hasActiveFilters && (
                <span className="ml-2">| Results: <span className="font-semibold text-primary">{filteredInquiries.length}</span></span>
              )}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="flex items-center gap-1">
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => {
                  if (!selectedInquiries.length) return alert("Select at least one inquiry")
                  const { csvContent, filename } = generateCsv(
                    allInquiries.filter((i) => selectedInquiries.includes(i.id)),
                    "inquiries"
                  )
                  downloadCsv(csvContent, filename)
                }}
                className="flex-1 sm:w-auto"
              >
                Download Selected ({selectedInquiries.length})
              </Button>
              <div className="flex gap-2">
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="client_enquiry">Client</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Contacted">Contacted</SelectItem>
                    <SelectItem value="Dummy">Dummy</SelectItem>
                    <SelectItem value="yet to contact">Yet to Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="w-10 h-9"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inquiries (name, email, phone, location, message)..."
                value={searchQuery.inquiries}
                onChange={(e) => setSearchQuery((prev) => ({ ...prev, inquiries: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          {loading.inquiries ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {hasActiveFilters ? "No matching inquiries found." : "No inquiries available."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedInquiries.length === filteredInquiries.length && filteredInquiries.length > 0
                        }
                        onCheckedChange={(checked) =>
                          setSelectedInquiries(checked ? filteredInquiries.map((i) => i.id) : [])
                        }
                      />
                    </TableHead>
                    <TableHead>#</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="max-w-[300px]">Message</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead>Exp.</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Invest.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInquiries.map((inq, i) => (
                    <InquiryRow
                      key={inq.unique_id || inq.id}
                      inq={inq}
                      index={i}
                      isSelected={selectedInquiries.includes(inq.id)}
                      onSelect={() =>
                        setSelectedInquiries((prev) =>
                          prev.includes(inq.id)
                            ? prev.filter((id) => id !== inq.id)
                            : [...prev, inq.id]
                        )
                      }
                      onStatusChange={handleStatusChange}
                      onCommentsChange={handleCommentsChange}
                      onUpdate={handleUpdate}
                      updateStates={updateStates}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Newsletter Tab */}
        <TabsContent value="newsletter" className="mt-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Button
              onClick={() => {
                if (!selectedNewsletterEmails.length) return alert("Select at least one email")
                const { csvContent, filename } = generateCsv(
                  newsletterEmails.filter((i) => selectedNewsletterEmails.includes(i.id)),
                  "newsletter"
                )
                downloadCsv(csvContent, filename)
              }}
              className="flex-1 sm:w-auto"
            >
              Download Selected ({selectedNewsletterEmails.length})
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchQuery.newsletter}
                onChange={(e) => setSearchQuery((prev) => ({ ...prev, newsletter: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          {loading.newsletter ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredNewsletterEmails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery.newsletter ? "No matching emails found." : "No newsletter emails available."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedNewsletterEmails.length === filteredNewsletterEmails.length &&
                          filteredNewsletterEmails.length > 0
                        }
                        onCheckedChange={(checked) =>
                          setSelectedNewsletterEmails(checked ? filteredNewsletterEmails.map((i) => i.id) : [])
                        }
                      />
                    </TableHead>
                    <TableHead>#</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Subscribed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNewsletterEmails.map((email, i) => (
                    <NewsletterRow
                      key={email.unique_id || email.id}
                      email={email}
                      index={i}
                      isSelected={selectedNewsletterEmails.includes(email.id)}
                      onSelect={() =>
                        setSelectedNewsletterEmails((prev) =>
                          prev.includes(email.id)
                            ? prev.filter((id) => id !== email.id)
                            : [...prev, email.id]
                        )
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DataViewer