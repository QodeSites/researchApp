"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Users,
  Eye,
  MousePointerClick,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

export default function CampaignRecipientAnalytics({ campaignId, campaignName }) {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchDetailedAnalytics();
  }, [campaignId]);

  const fetchDetailedAnalytics = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/newsletter-analytics?id=${campaignId}&detailed=true`);
      if (!res.ok) throw new Error("Failed to fetch detailed analytics");
      const data = await res.json();
      
      // Validate recipients data
      const validRecipients = Array.isArray(data.recipients) ? data.recipients : [];
      
      // Filter out any invalid recipient objects
      const cleanRecipients = validRecipients.filter(r => r && r.email);
      
      setRecipients(cleanRecipients);
      setSummary({
        total: data.total_recipients || cleanRecipients.length,
        opened: data.opened || 0,
        unopened: data.unopened || 0,
        bounced: data.bounced || 0,
        clicked: data.clicked || 0,
        unsubscribed: data.unsubscribed || 0,
        spammed: data.spammed || 0,
      });
    } catch (error) {
      console.error("Error fetching detailed analytics:", error);
      setError(error.message);
    }
    setRefreshing(false);
    setLoading(false);
  };

  const filteredRecipients = recipients.filter((recipient) => {
    // Safely handle undefined or null email
    const email = recipient?.email || "";
    const matchesSearch = email.toLowerCase().includes((searchTerm || "").toLowerCase());
    
    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "opened") return matchesSearch && recipient.opened;
    if (filterStatus === "unopened") return matchesSearch && !recipient.opened && !recipient.bounced;
    if (filterStatus === "clicked") return matchesSearch && recipient.clicked;
    if (filterStatus === "bounced") return matchesSearch && recipient.bounced;
    if (filterStatus === "unsubscribed") return matchesSearch && recipient.unsubscribed;
    
    return matchesSearch;
  });

  const downloadCSV = () => {
    const headers = ["Email", "Status", "Opens", "Clicks", "First Open", "First Click"];
    const rows = filteredRecipients.map(r => {
      let status = "Unknown";
      if (r.bounced) status = "Bounced";
      else if (r.unsubscribed) status = "Unsubscribed";
      else if (r.spammed) status = "Spammed";
      else if (r.opened) status = "Opened";
      else status = "Unopened";

      return [
        r.email || "",
        status,
        r.opens_count || 0,
        r.clicks_count || 0,
        r.first_open ? new Date(r.first_open).toLocaleString() : "N/A",
        r.first_click ? new Date(r.first_click).toLocaleString() : "N/A",
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaignName || "campaign"}-recipients.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const StatCard = ({ label, value, icon: Icon, color = "#81b17b" }) => (
    <div
      className="p-4 rounded-lg border-2 flex items-start gap-3"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--card)",
      }}
    >
      <div
        className="p-2 rounded-lg flex-shrink-0"
        style={{ backgroundColor: `rgba(129, 177, 123, 0.1)` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs opacity-75 mb-0.5">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" style={{ color: "#81b17b" }} />
        <span>Loading recipient data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg border-2" style={{ borderColor: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
        <p className="text-red-600 font-semibold">Error loading recipient data:</p>
        <p className="text-sm opacity-75 mt-2">{error}</p>
        <button
          onClick={fetchDetailedAnalytics}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (recipients.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium opacity-75">No recipient data available</p>
        <p className="text-sm opacity-50 mt-2">Campaign may still be processing</p>
        <button
          onClick={fetchDetailedAnalytics}
          disabled={refreshing}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {refreshing ? "Loading..." : "Refresh"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div>
        <h3 className="text-lg font-bold mb-3">Recipient Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
          <StatCard label="Total" value={summary?.total || 0} icon={Users} />
          <StatCard label="Opened" value={summary?.opened || 0} icon={Eye} color="#81b17b" />
          <StatCard label="Unopened" value={summary?.unopened || 0} icon={XCircle} color="#ef4444" />
          <StatCard label="Clicked" value={summary?.clicked || 0} icon={MousePointerClick} color="#3b82f6" />
          <StatCard label="Bounced" value={summary?.bounced || 0} icon={AlertTriangle} color="#f97316" />
          <StatCard label="Unsubscribed" value={summary?.unsubscribed || 0} icon={AlertCircle} color="#a855f7" />
          <StatCard label="Spammed" value={summary?.spammed || 0} icon={AlertTriangle} color="#dc2626" />
        </div>
      </div>

      {/* Filters and Search */}
      <div>
        <h3 className="text-lg font-bold mb-3">Recipient List</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 opacity-50" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border-2 outline-none text-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border-2 outline-none text-sm"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
            }}
          >
            <option value="all">All Recipients ({recipients.length})</option>
            <option value="opened">Opened ({recipients.filter(r => r.opened).length})</option>
            <option value="unopened">Unopened ({recipients.filter(r => !r.opened && !r.bounced).length})</option>
            <option value="clicked">Clicked ({recipients.filter(r => r.clicked).length})</option>
            <option value="bounced">Bounced ({recipients.filter(r => r.bounced).length})</option>
            <option value="unsubscribed">Unsubscribed ({recipients.filter(r => r.unsubscribed).length})</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={fetchDetailedAnalytics}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition hover:opacity-80"
            style={{
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Recipients Table */}
      <div
        className="rounded-lg border-2 overflow-hidden"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--card)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead
              style={{
                backgroundColor: "rgba(129, 177, 123, 0.1)",
                borderBottom: "2px solid var(--border)",
              }}
            >
              <tr>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "#81b17b" }}>
                  Email
                </th>
                <th className="px-4 py-3 text-center font-semibold" style={{ color: "#81b17b" }}>
                  Status
                </th>
                <th className="px-4 py-3 text-center font-semibold" style={{ color: "#81b17b" }}>
                  Opens
                </th>
                <th className="px-4 py-3 text-center font-semibold" style={{ color: "#81b17b" }}>
                  Clicks
                </th>
                <th className="px-4 py-3 text-center font-semibold" style={{ color: "#81b17b" }}>
                  First Open
                </th>
                <th className="px-4 py-3 text-center font-semibold" style={{ color: "#81b17b" }}>
                  First Click
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecipients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center opacity-50">
                    No recipients found
                  </td>
                </tr>
              ) : (
                filteredRecipients.map((recipient, idx) => {
                  // Safely determine status
                  let statusColor = "#81b17b";
                  let statusText = "Unopened";
                  let statusIcon = XCircle;

                  if (recipient.bounced) {
                    statusColor = "#f97316";
                    statusText = "Bounced";
                    statusIcon = AlertTriangle;
                  } else if (recipient.unsubscribed) {
                    statusColor = "#a855f7";
                    statusText = "Unsubscribed";
                    statusIcon = AlertCircle;
                  } else if (recipient.spammed) {
                    statusColor = "#dc2626";
                    statusText = "Spammed";
                    statusIcon = AlertTriangle;
                  } else if (recipient.opened) {
                    statusColor = "#81b17b";
                    statusText = "Opened";
                    statusIcon = CheckCircle;
                  }

                  const StatusIcon = statusIcon;
                  const email = recipient.email || "Unknown";

                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: idx < filteredRecipients.length - 1 ? "1px solid var(--border)" : "none",
                        backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(129, 177, 123, 0.02)",
                      }}
                    >
                      <td className="px-4 py-3">
                        <span title={email} className="text-xs md:text-sm truncate block">
                          {email}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <StatusIcon className="w-4 h-4" style={{ color: statusColor }} />
                          <span className="text-xs font-medium" style={{ color: statusColor }}>
                            {statusText}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold">{recipient.opens_count || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold">{recipient.clicks_count || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {recipient.first_open
                          ? new Date(recipient.first_open).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {recipient.first_click
                          ? new Date(recipient.first_click).toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Info */}
      <div className="text-sm opacity-75">
        Showing <span className="font-bold">{filteredRecipients.length}</span> of{" "}
        <span className="font-bold">{recipients.length}</span> recipients
      </div>
    </div>
  );
}