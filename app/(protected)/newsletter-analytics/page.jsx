"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Eye,
  MousePointerClick,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Users,
  EyeOff,
  XCircle,
  Search,
  ChevronLeft,
  ChevronsRight,
  Info,
} from "lucide-react";

export default function MailchimpCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [fullFetch, setFullFetch] = useState(false);
  const [view, setView] = useState("list");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [recipientSearch, setRecipientSearch] = useState("");

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (view === "detail" && selectedCampaign && recipientFilter === "all" && fullFetch) {
      setFullFetch(false);
      setCurrentPage(1);
      fetchRecipients(selectedCampaign.campaign.id, 1);
    }
  }, [recipientFilter, fullFetch, selectedCampaign, view]);

  useEffect(() => {
    if (view === "detail" && selectedCampaign && recipientFilter !== "all") {
      const expectedCount = (() => {
        switch (recipientFilter) {
          case "clicked":
            return recipientStats.clicked;
          case "opened":
            return recipientStats.opened;
          case "bounced":
            return recipientStats.bounced;
          case "not_opened":
            return recipientStats.not_opened;
          default:
            return totalRecipients;
        }
      })();

      if (expectedCount > 0 && expectedCount <= 500) {
        fetchFilteredRecipients(selectedCampaign.campaign.id, recipientFilter);
      } else {
        setFullFetch(false);
        setCurrentPage(1);
        fetchRecipients(selectedCampaign.campaign.id, 1);
      }
    }
  }, [recipientFilter, selectedCampaign, view, totalRecipients]);

  const fetchCampaigns = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/newsletter-analytics");
      if (!res.ok) throw new Error(`Failed to fetch campaigns: ${res.status}`);

      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
    setRefreshing(false);
    setLoading(false);
  };

  const fetchCampaignDetail = async (campaignId) => {
    try {
      const res = await fetch(`/api/newsletter-analytics?id=${campaignId}`);
      if (!res.ok) throw new Error(`Failed to fetch campaign details: ${res.status}`);

      const data = await res.json();
      setSelectedCampaign(data);
      setView("detail");
      setFullFetch(false);

      // Reset pagination and fetch first page of recipients
      setCurrentPage(1);
      setRecipientFilter("all");
      setRecipientSearch("");
      fetchRecipients(campaignId, 1);
    } catch (error) {
      console.error("Error fetching campaign details:", error);
    }
  };

  const fetchRecipients = async (campaignId, page = 1) => {
    setLoadingRecipients(true);
    setCurrentPage(page);
    try {
      const offset = (page - 1) * pageSize;
      const res = await fetch(`/api/newsletter-analytics/recipients?id=${campaignId}&offset=${offset}&count=${pageSize}`);
      if (!res.ok) throw new Error(`Failed to fetch recipients: ${res.status}`);

      const data = await res.json();
      setRecipients(data.recipients || []);
      setTotalRecipients(data.total || 0);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      setRecipients([]);
      setTotalRecipients(0);
    }
    setLoadingRecipients(false);
  };

  const fetchFilteredRecipients = async (campaignId, filter) => {
    setLoadingRecipients(true);
    try {
      const res = await fetch(`/api/newsletter-analytics/recipients?id=${campaignId}&full=true&filter=${filter}`);
      if (!res.ok) throw new Error(`Failed to fetch filtered recipients: ${res.status}`);

      const data = await res.json();
      setRecipients(data.recipients || []);
      setTotalRecipients(data.total || 0);
      setCurrentPage(1);
      setFullFetch(true);
    } catch (error) {
      console.error("Error fetching filtered recipients:", error);
      setRecipients([]);
      setTotalRecipients(0);
      setFullFetch(false);
    }
    setLoadingRecipients(false);
  };

  const getRecipientStatus = (recipient) => {
    // Mailchimp uses different status formats: 'hard-bounce', 'soft-bounce', 'hardbounce', 'softbounce'
    const status = (recipient.status || '').toLowerCase().replace(/-/g, '').replace(/_/g, '');
    const bounceStatuses = ['bounced', 'dropped', 'cleaned', 'hardbounce', 'softbounce', 'bounce'];

    if (bounceStatuses.some(bounceStatus => status.includes(bounceStatus))) {
      return "bounced";
    }

    if (recipient.activity?.length > 0) {
      const hasClick = recipient.activity.some(a => a.action === "click");
      const hasOpen = recipient.activity.some(a => a.action === "open");

      if (hasClick) return "clicked";
      if (hasOpen) return "opened";
    }

    return "not_opened";
  };

  const filteredRecipients = recipients.filter((recipient) => {
    const searchLower = recipientSearch.toLowerCase();
    const email = (recipient.email_address || "").toLowerCase();
    const matchesSearch = email.includes(searchLower);

    if (recipientFilter === "all") return matchesSearch;

    const status = getRecipientStatus(recipient);
    return matchesSearch && status === recipientFilter;
  });

  const getStartEnd = () => {
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalRecipients);
    return { start, end };
  };

  const { start, end } = getStartEnd();
  const totalPages = Math.ceil(totalRecipients / pageSize);

  const recipientStats = (() => {
    if (!selectedCampaign?.analytics) return { total: 0, opened: 0, clicked: 0, not_opened: 0, bounced: 0 };
    const { emails_sent = 0, opens = {}, clicks = {}, bounces = {} } = selectedCampaign.analytics;
    const openCount = opens.unique_opens || 0;
    const clickCount = clicks.unique_subscriber_clicks || 0;
    const bounceTotal = (bounces.hard_bounces || 0) + (bounces.soft_bounces || 0);
    const delivered = emails_sent - bounceTotal;
    const totalOpened = openCount;
    const openedNoClick = totalOpened - clickCount;
    const notOpened = delivered - totalOpened;
    return {
      total: emails_sent,
      opened: openedNoClick,
      clicked: clickCount,
      not_opened: notOpened,
      bounced: bounceTotal,
    };
  })();

  const Tooltip = ({ children, text }) => {
    const [show, setShow] = useState(false);

    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <div
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          style={{ cursor: "help" }}
        >
          {children}
        </div>
        {show && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "#1f2937",
              color: "white",
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              whiteSpace: "nowrap",
              maxWidth: "300px",
              whiteSpace: "normal",
              zIndex: 1000,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            {text}
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "6px solid #1f2937",
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const MetricCard = ({ icon: Icon, label, value, unit = "", description }) => (
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
          <p className="text-sm opacity-75">{label}</p>
          {description && (
            <Tooltip text={description}>
              <Info className="w-4 h-4" style={{ opacity: 0.5 }} />
            </Tooltip>
          )}
        </div>
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

  const RecipientStatusBadge = ({ status }) => {
    const statusConfig = {
      clicked: { bg: "#22c55e", text: "Clicked", icon: MousePointerClick },
      opened: { bg: "#3b82f6", text: "Opened", icon: Eye },
      not_opened: { bg: "#9ca3af", text: "Not Opened", icon: EyeOff },
      bounced: { bg: "#ef4444", text: "Bounced", icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.not_opened;
    const Icon = config.icon;

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 12px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "500",
          backgroundColor: `${config.bg}20`,
          color: config.bg,
        }}
      >
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  const PaginationControls = ({ campaignId }) => {
    if (fullFetch || totalPages <= 1 || loadingRecipients) return null;

    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px",
        padding: "16px",
        borderTop: "1px solid var(--border)",
        backgroundColor: "var(--card)",
      }}>
        <button
          onClick={() => fetchRecipients(campaignId, currentPage - 1)}
          disabled={currentPage === 1 || loadingRecipients}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--secondary)",
            color: "var(--foreground)",
            cursor: currentPage === 1 || loadingRecipients ? "not-allowed" : "pointer",
            opacity: currentPage === 1 || loadingRecipients ? 0.5 : 1,
          }}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        <span style={{ fontSize: "14px", opacity: 0.75 }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => fetchRecipients(campaignId, currentPage + 1)}
          disabled={currentPage === totalPages || loadingRecipients}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--secondary)",
            color: "var(--foreground)",
            cursor: currentPage === totalPages || loadingRecipients ? "not-allowed" : "pointer",
            opacity: currentPage === totalPages || loadingRecipients ? 0.5 : 1,
          }}
        >
          Next
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: "var(--background)", color: "var(--foreground)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading campaigns...</span>
        </div>
      </div>
    );
  }

  // Detail View with Recipients
  if (view === "detail" && selectedCampaign) {
    const { campaign, analytics } = selectedCampaign;

    const emailsSent = analytics?.emails_sent ?? 0;
    const openCount = analytics?.opens?.unique_opens ?? 0;
    const openRate = ((analytics?.opens?.open_rate ?? 0) * 100) || 0;
    const clickCount = analytics?.clicks?.unique_subscriber_clicks ?? 0;
    const clickRate = ((analytics?.clicks?.click_rate ?? 0) * 100) || 0;
    const bounceTotal = (analytics?.bounces?.hard_bounces ?? 0) + (analytics?.bounces?.soft_bounces ?? 0);

    const sentDate = campaign.send_time ? new Date(campaign.send_time).toLocaleDateString() : "N/A";

    return (
      <div style={{ backgroundColor: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 30, backgroundColor: "var(--background)" }}>
          <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px 24px" }}>
            <button
              onClick={() => {
                setView("list");
                setSelectedCampaign(null);
                setRecipients([]);
                setTotalRecipients(0);
                setCurrentPage(1);
                setFullFetch(false);
                setRecipientFilter("all");
                setRecipientSearch("");
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
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px 24px" }}>
          {/* Analytics Section */}
          <div style={{ marginBottom: "48px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px" }}>Campaign Analytics</h2>

            {/* Metric Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
              <MetricCard
                icon={Send}
                label="Emails Sent"
                value={emailsSent}
                description="Total number of emails delivered in this campaign"
              />
              <MetricCard
                icon={Eye}
                label="Unique Opens"
                value={openCount}
                description="Number of unique recipients who opened the email at least once"
              />
              <MetricCard
                icon={Eye}
                label="Open Rate"
                value={openRate.toFixed(1)}
                unit="%"
                description="Percentage of delivered emails that were opened (Unique Opens ÷ Emails Delivered × 100)"
              />
              <MetricCard
                icon={MousePointerClick}
                label="Unique Clicks"
                value={clickCount}
                description="Number of unique recipients who clicked any link in the email"
              />
              <MetricCard
                icon={MousePointerClick}
                label="Click Rate"
                value={clickRate.toFixed(1)}
                unit="%"
                description="Percentage of delivered emails where recipient clicked a link (Unique Clicks ÷ Emails Delivered × 100)"
              />
              <MetricCard
                icon={AlertCircle}
                label="Total Bounces"
                value={bounceTotal}
                description="Failed deliveries including hard bounces (invalid addresses) and soft bounces (temporary failures)"
              />
            </div>
          </div>

          {/* Recipients Section */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>Recipients</h2>
                <p style={{ fontSize: "14px", opacity: 0.75 }}>
                  {loadingRecipients ? "Loading recipients..." : fullFetch
                    ? `${filteredRecipients.length} of ${totalRecipients} (all matching loaded)`
                    : `${filteredRecipients.length} matching on this page (${start}-${end} of ${totalRecipients} total)`}
                </p>
              </div>
            </div>

            {/* Recipient Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
              <button
                onClick={() => setRecipientFilter("all")}
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  border: `2px solid ${recipientFilter === "all" ? "#81b17b" : "var(--border)"}`,
                  backgroundColor: recipientFilter === "all" ? "rgba(129, 177, 123, 0.1)" : "var(--card)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <p style={{ fontSize: "12px", opacity: 0.75 }}>All Recipients</p>
                  <Tooltip text="Total emails sent in this campaign">
                    <Info className="w-3 h-3" style={{ opacity: 0.5 }} />
                  </Tooltip>
                </div>
                <p style={{ fontSize: "24px", fontWeight: "bold" }}>{recipientStats.total}</p>
              </button>

              <button
                onClick={() => setRecipientFilter("clicked")}
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  border: `2px solid ${recipientFilter === "clicked" ? "#22c55e" : "var(--border)"}`,
                  backgroundColor: recipientFilter === "clicked" ? "rgba(34, 197, 94, 0.1)" : "var(--card)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <p style={{ fontSize: "12px", opacity: 0.75 }}>Opened & Clicked</p>
                  <Tooltip text="Recipients who opened the email AND clicked links (highest engagement)">
                    <Info className="w-3 h-3" style={{ opacity: 0.5 }} />
                  </Tooltip>
                </div>
                <p style={{ fontSize: "24px", fontWeight: "bold", color: "#22c55e" }}>{recipientStats.clicked}</p>
              </button>

              <button
                onClick={() => setRecipientFilter("opened")}
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  border: `2px solid ${recipientFilter === "opened" ? "#3b82f6" : "var(--border)"}`,
                  backgroundColor: recipientFilter === "opened" ? "rgba(59, 130, 246, 0.1)" : "var(--card)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <p style={{ fontSize: "12px", opacity: 0.75 }}>Opened Only</p>
                  <Tooltip text="Recipients who opened but did NOT click (Total Opens = Opened Only + Opened & Clicked)">
                    <Info className="w-3 h-3" style={{ opacity: 0.5 }} />
                  </Tooltip>
                </div>
                <p style={{ fontSize: "24px", fontWeight: "bold", color: "#3b82f6" }}>{recipientStats.opened}</p>
              </button>

              <button
                onClick={() => setRecipientFilter("not_opened")}
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  border: `2px solid ${recipientFilter === "not_opened" ? "#9ca3af" : "var(--border)"}`,
                  backgroundColor: recipientFilter === "not_opened" ? "rgba(156, 163, 175, 0.1)" : "var(--card)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <p style={{ fontSize: "12px", opacity: 0.75 }}>Not Opened</p>
                  <Tooltip text="Recipients who never opened the email (Delivered - Total Opens)">
                    <Info className="w-3 h-3" style={{ opacity: 0.5 }} />
                  </Tooltip>
                </div>
                <p style={{ fontSize: "24px", fontWeight: "bold", color: "#9ca3af" }}>{recipientStats.not_opened}</p>
              </button>

              <button
                onClick={() => setRecipientFilter("bounced")}
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  border: `2px solid ${recipientFilter === "bounced" ? "#ef4444" : "var(--border)"}`,
                  backgroundColor: recipientFilter === "bounced" ? "rgba(239, 68, 68, 0.1)" : "var(--card)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <p style={{ fontSize: "12px", opacity: 0.75 }}>Bounced</p>
                  <Tooltip text="Emails that failed to deliver (hard + soft bounces). Note: May require separate API call.">
                    <Info className="w-3 h-3" style={{ opacity: 0.5 }} />
                  </Tooltip>
                </div>
                <p style={{ fontSize: "24px", fontWeight: "bold", color: "#ef4444" }}>{recipientStats.bounced}</p>
              </button>
            </div>

            {/* Total Opens Summary */}
            <div style={{
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: "rgba(59, 130, 246, 0.05)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              marginBottom: "24px",
            }}>
              <p style={{ fontSize: "13px", opacity: 0.8 }}>
                <strong>Total Opened:</strong> {recipientStats.clicked + recipientStats.opened} recipients
                <span style={{ opacity: 0.6 }}> = {recipientStats.clicked} (Opened & Clicked) + {recipientStats.opened} (Opened Only)</span>
              </p>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "2px solid var(--border)",
                backgroundColor: "var(--card)",
              }}>
                <Search className="w-5 h-5" style={{ opacity: 0.5 }} />
                <input
                  type="text"
                  placeholder="Search by email address..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    backgroundColor: "transparent",
                    color: "var(--foreground)",
                    fontSize: "14px",
                  }}
                />
              </div>
            </div>

            {/* Recipients Table */}
            {loadingRecipients ? (
              <div style={{ textAlign: "center", padding: "64px 0" }}>
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ opacity: 0.5 }} />
                <p style={{ opacity: 0.75 }}>Loading recipients...</p>
              </div>
            ) : filteredRecipients.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 0", opacity: 0.5 }}>
                <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p style={{ fontSize: "18px", marginBottom: "8px" }}>
                  {fullFetch ? "No matching recipients found for this filter" : "No recipients found"}
                </p>
                {!fullFetch && (
                  <p style={{ fontSize: "14px" }}>Try adjusting your filters or search. Note: Filters apply to the current page.</p>
                )}
              </div>
            ) : (
              <>
                <div style={{
                  borderRadius: "8px",
                  border: "2px solid var(--border)",
                  overflow: "hidden",
                  backgroundColor: "var(--card)",
                }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead style={{
                        backgroundColor: "rgba(129, 177, 123, 0.1)",
                        borderBottom: "2px solid var(--border)",
                      }}>
                        <tr>
                          <th style={{ textAlign: "left", padding: "16px", color: "#81b17b", fontWeight: "bold", fontSize: "14px" }}>
                            Email Address
                          </th>
                          <th style={{ textAlign: "left", padding: "16px", color: "#81b17b", fontWeight: "bold", fontSize: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              Status
                              <Tooltip text="Engagement status: Clicked > Opened > Not Opened > Bounced">
                                <Info className="w-3 h-3" style={{ opacity: 0.7 }} />
                              </Tooltip>
                            </div>
                          </th>
                          <th style={{ textAlign: "center", padding: "16px", color: "#81b17b", fontWeight: "bold", fontSize: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                              Opens
                              <Tooltip text="Total number of times this recipient opened the email (including repeat opens)">
                                <Info className="w-3 h-3" style={{ opacity: 0.7 }} />
                              </Tooltip>
                            </div>
                          </th>
                          <th style={{ textAlign: "center", padding: "16px", color: "#81b17b", fontWeight: "bold", fontSize: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                              Clicks
                              <Tooltip text="Total number of times this recipient clicked links (including repeat clicks)">
                                <Info className="w-3 h-3" style={{ opacity: 0.7 }} />
                              </Tooltip>
                            </div>
                          </th>
                          <th style={{ textAlign: "left", padding: "16px", color: "#81b17b", fontWeight: "bold", fontSize: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              Last Activity
                              <Tooltip text="Timestamp of the most recent action (open or click) by this recipient">
                                <Info className="w-3 h-3" style={{ opacity: 0.7 }} />
                              </Tooltip>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecipients.map((recipient, idx) => {
                          const status = getRecipientStatus(recipient);
                          const opens = recipient.activity?.filter(a => a.action === "open").length || 0;
                          const clicks = recipient.activity?.filter(a => a.action === "click").length || 0;
                          const sortedActivity = [...(recipient.activity || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                          const lastActivity = sortedActivity[0]?.timestamp
                            ? new Date(sortedActivity[0].timestamp).toLocaleString()
                            : "No activity";

                          return (
                            <tr
                              key={idx}
                              style={{
                                borderBottom: idx < filteredRecipients.length - 1 ? "1px solid var(--border)" : "none",
                                backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(129, 177, 123, 0.02)",
                              }}
                            >
                              <td style={{ padding: "16px", fontSize: "14px" }}>
                                {recipient.email_address}
                              </td>
                              <td style={{ padding: "16px" }}>
                                <RecipientStatusBadge status={status} />
                              </td>
                              <td style={{ padding: "16px", textAlign: "center", fontWeight: "500" }}>
                                {opens}
                              </td>
                              <td style={{ padding: "16px", textAlign: "center", fontWeight: "500" }}>
                                {clicks}
                              </td>
                              <td style={{ padding: "16px", fontSize: "12px", opacity: 0.75 }}>
                                {lastActivity}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <PaginationControls campaignId={campaign.id} />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div style={{ backgroundColor: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 30, backgroundColor: "var(--background)" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <p style={{ fontSize: "14px", opacity: 0.75 }}>Total Campaigns</p>
              <Tooltip text="Count of all campaigns in your Mailchimp account">
                <Info className="w-4 h-4" style={{ opacity: 0.5 }} />
              </Tooltip>
            </div>
            <p style={{ fontSize: "32px", fontWeight: "bold" }}>{campaigns.length}</p>
          </div>
          <div style={{
            padding: "16px",
            borderRadius: "8px",
            border: "2px solid var(--border)",
            backgroundColor: "var(--card)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <p style={{ fontSize: "14px", opacity: 0.75 }}>Sent</p>
              <Tooltip text="Number of campaigns that have been sent to recipients">
                <Info className="w-4 h-4" style={{ opacity: 0.5 }} />
              </Tooltip>
            </div>
            <p style={{ fontSize: "32px", fontWeight: "bold" }}>{campaigns.filter((c) => c.status === "sent").length}</p>
          </div>
          <div style={{
            padding: "16px",
            borderRadius: "8px",
            border: "2px solid var(--border)",
            backgroundColor: "var(--card)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <p style={{ fontSize: "14px", opacity: 0.75 }}>Drafts</p>
              <Tooltip text="Number of campaigns saved as drafts (not yet sent)">
                <Info className="w-4 h-4" style={{ opacity: 0.5 }} />
              </Tooltip>
            </div>
            <p style={{ fontSize: "32px", fontWeight: "bold" }}>{campaigns.filter((c) => c.status === "draft").length}</p>
          </div>
        </div>

        {/* Campaigns List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {campaigns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", opacity: 0.5 }}>
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p style={{ fontSize: "18px", marginBottom: "8px" }}>No campaigns found</p>
              <p style={{ fontSize: "14px" }}>No campaigns in your Mailchimp account</p>
            </div>
          ) : (
            campaigns.map((campaign, idx) => {
              const analytics = campaign.analytics;
              const sentDate = campaign.send_time ? new Date(campaign.send_time).toLocaleDateString() : "N/A";

              return (
                <button
                  key={idx}
                  onClick={() => fetchCampaignDetail(campaign.id)}
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
                      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
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
                        <p style={{ fontWeight: "bold" }}>{(analytics.opens?.unique_opens ?? 0).toLocaleString()}</p>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "12px", opacity: 0.6, marginBottom: "4px" }}>Clicks</p>
                        <p style={{ fontWeight: "bold" }}>{(analytics.clicks?.unique_subscriber_clicks ?? 0).toLocaleString()}</p>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "12px", opacity: 0.6, marginBottom: "4px" }}>Bounces</p>
                        <p style={{ fontWeight: "bold" }}>
                          {(
                            (analytics.bounces?.hard_bounces ?? 0) +
                            (analytics.bounces?.soft_bounces ?? 0)
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
    </div>
  );
}