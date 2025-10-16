"use client"

import React, { useEffect, useState } from "react"
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
import { Loader2 } from "lucide-react"
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

// --- Component ---
const DataViewer = () => {
  const [allInquiries, setAllInquiries] = useState([])
  const [newsletterEmails, setNewsletterEmails] = useState([])
  const [loading, setLoading] = useState({ inquiries: true, newsletter: true })
  const [error, setError] = useState(null)
  const [selectedInquiries, setSelectedInquiries] = useState([])
  const [selectedNewsletterEmails, setSelectedNewsletterEmails] = useState([])
  const [updateStates, setUpdateStates] = useState({})
  const [searchQuery, setSearchQuery] = useState({
    inquiries: "",
    newsletter: "",
  })
  const [sourceFilter, setSourceFilter] = useState("all")

  // --- Fetch Data ---
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
    setUpdateStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], status },
    }))
  }

  const handleCommentsChange = (id, comments) => {
    setUpdateStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], additionalComments: comments || "" },
    }))
  }

  const handleUpdate = async (id) => {
    const { status = "yet to contact", additionalComments = "" } =
      updateStates[id] || {}
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
          prev.map((inq) =>
            inq.id === id ? { ...inq, status, additionalComments } : inq
          )
        )
      }
    } catch (error) {
      alert("Error updating inquiry")
    }
  }

  // Compute counts
  const websiteCount = allInquiries.filter((inq) => inq.source === "website").length
  const clientCount = allInquiries.filter((inq) => inq.source === "client_enquiry").length

  // Filter inquiries
  const filteredInquiries = allInquiries.filter((inq) => {
    const matchesSearch =
      (inq.name || inq.fullName)
        ?.toLowerCase()
        .includes(searchQuery.inquiries.toLowerCase()) ||
      inq.email?.toLowerCase().includes(searchQuery.inquiries.toLowerCase())

    const matchesSource = sourceFilter === "all" || inq.source === sourceFilter

    return matchesSearch && matchesSource
  })

  const filteredNewsletterEmails = newsletterEmails.filter((email) =>
    email.email.toLowerCase().includes(searchQuery.newsletter.toLowerCase())
  )

  return (
    <div className="p-6 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Website Data</h2>

      {error && (
        <div className="mb-4 text-red-600 bg-red-100 p-2 rounded">
          {error}
        </div>
      )}

      <Tabs defaultValue="inquiries">
        <TabsList>
          <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
          <TabsTrigger value="newsletter">Newsletter Emails</TabsTrigger>
        </TabsList>

        {/* Inquiries */}
        <TabsContent value="inquiries">
          <p className="text-gray-600 mb-4">
            Website: {websiteCount} | Client Enquiry: {clientCount} | Total: {allInquiries.length}
          </p>

          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <Button
              onClick={() => {
                if (!selectedInquiries.length) {
                  alert("Select at least one inquiry")
                  return
                }
                const { csvContent, filename } = generateCsv(
                  allInquiries.filter((i) => selectedInquiries.includes(i.id)),
                  "inquiries"
                )
                downloadCsv(csvContent, filename)
              }}
            >
              Download Selected ({selectedInquiries.length})
            </Button>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="md:w-48 bg-background">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="website">Website Enquiries</SelectItem>
                <SelectItem value="client_enquiry">Client Enquiry</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search by name or email..."
              value={searchQuery.inquiries}
              onChange={(e) => setSearchQuery((prev) => ({ ...prev, inquiries: e.target.value }))}
              className="md:flex-1 bg-background"
            />
          </div>

          {loading.inquiries ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin w-6 h-6 text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border bg-background rounded-lg text-sm min-w-full">
                <TableHeader className="bg-primary text-white font-bold">
                  <TableRow className="bg-primary text-white font-bold">
                    <TableHead className="bg-primary text-white font-bold w-8 p-2">
                      <Checkbox
                        checked={
                          selectedInquiries.length === filteredInquiries.length &&
                          filteredInquiries.length > 0
                        }
                        onCheckedChange={(checked) =>
                          setSelectedInquiries(
                            checked ? filteredInquiries.map((i) => i.id) : []
                          )
                        }
                        className="bg-primary text-white font-bold"
                      />
                    </TableHead>
                    <TableHead className="bg-primary text-white font-bold w-8 p-2">#</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-16 p-2">Source</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-20 p-2">Name</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-24 p-2">Email</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-16 p-2">Phone</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-16 p-2">Location</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-24 p-2">Message</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-16 p-2">Investment Goal</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-16 p-2">Exp.</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-16 p-2">Strategy</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-16 p-2">Init. Invest.</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-16 p-2">Status</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-16 p-2">Received</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-24 p-2">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInquiries.length > 0 ? (
                    filteredInquiries.map((inq, i) => (
                      <TableRow key={inq.id} className="text-xs">
                        <TableCell className="p-2">
                          <Checkbox
                            checked={selectedInquiries.includes(inq.id)}
                            onCheckedChange={() =>
                              setSelectedInquiries((prev) =>
                                prev.includes(inq.id)
                                  ? prev.filter((id) => id !== inq.id)
                                  : [...prev, inq.id]
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium p-2">{i + 1}</TableCell>
                        <TableCell className="p-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                              inq.source === "website"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {inq.source === "website" ? "Web" : "Client"}
                          </span>
                        </TableCell>
                        <TableCell className="p-2 break-words">{inq.name || inq.fullName || "-"}</TableCell>
                        <TableCell className="p-2 break-words">{inq.email || "-"}</TableCell>
                        <TableCell className="p-2 break-words">{inq.phone_number || inq.contactNumber || "-"}</TableCell>
                        <TableCell className="p-2 break-words">{inq.location || "-"}</TableCell>
                        <TableCell className="p-2 break-words">
                          {inq.message || inq.additional_message || "-"}
                        </TableCell>
                        <TableCell className="p-2 break-words">{inq.investment_goal || "-"}</TableCell>
                        <TableCell className="p-2 break-words">{inq.investment_experience || "-"}</TableCell>
                        <TableCell className="p-2 break-words">{inq.preferred_strategy || "-"}</TableCell>
                        <TableCell className="p-2 break-words">{inq.initial_investment_size || "-"}</TableCell>
                        <TableCell className="p-2 break-words">{inq.status || "yet to contact"}</TableCell>
                        <TableCell className="p-2 whitespace-nowrap">
                          {inq.createdAt || inq.submittedAt
                            ? format(
                                parseISO(inq.createdAt || inq.submittedAt),
                                "dd/MM/yyyy"
                              )
                            : "-"}
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="space-y-1">
                            <Select
                              onValueChange={(val) => handleStatusChange(inq.id, val)}
                              defaultValue={inq.status || "yet to contact"}
                            >
                              <SelectTrigger className="w-full text-xs h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Contacted">Contacted</SelectItem>
                                <SelectItem value="Dummy">Dummy</SelectItem>
                                <SelectItem value="yet to contact">
                                  Yet to Contact
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Textarea
                              placeholder="Comments..."
                              value={
                                updateStates[inq.id]?.additionalComments ??
                                inq.additionalComments ??
                                ""
                              }
                              onChange={(e) =>
                                handleCommentsChange(inq.id, e.target.value)
                              }
                              className="text-xs min-h-16 p-1"
                            />
                            <Button
                              size="sm"
                              className="w-full bg-primary text-accent text-xs h-7"
                              onClick={() => handleUpdate(inq.id)}
                            >
                              Update
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan="15" className="text-center py-4 text-gray-500">
                        No inquiries found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Newsletter */}
        <TabsContent value="newsletter">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <Button
              onClick={() => {
                if (!selectedNewsletterEmails.length) {
                  alert("Select at least one email")
                  return
                }
                const { csvContent, filename } = generateCsv(
                  newsletterEmails.filter((i) => selectedNewsletterEmails.includes(i.id)),
                  "newsletter"
                )
                downloadCsv(csvContent, filename)
              }}
            >
              Download Selected ({selectedNewsletterEmails.length})
            </Button>
            <Input
              placeholder="Search emails..."
              value={searchQuery.newsletter}
              onChange={(e) =>
                setSearchQuery((prev) => ({
                  ...prev,
                  newsletter: e.target.value,
                }))
              }
              className="md:flex-1 bg-background"
            />
          </div>

          {loading.newsletter ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin w-6 h-6 text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border bg-background rounded-lg text-sm min-w-full">
                <TableHeader className="bg-primary text-white font-bold">
                  <TableRow className="bg-primary text-white font-bold">
                    <TableHead className="bg-primary text-white font-bold w-8 p-2">
                      <Checkbox
                        checked={
                          selectedNewsletterEmails.length === filteredNewsletterEmails.length &&
                          filteredNewsletterEmails.length > 0
                        }
                        onCheckedChange={(checked) =>
                          setSelectedNewsletterEmails(
                            checked ? filteredNewsletterEmails.map((i) => i.id) : []
                          )
                        }
                        className="bg-primary text-white font-bold"
                      />
                    </TableHead>
                    <TableHead className="bg-primary text-white font-bold w-8 p-2">#</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-64 p-2">Email</TableHead>
                    <TableHead className="bg-primary text-white font-bold w-32 p-2">Subscribed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNewsletterEmails.length > 0 ? (
                    filteredNewsletterEmails.map((email, i) => (
                      <TableRow key={email.id} className="text-xs">
                        <TableCell className="p-2">
                          <Checkbox
                            checked={selectedNewsletterEmails.includes(email.id)}
                            onCheckedChange={() =>
                              setSelectedNewsletterEmails((prev) =>
                                prev.includes(email.id)
                                  ? prev.filter((id) => id !== email.id)
                                  : [...prev, email.id]
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium p-2">{i + 1}</TableCell>
                        <TableCell className="p-2 break-words">{email.email}</TableCell>
                        <TableCell className="p-2 whitespace-nowrap">
                          {email.createdAt
                            ? format(parseISO(email.createdAt), "dd/MM/yyyy")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan="4" className="text-center py-4 text-gray-500">
                        No newsletter emails found
                      </TableCell>
                    </TableRow>
                  )}
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