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
  ChevronRight,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Calendar,
  BarChart2,
  Copy,
  CheckCircle,
} from "lucide-react";

export default function MailchimpCampaignsDebug() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [debugLog, setDebugLog] = useState([]);
  const [copied, setCopied] = useState(false);

  const addDebugLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      timestamp,
      message,
      data,
    };
    setDebugLog((prev) => [logEntry, ...prev].slice(0, 50)); // Keep last 50 logs
    console.log(`[${timestamp}] ${message}`, data);
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setRefreshing(true);
    addDebugLog("🔄 Fetching campaigns list...");
    try {
      const res = await fetch("/api/newsletter-analytics");
      addDebugLog("📡 API Response received", { status: res.status });
      
      if (!res.ok) throw new Error(`Failed to fetch campaigns: ${res.status}`);
      
      const data = await res.json();
      addDebugLog("✅ Campaigns parsed", {
        count: data.campaigns?.length,
        requestTime: data.requestTime,
        firstCampaignAnalytics: data.campaigns?.[0]?.analytics,
      });
      
      setCampaigns(data.campaigns || []);
    } catch (error) {
      addDebugLog("❌ Error fetching campaigns", { error: error.message });
      console.error("Error fetching campaigns:", error);
    }
    setRefreshing(false);
    setLoading(false);
  };

  const fetchCampaignDetail = async (campaignId, campaignTitle) => {
    try {
      addDebugLog(`🔄 Fetching detail for campaign: ${campaignTitle}`);
      addDebugLog(`📋 Campaign ID: ${campaignId}`);
      
      const url = `/api/newsletter-analytics?id=${campaignId}`;
      addDebugLog(`🌐 Request URL: ${url}`);
      
      const res = await fetch(url);
      addDebugLog(`📡 API Response Status: ${res.status}`);
      
      if (!res.ok) {
        const errorText = await res.text();
        addDebugLog("❌ API Error Response", { status: res.status, body: errorText });
        throw new Error(`Failed to fetch campaign details: ${res.status}`);
      }

      const data = await res.json();
      
      addDebugLog("✅ Campaign detail parsed", {
        hasAnalytics: !!data.analytics,
        analyticsKeys: data.analytics ? Object.keys(data.analytics) : [],
        requestTime: data.requestTime,
      });

      addDebugLog("📊 Analytics Structure:", data.analytics);
      
      // Check each field individually
      if (data.analytics) {
        addDebugLog("🔍 Detailed Field Check:", {
          emails_sent: data.analytics.emails_sent,
          opens_exists: !!data.analytics.opens,
          opens_count: data.analytics.opens?.open_count,
          opens_rate: data.analytics.opens?.open_rate,
          clicks_exists: !!data.analytics.clicks,
          clicks_count: data.analytics.clicks?.click_count,
          clicks_rate: data.analytics.clicks?.click_rate,
          bounces_exists: !!data.analytics.bounces,
          bounces_permanent: data.analytics.bounces?.permanent_bounce,
          bounces_transient: data.analytics.bounces?.transient_bounce,
        });
      }

      setSelectedCampaign(data);
      setView("detail");
    } catch (error) {
      addDebugLog("❌ Error fetching campaign details", { error: error.message });
      console.error("Error fetching campaign details:", error);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const title = (campaign.settings?.title || "").toLowerCase();
    const subjectLine = (campaign.settings?.subject_line || "").toLowerCase();
    const matchesSearch = title.includes(lowerSearchTerm) || subjectLine.includes(lowerSearchTerm);

    if (filterStatus === "all") return matchesSearch;
    return matchesSearch && campaign.status === filterStatus;
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const MetricCard = ({ icon: Icon, label, value, unit = "" }) => (
    <div
      className="p-5 rounded-lg border-2 flex items-start gap-4"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--card)",
      }}
    >
      <div
        className="p-3 rounded-lg flex-shrink-0"
        style={{ backgroundColor: "rgba(129, 177, 123, 0.1)" }}
      >
        <Icon className="w-6 h-6" style={{ color: "#81b17b" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm opacity-75 mb-1">{label}</p>
        <p className="text-3xl font-bold">
          {typeof value === "number" ? value.toLocaleString() : value === null ? "N/A" : value}
          {unit && <span className="text-lg ml-2">{unit}</span>}
        </p>
      </div>
    </div>
  );

  const StatusBadge = ({ status }) => {
    const statusColors = {
      sent: "bg-green-100 text-green-800 border-green-300",
      schedule: "bg-blue-100 text-blue-800 border-blue-300",
      draft: "bg-gray-100 text-gray-800 border-gray-300",
      paused: "bg-yellow-100 text-yellow-800 border-yellow-300",
      canceled: "bg-red-100 text-red-800 border-red-300",
      completed: "bg-green-100 text-green-800 border-green-300",
    };

    return (
      <span className={`px-3 py-1 text-xs rounded-full font-medium border ${statusColors[status] || statusColors.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Debug Console Component
  const DebugConsole = () => (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        right: 0,
        width: "400px",
        maxHeight: "50vh",
        backgroundColor: "#1a1a1a",
        color: "#00ff00",
        borderLeft: "2px solid #81b17b",
        borderTop: "2px solid #81b17b",
        fontFamily: "monospace",
        fontSize: "11px",
        overflowY: "auto",
        padding: "12px",
        zIndex: 9999,
      }}
    >
      <div style={{ marginBottom: "8px", fontWeight: "bold", color: "#81b17b" }}>
        📋 Debug Console (Last 50 logs)
      </div>
      {debugLog.map((log, idx) => (
        <div key={idx} style={{ marginBottom: "6px", borderBottom: "1px solid #333", paddingBottom: "4px" }}>
          <div style={{ color: "#81b17b" }}>{log.timestamp} — {log.message}</div>
          {log.data && (
            <div style={{ color: "#888", marginTop: "2px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {JSON.stringify(log.data, null, 2).substring(0, 200)}
              {JSON.stringify(log.data, null, 2).length > 200 && "..."}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div style={{ backgroundColor: "var(--background)", color: "var(--foreground)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading campaigns...</span>
        </div>
        <DebugConsole />
      </div>
    );
  }

  // Detail View
  if (view === "detail" && selectedCampaign) {
    const { campaign, analytics } = selectedCampaign;

    // Extract all values with debugging
    const emailsSent = analytics?.emails_sent ?? 0;
    const openCount = analytics?.opens?.open_count ?? 0;
    const openRate = ((analytics?.opens?.open_rate ?? 0) * 100) || 0;
    const clickCount = analytics?.clicks?.click_count ?? 0;
    const clickRate = ((analytics?.clicks?.click_rate ?? 0) * 100) || 0;
    const bounceTotal = (analytics?.bounces?.permanent_bounce ?? 0) + (analytics?.bounces?.transient_bounce ?? 0);

    const sentDate = campaign.send_time ? new Date(campaign.send_time).toLocaleDateString() : "N/A";

    return (
      <div style={{ backgroundColor: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 30 }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
            <button
              onClick={() => {
                setView("list");
                setSelectedCampaign(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                padding: "8px 16px",
                borderRadius: "8px",
                backgroundColor: "var(--secondary)",
                color: "var(--foreground)",
                border: "none",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.opacity = "0.8")}
              onMouseLeave={(e) => (e.target.style.opacity = "1")}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Campaigns
            </button>
            <div>
              <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>{campaign.settings.title}</h1>
              <p style={{ fontSize: "18px", opacity: 0.75 }}>{campaign.settings.subject_line}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "16px" }}>
                <StatusBadge status={campaign.status} />
                <span style={{ fontSize: "14px", opacity: 0.75, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Calendar className="w-4 h-4" />
                  Sent: {sentDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
          {/* Analytics Display */}
          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px" }}>Campaign Analytics</h2>
            
            {/* Raw Analytics Display */}
            <div style={{
              padding: "16px",
              backgroundColor: "rgba(129, 177, 123, 0.05)",
              borderRadius: "8px",
              marginBottom: "24px",
              borderLeft: "4px solid #81b17b",
            }}>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#81b17b", marginBottom: "12px" }}>
                📊 RAW ANALYTICS OBJECT:
              </div>
              <div style={{
                backgroundColor: "#000",
                padding: "12px",
                borderRadius: "4px",
                color: "#0f0",
                fontFamily: "monospace",
                fontSize: "11px",
                maxHeight: "300px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}>
                {JSON.stringify(analytics, null, 2)}
              </div>
              <button
                onClick={() => copyToClipboard(JSON.stringify(analytics, null, 2))}
                style={{
                  marginTop: "8px",
                  padding: "6px 12px",
                  backgroundColor: "#81b17b",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy JSON"}
              </button>
            </div>

            {/* Metric Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
              <MetricCard icon={Send} label="Emails Sent" value={emailsSent} />
              <MetricCard icon={Eye} label="Total Opens" value={openCount} />
              <MetricCard icon={Eye} label="Open Rate" value={openRate.toFixed(1)} unit="%" />
              <MetricCard icon={MousePointerClick} label="Total Clicks" value={clickCount} />
              <MetricCard icon={MousePointerClick} label="Click Rate" value={clickRate.toFixed(1)} unit="%" />
              <MetricCard icon={AlertCircle} label="Total Bounces" value={bounceTotal} />
            </div>
          </div>

          {/* Value Check Table */}
          <div style={{
            marginBottom: "32px",
            borderRadius: "8px",
            border: "2px solid var(--border)",
            overflow: "hidden",
            backgroundColor: "var(--card)",
          }}>
            <div style={{
              padding: "16px",
              borderBottom: "1px solid var(--border)",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <CheckCircle className="w-5 h-5" style={{ color: "#81b17b" }} />
              Value Check
            </div>
            <table style={{ width: "100%" }}>
              <thead style={{
                backgroundColor: "rgba(129, 177, 123, 0.1)",
                borderBottom: "2px solid var(--border)",
              }}>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px", color: "#81b17b", fontWeight: "bold" }}>Field</th>
                  <th style={{ textAlign: "left", padding: "12px", color: "#81b17b", fontWeight: "bold" }}>Value</th>
                  <th style={{ textAlign: "left", padding: "12px", color: "#81b17b", fontWeight: "bold" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { field: "emails_sent", value: emailsSent, path: "analytics.emails_sent" },
                  { field: "opens.open_count", value: openCount, path: "analytics.opens.open_count" },
                  { field: "opens.open_rate", value: analytics?.opens?.open_rate, path: "analytics.opens.open_rate" },
                  { field: "clicks.click_count", value: clickCount, path: "analytics.clicks.click_count" },
                  { field: "clicks.click_rate", value: analytics?.clicks?.click_rate, path: "analytics.clicks.click_rate" },
                  { field: "bounces.permanent_bounce", value: analytics?.bounces?.permanent_bounce, path: "analytics.bounces.permanent_bounce" },
                  { field: "bounces.transient_bounce", value: analytics?.bounces?.transient_bounce, path: "analytics.bounces.transient_bounce" },
                ].map((row, idx) => (
                  <tr key={idx} style={{
                    borderBottom: idx < 6 ? "1px solid var(--border)" : "none",
                    backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(129, 177, 123, 0.02)",
                  }}>
                    <td style={{ padding: "12px", fontSize: "12px", fontFamily: "monospace" }}>{row.path}</td>
                    <td style={{ padding: "12px", fontWeight: "bold" }}>
                      {row.value === null ? "null" : row.value === undefined ? "undefined" : row.value}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        backgroundColor: row.value === null || row.value === undefined ? "#ff4444" : row.value === 0 ? "#ffaa00" : "#44ff44",
                        color: "white",
                      }}>
                        {row.value === null || row.value === undefined ? "Missing" : row.value === 0 ? "Zero" : "Has Data"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DebugConsole />
      </div>
    );
  }

  // List View
  return (
    <div style={{ backgroundColor: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
            <div>
              <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>Email Campaigns</h1>
              <p style={{ fontSize: "18px", opacity: 0.75 }}>Track and manage all Mailchimp newsletters</p>
            </div>
            <button
              onClick={fetchCampaigns}
              disabled={refreshing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "8px",
                fontWeight: "500",
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                border: "none",
                cursor: refreshing ? "not-allowed" : "pointer",
                opacity: refreshing ? 0.5 : 1,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => !refreshing && (e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)")}
              onMouseLeave={(e) => (e.target.style.boxShadow = "none")}
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Updating..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <div style={{
            padding: "16px",
            borderRadius: "8px",
            border: "2px solid var(--border)",
            backgroundColor: "var(--card)",
          }}>
            <p style={{ fontSize: "14px", opacity: 0.75, marginBottom: "8px" }}>Total Campaigns</p>
            <p style={{ fontSize: "32px", fontWeight: "bold" }}>{campaigns.length}</p>
          </div>
          <div style={{
            padding: "16px",
            borderRadius: "8px",
            border: "2px solid var(--border)",
            backgroundColor: "var(--card)",
          }}>
            <p style={{ fontSize: "14px", opacity: 0.75, marginBottom: "8px" }}>Sent</p>
            <p style={{ fontSize: "32px", fontWeight: "bold" }}>{campaigns.filter((c) => c.status === "sent").length}</p>
          </div>
          <div style={{
            padding: "16px",
            borderRadius: "8px",
            border: "2px solid var(--border)",
            backgroundColor: "var(--card)",
          }}>
            <p style={{ fontSize: "14px", opacity: 0.75, marginBottom: "8px" }}>Drafts</p>
            <p style={{ fontSize: "32px", fontWeight: "bold" }}>{campaigns.filter((c) => c.status === "draft").length}</p>
          </div>
        </div>

        {/* Campaigns List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredCampaigns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", opacity: 0.5 }}>
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p style={{ fontSize: "18px", marginBottom: "8px" }}>No campaigns found</p>
              <p style={{ fontSize: "14px" }}>
                {campaigns.length === 0
                  ? "No campaigns in your Mailchimp account"
                  : "Try adjusting your search or filters"}
              </p>
            </div>
          ) : (
            filteredCampaigns.map((campaign, idx) => {
              const analytics = campaign.analytics;
              const sentDate = campaign.send_time ? new Date(campaign.send_time).toLocaleDateString() : "N/A";

              return (
                <button
                  key={idx}
                  onClick={() => fetchCampaignDetail(campaign.id, campaign.settings.title)}
                  style={{
                    textAlign: "left",
                    padding: "20px",
                    borderRadius: "8px",
                    border: "2px solid var(--border)",
                    backgroundColor: "var(--card)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                    e.currentTarget.style.borderColor = "var(--primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                        <Mail className="w-5 h-5" style={{ color: "#81b17b", flexShrink: 0 }} />
                        <h3 style={{ fontWeight: "bold", fontSize: "18px" }}>{campaign.settings.title}</h3>
                      </div>
                      <p style={{ fontSize: "14px", opacity: 0.75, marginBottom: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {campaign.settings.subject_line}
                      </p>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                        <StatusBadge status={campaign.status} />
                        <span style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          borderRadius: "16px",
                          backgroundColor: "var(--secondary)",
                          color: "var(--foreground)",
                        }}>
                          Sent: {sentDate}
                        </span>
                        {analytics && (
                          <>
                            <span style={{
                              padding: "6px 10px",
                              fontSize: "12px",
                              borderRadius: "16px",
                              backgroundColor: "rgba(129, 177, 123, 0.1)",
                              color: "#81b17b",
                            }}>
                              Opens: {((analytics.opens?.open_rate ?? 0) * 100).toFixed(1)}%
                            </span>
                            <span style={{
                              padding: "6px 10px",
                              fontSize: "12px",
                              borderRadius: "16px",
                              backgroundColor: "rgba(78, 142, 117, 0.1)",
                              color: "#4e8e75",
                            }}>
                              Clicks: {((analytics.clicks?.click_rate ?? 0) * 100).toFixed(1)}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <ChevronRight className="w-5 h-5" style={{ opacity: 0.3 }} />
                    </div>
                  </div>

                  {/* Analytics Preview */}
                  {analytics && (
                    <div style={{
                      marginTop: "16px",
                      paddingTop: "16px",
                      borderTop: "1px solid var(--border)",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                      gap: "12px",
                    }}>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "12px", opacity: 0.6, marginBottom: "4px" }}>Sent</p>
                        <p style={{ fontWeight: "bold" }}>{(analytics.emails_sent ?? 0).toLocaleString()}</p>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "12px", opacity: 0.6, marginBottom: "4px" }}>Opens</p>
                        <p style={{ fontWeight: "bold" }}>{(analytics.opens?.open_count ?? 0).toLocaleString()}</p>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "12px", opacity: 0.6, marginBottom: "4px" }}>Clicks</p>
                        <p style={{ fontWeight: "bold" }}>{(analytics.clicks?.click_count ?? 0).toLocaleString()}</p>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "12px", opacity: 0.6, marginBottom: "4px" }}>Bounces</p>
                        <p style={{ fontWeight: "bold" }}>
                          {(
                            (analytics.bounces?.permanent_bounce ?? 0) +
                            (analytics.bounces?.transient_bounce ?? 0)
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <DebugConsole />
    </div>
  );
}