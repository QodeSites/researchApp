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
    type === "inquiries"
      ? [
          "S.No",
          "Name",
          "Email",
          "Phone Number",
          "Received Date",
          "Updated Date",
          "Status",
          "Enquiry",
          "Additional Comments",
        ]
      : ["S.No", "Email", "Subscribed At"]

  const rows = data.map((item, index) => {
    if (type === "inquiries") {
      return [
        index + 1,
        `"${item.name?.replace(/"/g, '""')}"`,
        item.email,
        item.phone_number,
        item.createdAt
          ? format(parseISO(item.createdAt), "MM/dd/yyyy, HH:mm:ss")
          : "Invalid Date",
        item.updatedAt
          ? format(parseISO(item.updatedAt), "MM/dd/yyyy, HH:mm:ss")
          : "Not updated",
        item.status || "yet to contact",
        `"${(item.additional_message || "").replace(/"/g, '""')}"`,
        `"${(item.additionalComments || "").replace(/"/g, '""')}"`,
      ].join(",")
    } else {
      return [
        index + 1,
        item.email,
        item.createdAt
          ? format(parseISO(item.createdAt), "MM/dd/yyyy, HH:mm:ss")
          : "Invalid Date",
      ].join(",")
    }
  })

  const filename = `${type}_${new Date()
    .toISOString()
    .split("T")[0]}.csv`

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
  const [inquiries, setInquiries] = useState([])
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

  // --- Fetch Data ---
  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        setLoading((prev) => ({ ...prev, inquiries: true }))
        const response = await fetch("/api/websiteEnquiries")
        const data = await response.json()
        if (data.success) setInquiries(data.data)
        else throw new Error(data.message || "Failed to fetch inquiries")
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
        if (data.success) setNewsletterEmails(data.data)
        else throw new Error(data.message || "Failed to fetch newsletter emails")
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
        setInquiries((prev) =>
          prev.map((inq) =>
            inq.id === id ? { ...inq, status, additionalComments } : inq
          )
        )
      }
    } catch (error) {
      alert("Error updating inquiry")
    }
  }

  const filteredInquiries = inquiries.filter(
    (inq) =>
      inq.name?.toLowerCase().includes(searchQuery.inquiries.toLowerCase()) ||
      inq.email?.toLowerCase().includes(searchQuery.inquiries.toLowerCase())
  )
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
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <Button
              onClick={() => {
                if (!selectedInquiries.length) {
                  alert("Select at least one inquiry")
                  return
                }
                const { csvContent, filename } = generateCsv(
                  inquiries.filter((i) => selectedInquiries.includes(i.id)),
                  "inquiries"
                )
                downloadCsv(csvContent, filename)
              }}
            >
              Download Selected ({selectedInquiries.length})
            </Button>
            <Input
              placeholder="Search inquiries..."
              value={searchQuery.inquiries}
              onChange={(e) =>
                setSearchQuery((prev) => ({
                  ...prev,
                  inquiries: e.target.value,
                }))
              }
              className="md:w-72 bg-background"
            />
          </div>

          {loading.inquiries ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin w-6 h-6 text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border bg-background rounded-lg">
                <TableHeader className="bg-primary text-white font-bold">
                  <TableRow className="bg-primary text-white font-bold">
                    <TableHead className="bg-primary text-white font-bold">
                      <Checkbox
                        checked={
                          selectedInquiries.length ===
                            filteredInquiries.length &&
                          filteredInquiries.length > 0
                        }
                        onCheckedChange={(checked) =>
                          setSelectedInquiries(
                            checked
                              ? filteredInquiries.map((i) => i.id)
                              : []
                          )
                        }
                        className="bg-primary text-white font-bold"
                      />
                    </TableHead>
                    <TableHead className="bg-primary text-white font-bold">#</TableHead>
                    <TableHead className="bg-primary text-white font-bold">Name</TableHead>
                    <TableHead className="bg-primary text-white font-bold">Email</TableHead>
                    <TableHead className="bg-primary text-white font-bold">Phone</TableHead>
                    <TableHead className="bg-primary text-white font-bold">Received</TableHead>
                    <TableHead className="bg-primary text-white font-bold">Status</TableHead>
                    <TableHead className="bg-primary text-white font-bold">Update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInquiries.map((inq, i) => (
                    <TableRow key={inq.id}>
                      <TableCell>
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
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{inq.name}</TableCell>
                      <TableCell>{inq.email}</TableCell>
                      <TableCell>{inq.phone_number}</TableCell>
                      <TableCell>
                        {inq.createdAt
                          ? format(parseISO(inq.createdAt), "MM/dd/yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>{inq.status || "yet to contact"}</TableCell>
                      <TableCell>
                        <Select
                          onValueChange={(val) =>
                            handleStatusChange(inq.id, val)
                          }
                          defaultValue={inq.status || "yet to contact"}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Contacted">
                              Contacted
                            </SelectItem>
                            <SelectItem value="dummy">Dummy</SelectItem>
                            <SelectItem value="yet to contact">
                              Yet to Contact
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Textarea
                          placeholder="Add comments..."
                          value={
                            updateStates[inq.id]?.additionalComments ??
                            inq.additionalComments ??
                            ""
                          }
                          onChange={(e) =>
                            handleCommentsChange(inq.id, e.target.value)
                          }
                          className="mt-2"
                        />
                        <Button
                          size="sm"
                          className="mt-2 bg-primary text-accent"
                          onClick={() => handleUpdate(inq.id)}
                        >
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
                  newsletterEmails.filter((i) =>
                    selectedNewsletterEmails.includes(i.id)
                  ),
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
              className="md:w-72 bg-background"
            />
          </div>

          {loading.newsletter ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin w-6 h-6 text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border bg-background rounded-lg">
                <TableHeader className="bg-primary text-white font-bold">
                  <TableRow className="bg-primary text-white font-bold">
                    <TableHead className="bg-primary text-white font-bold">
                      <Checkbox
                        checked={
                          selectedNewsletterEmails.length ===
                            filteredNewsletterEmails.length &&
                          filteredNewsletterEmails.length > 0
                        }
                        onCheckedChange={(checked) =>
                          setSelectedNewsletterEmails(
                            checked
                              ? filteredNewsletterEmails.map((i) => i.id)
                              : []
                          )
                        }
                        className="bg-primary text-white font-bold"
                      />
                    </TableHead>
                    <TableHead className="bg-primary text-white font-bold">#</TableHead>
                    <TableHead className="bg-primary text-white font-bold">Email</TableHead>
                    <TableHead className="bg-primary text-white font-bold">Subscribed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNewsletterEmails.map((email, i) => (
                    <TableRow key={email.id}>
                      <TableCell>
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
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{email.email}</TableCell>
                      <TableCell>
                        {email.createdAt
                          ? format(parseISO(email.createdAt), "MM/dd/yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>
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
