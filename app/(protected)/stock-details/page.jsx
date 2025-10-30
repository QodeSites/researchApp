// ===== UPDATED: StockDetails component with Tabbed Comments by User + Timestamps =====
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Edit2, X, Upload, Link as LinkIcon, Download, Trash2, Plus, FileText, ExternalLink, CheckCircle2, AlertCircle, Users, Edit, Send, Calendar, Clock } from "lucide-react";

const initialStatusOptions = ["Not Started", "In Progress", "Completed"];
const finalStatusOptions = ["Not Started", "In Progress", "Completed", "Not Go Ahead"];
const holdingOptions = ["Shortlist", "Holding", "Past Holding"];
const sourceOptions = ["Quant", "Recommendation", "Other"];
const contactTypeOptions = ["Primary", "Secondary", "Investor Relations", "Management"];
const preferredContactOptions = ["Email", "Phone", "LinkedIn", "In-Person"];
const contactFrequencyOptions = ["Weekly", "Monthly", "Quarterly", "Annually"];

const categories = [
  { key: "research_document", label: "Research Document", icon: FileText },
  { key: "financial_model", label: "Financial Model", icon: FileText },
  { key: "meeting_notes", label: "Company Meeting & Concall Notes", icon: FileText },
  { key: "news_section", label: "News Section", icon: FileText }
];

const statusBadgeColors = {
  "Not Started": { bg: "#f3f4f6", text: "#6b7280", icon: "AlertCircle" },
  "In Progress": { bg: "#fef3c7", text: "#92400e", icon: "AlertCircle" },
  "Completed": { bg: "#dcfce7", text: "#166534", icon: "CheckCircle2" },
  "Not Go Ahead": { bg: "#fee2e2", text: "#991b1b", icon: "X" }
};

// Utility function to format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  // Show relative time if recent
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Show full date/time
  const dateStr = date.toLocaleDateString('en-GB');
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} at ${timeStr}`;
};

export default function StockDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const isNew = searchParams.get("edit") === "true";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(isNew || !id);
  const [isDirty, setIsDirty] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const [formData, setFormData] = useState({
    stock_id: null,
    symbol: "",
    exchange: "NSE",
    company_name: "",
    macro_sector: "",
    sector: "",
    industry: "",
    basic_industry: "",
    bse_code: "",
    researched_by: "",
    initial_status: "Not Started",
    final_status: "",
    completed_on: "",
    source: "",
    source_other: "",
    holding: "",
    total_contacts: 0,
    total_meetings: 0
  });

  const [attachments, setAttachments] = useState(
    categories.reduce((acc, cat) => ({
      ...acc,
      [cat.key]: { files: [], links: [], text: "" }
    }), {})
  );

  const [comments, setComments] = useState([]);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [activeCommentTab, setActiveCommentTab] = useState(null);

  const [contacts, setContacts] = useState([]);
  const [deletedContacts, setDeletedContacts] = useState([]);

  const handleInitialStatusChange = (value) => {
    if (value === "Completed" && !formData.completed_on) {
      if (confirm("Setting Initial Status to Completed will automatically set the Completed On date to today. Do you want to continue?")) {
        setFormData(prev => ({
          ...prev,
          initial_status: value,
          completed_on: new Date().toISOString().split('T')[0]
        }));
      }
      // If not confirmed, do nothing (status not changed)
    } else {
      setFormData(prev => ({
        ...prev,
        initial_status: value
      }));
    }
    setIsDirty(true);
  };

  useEffect(() => {
    fetchCurrentUser();
    if (id) {
      fetchStockDetails();
    } else {
      setLoading(false);
      setContacts([]);
      setDeletedContacts([]);
      setIsDirty(false);
      setComments([]);
    }
  }, [id]);

  // Set active tab to first user when comments load
  useEffect(() => {
    if (comments.length > 0 && !activeCommentTab) {
      const firstUser = comments[0].user?.name || "Anonymous";
      setActiveCommentTab(firstUser);
    }
  }, [comments, activeCommentTab]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchStockDetails = async () => {
    try {
      const res = await fetch(`/api/research-stocks/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFormData(data);

      setComments(data.thoughts || []);

      const newAttachments = {
        research_document: {
          files: data.documentation_files || [],
          links: data.documentation_links || [],
          text: data.research_document_text || ""
        },
        financial_model: {
          files: data.financial_model_files || [],
          links: data.financial_model_links || [],
          text: data.financial_model_text || ""
        },
        meeting_notes: {
          files: data.meeting_notes_files || [],
          links: data.meeting_notes_links || [],
          text: data.meeting_notes_text || ""
        },
        news_section: {
          files: data.news_section_files || [],
          links: data.news_section_links || [],
          text: data.news_section_text || ""
        }
      };
      setAttachments(newAttachments);

      fetchContacts(id);
    } catch (error) {
      console.error("Error fetching details:", error);
    }
    setLoading(false);
    setIsDirty(false);
  };

  const fetchContacts = async (stockId) => {
    try {
      const res = await fetch(`/api/contacts?research_stock_id=${stockId}`);
      if (res.ok) {
        const data = await res.json();
        setContacts((data.contacts || []).map(c => ({ ...c, isNew: false, modified: false })));
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setContacts([]);
    }
    setDeletedContacts([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setIsDirty(true);
  };

  const handleSourceChange = (value) => {
    setFormData(prev => ({
      ...prev,
      source: value,
      source_other: value === "Other" ? prev.source_other : ""
    }));
    setIsDirty(true);
  };

  const handleSourceOtherChange = (value) => {
    setFormData(prev => ({
      ...prev,
      source_other: value
    }));
    setIsDirty(true);
  };

  const handleFileUpload = (e, categoryKey) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: event.target?.result
        };

        setAttachments(prev => ({
          ...prev,
          [categoryKey]: {
            ...prev[categoryKey],
            files: [...(prev[categoryKey].files || []), fileData]
          }
        }));
        setIsDirty(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddLink = (name, url, categoryKey) => {
    if (!url.trim() || !name.trim()) {
      alert("Please enter a valid name and link");
      return;
    }

    const linkObj = { name: name.trim(), url: url.trim() };

    setAttachments(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        links: [...(prev[categoryKey].links || []), linkObj]
      }
    }));
    setIsDirty(true);
  };

  const removeAttachment = (categoryKey, subType, index) => {
    setAttachments(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [subType]: prev[categoryKey][subType].filter((_, i) => i !== index)
      }
    }));
    setIsDirty(true);
  };

  const handleTextChange = (categoryKey, value) => {
    setAttachments(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        text: value
      }
    }));
    setIsDirty(true);
  };

  const handleAddComment = async (text) => {
    if (!text.trim() || !currentUser || !id) return;

    setSubmittingComment(true);
    try {
      const newComment = {
        text: text.trim(),
        user_id: currentUser.id,
        user: { name: currentUser.name, email: currentUser.email },
        timestamp: new Date().toISOString()
      };

      const res = await fetch(`/api/research-stocks/${id}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thoughts: [...comments, newComment]
        })
      });

      if (!res.ok) throw new Error("Failed to add comment");

      const data = await res.json();
      setComments(data.thoughts || []);
      setActiveCommentTab(currentUser.name);
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment");
    }
    setSubmittingComment(false);
  };

  const handleUpdateComment = async (commentIndex, newText) => {
    if (!newText.trim()) return;

    setSubmittingComment(true);
    try {
      const updatedComments = [...comments];
      updatedComments[commentIndex] = {
        ...updatedComments[commentIndex],
        text: newText.trim(),
        timestamp: new Date().toISOString()
      };

      const res = await fetch(`/api/research-stocks/${id}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thoughts: updatedComments
        })
      });

      if (!res.ok) throw new Error("Failed to update comment");

      const data = await res.json();
      setComments(data.thoughts || []);
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (error) {
      console.error("Error updating comment:", error);
      alert("Failed to update comment");
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentIndex) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    setSubmittingComment(true);
    try {
      const updatedComments = comments.filter((_, i) => i !== commentIndex);

      const res = await fetch(`/api/research-stocks/${id}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thoughts: updatedComments
        })
      });

      if (!res.ok) throw new Error("Failed to delete comment");

      const data = await res.json();
      setComments(data.thoughts || []);
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment");
    }
    setSubmittingComment(false);
  };

  const handleAddContact = () => {
    setContacts(prev => [...prev, {
      id: null,
      contact_type: "",
      first_name: "",
      last_name: "",
      title: "",
      email: "",
      phone: "",
      secondary_email: "",
      secondary_phone: "",
      office_address: "",
      city: "",
      country: "",
      timezone: "",
      preferred_contact_method: "",
      linkedin_url: "",
      notes: "",
      last_contacted_date: "",
      contact_frequency: "",
      is_active: true,
      isNew: true,
      modified: false
    }]);
    setIsDirty(true);
  };

  const handleUpdateContact = (index, field, value) => {
    setContacts(prev => prev.map((c, i) => i === index ? {
      ...c,
      [field]: value,
      modified: c.isNew ? false : true
    } : c));
    setIsDirty(true);
  };

  const removeContact = (index) => {
    const contactToRemove = contacts[index];
    if (contactToRemove.id && !contactToRemove.isNew) {
      setDeletedContacts(prev => [...prev, contactToRemove.id]);
    }
    setContacts(prev => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!formData.stock_id && !isEditMode) {
      alert("Please select a stock");
      return;
    }

    setSaving(true);
    try {
      const method = id ? "PUT" : "POST";
      const url = id ? `/api/research-stocks/${id}` : "/api/research-stocks";

      const attachmentData = {};
      categories.forEach(cat => {
        attachmentData[`${cat.key}_files`] = attachments[cat.key].files;
        attachmentData[`${cat.key}_links`] = attachments[cat.key].links;
        attachmentData[`${cat.key}_text`] = attachments[cat.key].text;
      });
      attachmentData.documentation_files = attachments.research_document.files;
      attachmentData.documentation_links = attachments.research_document.links;
      attachmentData.financial_model_files = attachments.financial_model.files;
      attachmentData.financial_model_links = attachments.financial_model.links;

      const dataToSave = {
        ...formData,
        total_contacts: contacts.length,
        total_meetings: formData.total_meetings || 0,
        thoughts: comments,
        ...attachmentData
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave)
      });

      if (!res.ok) throw new Error("Failed to save stock");

      const savedStock = await res.json();
      const stockId = id || savedStock.id;

      for (const delId of deletedContacts) {
        try {
          const delRes = await fetch(`/api/contacts/${delId}`, {
            method: 'DELETE'
          });
          if (!delRes.ok) {
            console.error(`Failed to delete contact ${delId}`);
          }
        } catch (err) {
          console.error("Error deleting contact:", err);
        }
      }
      setDeletedContacts([]);

      for (const contact of contacts) {
        if (contact.isNew || contact.modified) {
          const contactData = {
            ...contact,
            research_stock_id: stockId,
            is_active: contact.is_active !== false
          };
          if (contact.id) delete contactData.id;

          const contactMethod = contact.isNew ? 'POST' : 'PUT';
          const contactUrl = contact.isNew ? '/api/contacts' : `/api/contacts/${contact.id}`;
          const contactRes = await fetch(contactUrl, {
            method: contactMethod,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(contactData)
          });
          if (!contactRes.ok) {
            console.error(`Failed to save contact ${contact.id || 'new'}`);
          }
        }
      }

      alert("Stock research data saved successfully!");
      setIsEditMode(false);
      setIsDirty(false);
      if (!id) {
        router.push(`/stock-details?id=${stockId}`);
      } else {
        fetchStockDetails();
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error saving data");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-opacity-25 border-current rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: "var(--primary)" }}></div>
          <p style={{ color: "var(--foreground)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)"
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md" style={{ borderColor: "var(--border)", borderBottomWidth: "1px", backgroundColor: "var(--background)" + "dd" }}>
        <div className="mx-auto px-6 py-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg transition hover:opacity-70"
            style={{ backgroundColor: "var(--secondary)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{formData.symbol || "New Stock"}</h1>
              {formData.exchange && (
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}>
                  {formData.exchange}
                </span>
              )}
            </div>
            <p className="opacity-70 text-sm">{formData.company_name || "Select a stock"}</p>
          </div>

          {!isEditMode ? (
            <button
              onClick={() => setIsEditMode(true)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition hover:shadow-lg"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)"
              }}
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditMode(false);
                  setIsDirty(false);
                  if (id) fetchStockDetails();
                }}
                className="px-6 py-2.5 rounded-lg font-medium transition border-2"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white transition hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "var(--primary)",
                  opacity: saving ? 0.7 : 1
                }}
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto px-6 py-8">
        {isEditMode ? (
          <EditView
            formData={formData}
            attachments={attachments}
            comments={comments}
            contacts={contacts}
            categories={categories}
            currentUser={currentUser}
            submittingComment={submittingComment}
            editingCommentId={editingCommentId}
            editingCommentText={editingCommentText}
            setEditingCommentId={setEditingCommentId}
            setEditingCommentText={setEditingCommentText}
            activeCommentTab={activeCommentTab}
            setActiveCommentTab={setActiveCommentTab}
            handleChange={handleChange}
            handleInitialStatusChange={handleInitialStatusChange}
            handleSourceChange={handleSourceChange}
            handleSourceOtherChange={handleSourceOtherChange}
            handleFileUpload={handleFileUpload}
            handleAddLink={handleAddLink}
            handleTextChange={handleTextChange}
            removeAttachment={removeAttachment}
            handleAddComment={handleAddComment}
            handleUpdateComment={handleUpdateComment}
            handleDeleteComment={handleDeleteComment}
            handleAddContact={handleAddContact}
            handleUpdateContact={handleUpdateContact}
            removeContact={removeContact}
          />
        ) : (
          <ViewMode
            formData={formData}
            attachments={attachments}
            comments={comments}
            contacts={contacts}
            categories={categories}
            currentUser={currentUser}
            submittingComment={submittingComment}
            editingCommentId={editingCommentId}
            editingCommentText={editingCommentText}
            setEditingCommentId={setEditingCommentId}
            setEditingCommentText={setEditingCommentText}
            activeCommentTab={activeCommentTab}
            setActiveCommentTab={setActiveCommentTab}
            handleAddComment={handleAddComment}
            handleUpdateComment={handleUpdateComment}
            handleDeleteComment={handleDeleteComment}
          />
        )}
      </div>
    </div>
  );
}

// ===== VIEW MODE ===== (With Tabbed User Comments)
function ViewMode({ formData, attachments, comments, contacts, categories, currentUser, submittingComment, editingCommentId, editingCommentText, setEditingCommentId, setEditingCommentText, activeCommentTab, setActiveCommentTab, handleAddComment, handleUpdateComment, handleDeleteComment }) {
  const [announcements, setAnnouncements] = useState([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(5);
  const [activeTab, setActiveTab] = useState(categories[0].key);
  const [newCommentText, setNewCommentText] = useState("");

  useEffect(() => {
    const loadAnnouncements = async () => {
      let paramValue, paramName;
      if (formData.bse_code) {
        paramValue = formData.bse_code;
        paramName = 'bse_code';
      } else if (formData.symbol || formData.nse_symbol) {
        paramValue = formData.symbol || formData.nse_symbol;
        paramName = 'symbol';
      } else {
        setAnnouncements([]);
        return;
      }

      await fetchAnnouncements(paramValue, paramName);
    };

    loadAnnouncements();
  }, [formData.bse_code, formData.symbol, formData.nse_symbol]);

  const fetchAnnouncements = async (paramValue, paramName) => {
    setAnnLoading(true);
    setDisplayCount(5);
    try {
      const url = `/api/announcements?${paramName}=${paramValue}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setAnnouncements([]);
    }
    setAnnLoading(false);
  };

  const renderAttachmentList = (files, links) => {
    if (files.length === 0 && links.length === 0) {
      return (
        <div className="text-center py-8 opacity-50">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No attachments</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {files.map((file, idx) => (
          <div key={`file-${idx}`} className="flex items-center gap-3 p-4 rounded-lg transition hover:shadow-md group" style={{ backgroundColor: "var(--secondary)" }}>
            <FileText className="w-5 h-5 opacity-60 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs opacity-60">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
            <a
              href={file.data}
              download={file.name}
              className="px-3 py-1.5 text-xs rounded font-medium transition hover:shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100"
              style={{ backgroundColor: "var(--accent)", color: "var(--foreground)" }}
            >
              Download
            </a>
          </div>
        ))}
        {links.map((link, idx) => (
          <a
            key={`link-${idx}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-lg transition hover:shadow-md group"
            style={{ backgroundColor: "var(--secondary)" }}
          >
            <ExternalLink className="w-5 h-5 opacity-60 flex-shrink-0" />
            <p className="text-sm text-blue-500 hover:underline truncate flex-1">{link.name}</p>
          </a>
        ))}
      </div>
    );
  };

  const renderCategoryContent = (catKey) => {
    const cat = attachments[catKey];
    return (
      <div>
        {cat.text && (
          <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: "var(--secondary)", opacity: 0.8 }}>
            <p className="whitespace-pre-wrap text-sm">{cat.text}</p>
          </div>
        )}
        {renderAttachmentList(cat.files || [], cat.links || [])}
      </div>
    );
  };

  // Group comments by user
  const groupCommentsByUser = () => {
    const grouped = {};
    comments.forEach((comment) => {
      const userName = comment.user?.name || "Anonymous";
      if (!grouped[userName]) {
        grouped[userName] = [];
      }
      grouped[userName].push(comment);
    });
    return grouped;
  };

  const groupedComments = groupCommentsByUser();
  const userTabs = Object.keys(groupedComments);
  const activeUserComments = activeCommentTab ? groupedComments[activeCommentTab] : [];

  const renderComments = () => {
    if (userTabs.length === 0) {
      return (
        <div className="text-center py-8 opacity-50">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No notes added yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* User Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-2" style={{ borderColor: "var(--border)" }}>
          {userTabs.map((userName) => (
            <button
              key={userName}
              onClick={() => setActiveCommentTab(userName)}
              className={`px-4 py-2 rounded-t-lg font-medium text-sm transition whitespace-nowrap ${
                activeCommentTab === userName
                  ? "border-b-2"
                  : "opacity-60 hover:opacity-80"
              }`}
              style={{
                backgroundColor: activeCommentTab === userName ? "var(--secondary)" : "transparent",
                borderBottomColor: activeCommentTab === userName ? "var(--primary)" : "transparent",
                borderBottomWidth: activeCommentTab === userName ? "2px" : "0px",
                color: "var(--foreground)"
              }}
            >
              <Users className="w-4 h-4 inline mr-1" />
              {userName}
            </button>
          ))}
        </div>

        {/* Comments for Active User */}
        <div className="space-y-3">
          {activeUserComments.map((comment, idx) => {
            const isCurrentUserComment = currentUser?.id === comment.user_id;
            const isEditing = editingCommentId === `${activeCommentTab}-${idx}`;
            const actualIndex = comments.findIndex(c => c === comment);

            return (
              <div
                key={idx}
                className="p-4 rounded-lg border transition hover:shadow-md relative group"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--secondary)" }}
              >
                {/* Header with timestamp */}
                <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{comment.user?.name || "Anonymous"}</p>
                    <div className="flex items-center gap-2 text-xs opacity-60 mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatTimestamp(comment.timestamp)}</span>
                    </div>
                  </div>
                  {isCurrentUserComment && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => {
                          setEditingCommentId(`${activeCommentTab}-${idx}`);
                          setEditingCommentText(comment.text);
                        }}
                        className="p-1.5 rounded transition hover:bg-opacity-70"
                        style={{ backgroundColor: "var(--background)" }}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteComment(actualIndex)}
                        className="p-1.5 rounded transition hover:bg-opacity-70"
                        style={{ backgroundColor: "var(--background)" }}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Comment Content */}
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingCommentText}
                      onChange={(e) => setEditingCommentText(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 outline-none transition resize-none text-sm"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)"
                      }}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateComment(actualIndex, editingCommentText)}
                        disabled={submittingComment}
                        className="px-3 py-1.5 text-sm rounded font-medium transition disabled:opacity-50"
                        style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditingCommentText("");
                        }}
                        className="px-3 py-1.5 text-sm rounded font-medium transition"
                        style={{ borderColor: "var(--border)", borderWidth: "1px", color: "var(--foreground)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{comment.text || ''}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAnnouncements = () => {
    if (annLoading) {
      return (
        <div className="text-center py-8 opacity-50">
          <div className="w-8 h-8 border-2 border-opacity-25 border-current rounded-full animate-spin mx-auto mb-2" style={{ borderTopColor: "var(--primary)" }}></div>
          <p className="text-sm">Loading announcements...</p>
        </div>
      );
    }

    if (!formData.bse_code && !formData.symbol && !formData.nse_symbol) {
      return (
        <div className="text-center py-8 opacity-50">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Enter BSE Scrip Code or select a stock to fetch announcements</p>
        </div>
      );
    }

    if (announcements.length === 0) {
      return (
        <div className="text-center py-8 opacity-50">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No announcements found</p>
        </div>
      );
    }

    const visibleAnnouncements = announcements.slice(0, displayCount);
    const hasMore = displayCount < announcements.length;

    return (
      <div className="space-y-3">
        {visibleAnnouncements.map((ann, idx) => (
          <div key={`ann-${idx}`} className="p-4 rounded-lg border transition hover:shadow-md" style={{ borderColor: "var(--border)", backgroundColor: "var(--secondary)" }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium text-sm">{ann.subject}</p>
                <p className="text-xs opacity-60">{ann.date}</p>
              </div>
              {ann.attachment && (
                <a
                  href={`${ann.attachment}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded font-medium transition hover:shadow-md whitespace-nowrap"
                  style={{ backgroundColor: "var(--accent)", color: "var(--foreground)" }}
                >
                  <Download className="w-3 h-3" />
                  Attachment
                </a>
              )}
            </div>
          </div>
        ))}
        {hasMore && (
          <button
            onClick={() => setDisplayCount(prev => prev + 5)}
            className="w-full mt-4 px-4 py-2.5 rounded-lg font-medium transition hover:shadow-md"
            style={{
              backgroundColor: "var(--secondary)",
              color: "var(--foreground)",
              borderColor: "var(--border)",
              borderWidth: "1px"
            }}
          >
            Load More ({displayCount} of {announcements.length})
          </button>
        )}
      </div>
    );
  };

  const getSourceDisplay = () => {
    if (!formData.source) return "—";
    if (formData.source !== "Other") return formData.source;
    return formData.source_other ? `Other - ${formData.source_other}` : "Other";
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatusCard label="Initial Status" value={formData.initial_status} />
        <StatusCard label="Final Status" value={formData.final_status} />
        <StatusCard label="Holding" value={formData.holding} />
        <StatusCard label="Source" value={getSourceDisplay()} />
        <StatusCard label="Total Contacts" value={contacts.length} />
        <StatusCard label="Total Meetings" value={formData.total_meetings || 0} />
      </div>

      {/* Research Status Section */}
      <Section title="Research Status" icon={FileText}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoField label="Initial Status" value={formData.initial_status} />
          <InfoField label="Final Status" value={formData.final_status} />
          <InfoField label="Holding" value={formData.holding} />
          <InfoField label="Source" value={getSourceDisplay()} />
          <InfoField label="Researched By" value={formData.researched_by} />
          <InfoField label="Completed On" value={formData.completed_on} />
        </div>
      </Section>

      {/* Basic Info */}
      <Section title="Basic Information" icon={FileText}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoField label="Macro Sector" value={formData.macro_sector} />
          <InfoField label="Sector" value={formData.sector} />
          <InfoField label="Industry" value={formData.industry} />
          <InfoField label="Basic Industry" value={formData.basic_industry} />
          <InfoField label="BSE Scrip Code" value={formData.bse_code} />
          <InfoField label="NSE Symbol" value={formData.nse_symbol || formData.symbol} />
        </div>
      </Section>

      {/* Designation */}
      <Section title="Contact Directory" icon={Users}>
        {contacts.length === 0 ? (
          <div className="text-center py-8 opacity-50">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No contacts added</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact, idx) => (
              <div key={contact.id || `contact-${idx}`} className="p-4 rounded-lg border transition hover:shadow-md" style={{ borderColor: "var(--border)", backgroundColor: "var(--secondary)" }}>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{contact.first_name} {contact.last_name}</p>
                    <p className="text-xs opacity-70">{contact.title}</p>
                    <p className="text-xs">{contact.email}</p>
                    <p className="text-xs opacity-70">{contact.phone}</p>
                    {contact.linkedin_url && (
                      <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                        LinkedIn
                      </a>
                    )}
                  </div>
                  <div className="text-xs opacity-60">
                    <p>Type: {contact.contact_type}</p>
                    <p>Last Contacted: {contact.last_contacted_date || "N/A"}</p>
                  </div>
                </div>
                {contact.notes && <p className="mt-2 text-xs opacity-70">{contact.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Documentation Tabs */}
      <Section title="Documentation" icon={FileText}>
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              className={`py-2 px-4 text-sm font-medium border-b-2 ${
                activeTab === cat.key
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              style={{
                color: activeTab === cat.key ? "var(--primary)" : "var(--foreground)",
                borderBottomColor: activeTab === cat.key ? "var(--primary)" : "transparent"
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {renderCategoryContent(activeTab)}
        </div>
      </Section>

      {/* Analysis & Insights - With Tabbed Comments */}
      <Section title="Analysis & Insights" icon={FileText}>
        <div className="space-y-6">
          {/* Add Comment Form */}
          {currentUser && (
            <div className="p-4 rounded-lg border-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--secondary)" }}>
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Add Note ({currentUser.name})
              </p>
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Share your analysis and insights..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border-2 outline-none transition resize-none focus:shadow-md text-sm mb-3"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)"
                }}
              />
              <button
                onClick={() => {
                  handleAddComment(newCommentText);
                  setNewCommentText("");
                }}
                disabled={submittingComment || !newCommentText.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)"
                }}
              >
                <Send className="w-4 h-4" />
                {submittingComment ? "Adding..." : "Add Note"}
              </button>
            </div>
          )}

          {/* Tabbed Comments */}
          {renderComments()}
        </div>
      </Section>

      {/* Corporate Announcements */}
      <Section title={`Corporate Announcements ${announcements.length > 0 ? `(${announcements.length})` : ''}`} icon={FileText}>
        {renderAnnouncements()}
      </Section>
    </div>
  );
}

// ===== EDIT VIEW ===== (With Tabbed Comments)
function EditView({
  formData,
  attachments,
  comments,
  contacts,
  categories,
  currentUser,
  submittingComment,
  editingCommentId,
  editingCommentText,
  setEditingCommentId,
  setEditingCommentText,
  activeCommentTab,
  setActiveCommentTab,
  handleChange,
  handleInitialStatusChange,
  handleSourceChange,
  handleSourceOtherChange,
  handleFileUpload,
  handleAddLink,
  handleTextChange,
  removeAttachment,
  handleAddComment,
  handleUpdateComment,
  handleDeleteComment,
  handleAddContact,
  handleUpdateContact,
  removeContact
}) {
  const [activeTab, setActiveTab] = useState(categories[0].key);
  const [newCommentText, setNewCommentText] = useState("");
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const renderCategoryContent = (catKey) => {
    const cat = attachments[catKey];
    return (
      <div className="space-y-4">
        <textarea
          value={cat.text}
          onChange={(e) => handleTextChange(catKey, e.target.value)}
          placeholder={`Enter notes for ${categories.find(c => c.key === catKey)?.label}...`}
          rows={4}
          className="w-full px-4 py-3 rounded-lg border-2 outline-none transition resize-none focus:shadow-md"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--background)",
            color: "var(--foreground)"
          }}
        />
        <MultiAttachmentField
          categoryKey={catKey}
          attachments={attachments}
          newLinkName={newLinkName}
          newLinkUrl={newLinkUrl}
          setNewLinkName={setNewLinkName}
          setNewLinkUrl={setNewLinkUrl}
          onFileUpload={handleFileUpload}
          onAddLink={handleAddLink}
          onRemove={removeAttachment}
        />
      </div>
    );
  };

  // Group comments by user
  const groupCommentsByUser = () => {
    const grouped = {};
    comments.forEach((comment) => {
      const userName = comment.user?.name || "Anonymous";
      if (!grouped[userName]) {
        grouped[userName] = [];
      }
      grouped[userName].push(comment);
    });
    return grouped;
  };

  const groupedComments = groupCommentsByUser();
  const userTabs = Object.keys(groupedComments);
  const activeUserComments = activeCommentTab ? groupedComments[activeCommentTab] : [];

  const renderCommentsInEdit = () => {
    return (
      <div className="space-y-6">
        {/* Add Comment Form */}
        {currentUser && (
          <div className="p-4 rounded-lg border-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--secondary)" }}>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Add Note ({currentUser.name})
            </p>
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Share your analysis and insights..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border-2 outline-none transition resize-none focus:shadow-md text-sm mb-3"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--background)",
                color: "var(--foreground)"
              }}
            />
            <button
              onClick={() => {
                handleAddComment(newCommentText);
                setNewCommentText("");
              }}
              disabled={submittingComment || !newCommentText.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)"
              }}
            >
              <Send className="w-4 h-4" />
              {submittingComment ? "Adding..." : "Add Note"}
            </button>
          </div>
        )}

        {/* User Tabs */}
        {userTabs.length > 0 && (
          <>
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-2" style={{ borderColor: "var(--border)" }}>
              {userTabs.map((userName) => (
                <button
                  key={userName}
                  onClick={() => setActiveCommentTab(userName)}
                  className={`px-4 py-2 rounded-t-lg font-medium text-sm transition whitespace-nowrap ${
                    activeCommentTab === userName
                      ? "border-b-2"
                      : "opacity-60 hover:opacity-80"
                  }`}
                  style={{
                    backgroundColor: activeCommentTab === userName ? "var(--secondary)" : "transparent",
                    borderBottomColor: activeCommentTab === userName ? "var(--primary)" : "transparent",
                    borderBottomWidth: activeCommentTab === userName ? "2px" : "0px",
                    color: "var(--foreground)"
                  }}
                >
                  <Users className="w-4 h-4 inline mr-1" />
                  {userName}
                </button>
              ))}
            </div>

            {/* Comments for Active User */}
            <div className="space-y-3">
              {activeUserComments.map((comment, idx) => {
                const isCurrentUserComment = currentUser?.id === comment.user_id;
                const isEditing = editingCommentId === `${activeCommentTab}-${idx}`;
                const actualIndex = comments.findIndex(c => c === comment);

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border-2 transition hover:shadow-md relative group"
                    style={{ borderColor: "var(--border)", backgroundColor: "var(--secondary)" }}
                  >
                    {/* Header with timestamp */}
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{comment.user?.name || "Anonymous"}</p>
                        <div className="flex items-center gap-2 text-xs opacity-60 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatTimestamp(comment.timestamp)}</span>
                        </div>
                      </div>
                      {isCurrentUserComment && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCommentId(`${activeCommentTab}-${idx}`);
                              setEditingCommentText(comment.text);
                            }}
                            className="p-1.5 rounded transition hover:bg-opacity-70"
                            style={{ backgroundColor: "var(--background)" }}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(actualIndex)}
                            className="p-1.5 rounded transition hover:bg-opacity-70"
                            style={{ backgroundColor: "var(--background)" }}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Comment Content */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border-2 outline-none transition resize-none text-sm"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: "var(--background)",
                            color: "var(--foreground)"
                          }}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateComment(actualIndex, editingCommentText)}
                            disabled={submittingComment}
                            className="px-3 py-1.5 text-sm rounded font-medium transition disabled:opacity-50"
                            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentText("");
                            }}
                            className="px-3 py-1.5 text-sm rounded font-medium transition"
                            style={{ borderColor: "var(--border)", borderWidth: "1px", color: "var(--foreground)" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{comment.text || ''}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {userTabs.length === 0 && (
          <div className="text-center py-8 opacity-50">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notes added yet</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Section title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Macro Sector"
            name="macro_sector"
            value={formData.macro_sector}
            onChange={handleChange}
            placeholder="e.g., IT, Healthcare"
          />
          <FormField
            label="Sector"
            name="sector"
            value={formData.sector}
            onChange={handleChange}
          />
          <FormField
            label="Industry"
            name="industry"
            value={formData.industry}
            onChange={handleChange}
          />
          <FormField
            label="Basic Industry"
            name="basic_industry"
            value={formData.basic_industry}
            onChange={handleChange}
          />
          <FormField
            label="BSE Scrip Code"
            name="bse_code"
            value={formData.bse_code}
            onChange={handleChange}
            placeholder="e.g., 532978"
          />
          <FormField
            label="NSE Symbol"
            name="nse_symbol"
            value={formData.nse_symbol}
            onChange={handleChange}
            placeholder="e.g., AVPINFRA"
          />
          <FormField
            label="Researched By"
            name="researched_by"
            value={formData.researched_by}
            onChange={handleChange}
          />
          <FormField
            label="Completed On"
            name="completed_on"
            type="date"
            value={formData.completed_on}
            onChange={handleChange}
            disabled={formData.initial_status === "Completed"}
          />
        </div>
      </Section>

      {/* Research Status */}
      <Section title="Research Status">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SelectField
            label="Initial Status"
            name="initial_status"
            value={formData.initial_status}
            onChange={(e) => handleInitialStatusChange(e.target.value)}
            options={["Not Started", "In Progress", "Completed"]}
          />
          <SelectField
            label="Final Status"
            name="final_status"
            value={formData.final_status}
            onChange={handleChange}
            options={["Not Started", "In Progress", "Completed", "Not Go Ahead"]}
            placeholder="Select status"
          />
          <SelectField
            label="Filter"
            name="holding"
            value={formData.holding}
            onChange={handleChange}
            options={["Shortlist", "Holding", "Past Holding"]}
            placeholder="Select holding option"
          />
          <div>
            <label className="block text-xs font-medium opacity-70 uppercase tracking-wide mb-2">Source</label>
            <select
              value={formData.source}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border-2 outline-none transition focus:shadow-md"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--background)",
                color: "var(--foreground)"
              }}
            >
              <option value="">Select source</option>
              {["Quant", "Recommendation", "Other"].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {formData.source === "Other" && (
              <FormField
                label="Other Source"
                value={formData.source_other}
                onChange={(e) => handleSourceOtherChange(e.target.value)}
                placeholder="Enter other source..."
              />
            )}
          </div>
        </div>
      </Section>

      {/* Designation */}
      <Section title="Contact Directory">
        <button
          onClick={handleAddContact}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition hover:shadow-md mb-4"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
        <div className="space-y-4">
          {contacts.map((contact, idx) => (
            <div key={contact.id || `new-${idx}`} className="p-4 rounded-lg border-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold">Contact {idx + 1}</h3>
                <button
                  onClick={() => removeContact(idx)}
                  className="p-2 rounded transition hover:opacity-70"
                  style={{ color: "#ef4444" }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SelectField
                  label="Contact Type"
                  value={contact.contact_type}
                  onChange={(e) => handleUpdateContact(idx, "contact_type", e.target.value)}
                  options={["Primary", "Secondary", "Investor Relations", "Management"]}
                  placeholder="Select type"
                />
                <FormField
                  label="First Name"
                  value={contact.first_name}
                  onChange={(e) => handleUpdateContact(idx, "first_name", e.target.value)}
                />
                <FormField
                  label="Last Name"
                  value={contact.last_name}
                  onChange={(e) => handleUpdateContact(idx, "last_name", e.target.value)}
                />
                <FormField
                  label="Title"
                  value={contact.title}
                  onChange={(e) => handleUpdateContact(idx, "title", e.target.value)}
                />
                <FormField
                  label="Email"
                  type="email"
                  value={contact.email}
                  onChange={(e) => handleUpdateContact(idx, "email", e.target.value)}
                />
                <FormField
                  label="Phone"
                  value={contact.phone}
                  onChange={(e) => handleUpdateContact(idx, "phone", e.target.value)}
                />
                <FormField
                  label="Secondary Email"
                  type="email"
                  value={contact.secondary_email}
                  onChange={(e) => handleUpdateContact(idx, "secondary_email", e.target.value)}
                />
                <FormField
                  label="Secondary Phone"
                  value={contact.secondary_phone}
                  onChange={(e) => handleUpdateContact(idx, "secondary_phone", e.target.value)}
                />
                <TextAreaField
                  label="Office Address"
                  value={contact.office_address}
                  onChange={(e) => handleUpdateContact(idx, "office_address", e.target.value)}
                  rows={2}
                />
                <FormField
                  label="City"
                  value={contact.city}
                  onChange={(e) => handleUpdateContact(idx, "city", e.target.value)}
                />
                <FormField
                  label="Country"
                  value={contact.country}
                  onChange={(e) => handleUpdateContact(idx, "country", e.target.value)}
                />
                <FormField
                  label="Timezone"
                  value={contact.timezone}
                  onChange={(e) => handleUpdateContact(idx, "timezone", e.target.value)}
                />
                <SelectField
                  label="Preferred Contact Method"
                  value={contact.preferred_contact_method}
                  onChange={(e) => handleUpdateContact(idx, "preferred_contact_method", e.target.value)}
                  options={["Email", "Phone", "LinkedIn", "In-Person"]}
                  placeholder="Select method"
                />
                <FormField
                  label="LinkedIn URL"
                  type="url"
                  value={contact.linkedin_url}
                  onChange={(e) => handleUpdateContact(idx, "linkedin_url", e.target.value)}
                />
                <TextAreaField
                  label="Notes"
                  value={contact.notes}
                  onChange={(e) => handleUpdateContact(idx, "notes", e.target.value)}
                  rows={3}
                  placeholder="Additional notes..."
                />
                <FormField
                  label="Last Contacted Date"
                  type="date"
                  value={contact.last_contacted_date}
                  onChange={(e) => handleUpdateContact(idx, "last_contacted_date", e.target.value)}
                />
                <SelectField
                  label="Contact Frequency"
                  value={contact.contact_frequency}
                  onChange={(e) => handleUpdateContact(idx, "contact_frequency", e.target.value)}
                  options={["Weekly", "Monthly", "Quarterly", "Annually"]}
                  placeholder="Select frequency"
                />
                <SelectField
                  label="Active"
                  value={contact.is_active ? "Yes" : "No"}
                  onChange={(e) => handleUpdateContact(idx, "is_active", e.target.value === "Yes")}
                  options={["Yes", "No"]}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Documentation Tabs */}
      <Section title="Documentation">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              className={`py-2 px-4 text-sm font-medium border-b-2 ${
                activeTab === cat.key
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              style={{
                color: activeTab === cat.key ? "var(--primary)" : "var(--foreground)",
                borderBottomColor: activeTab === cat.key ? "var(--primary)" : "transparent"
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {renderCategoryContent(activeTab)}
        </div>
      </Section>

      {/* Analysis & Insights - With Tabbed Comments */}
      <Section title="Analysis & Insights">
        {renderCommentsInEdit()}
      </Section>
    </div>
  );
}

// Reusable components
function StatusCard({ label, value }) {
  return (
    <div className="p-4 rounded-lg border-2 transition hover:shadow-md" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
      <p className="text-xs font-medium opacity-60 mb-2">{label}</p>
      <p className="font-bold text-lg">{value || "—"}</p>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-lg border-2 overflow-hidden transition hover:shadow-md" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
      <div className="px-6 py-4 border-b-2 flex items-center gap-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--secondary)" }}>
        {Icon && <Icon className="w-5 h-5 opacity-70" />}
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium opacity-60 uppercase tracking-wide mb-2">{label}</p>
      <p className="font-medium text-base">{value || "—"}</p>
    </div>
  );
}

function FormField({ label, name, value, onChange, type = "text", placeholder = "", disabled = false }) {
  return (
    <div>
      <label className="block text-xs font-medium opacity-70 uppercase tracking-wide mb-2">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2.5 rounded-lg border-2 outline-none transition focus:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
          color: "var(--foreground)"
        }}
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, rows = 3, placeholder = "" }) {
  return (
    <div className="md:col-span-2">
      <label className="block text-xs font-medium opacity-70 uppercase tracking-wide mb-2">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-lg border-2 outline-none transition focus:shadow-md resize-none"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
          color: "var(--foreground)"
        }}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, placeholder = "" }) {
  return (
    <div>
      <label className="block text-xs font-medium opacity-70 uppercase tracking-wide mb-2">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2.5 rounded-lg border-2 outline-none transition focus:shadow-md"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
          color: "var(--foreground)"
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function MultiAttachmentField({ categoryKey, attachments, newLinkName, newLinkUrl, setNewLinkName, setNewLinkUrl, onFileUpload, onAddLink, onRemove }) {
  const files = attachments[categoryKey]?.files || [];
  const links = attachments[categoryKey]?.links || [];

  return (
    <div className="space-y-6">
      {/* Files */}
      <div>
        <label className="block text-xs font-medium opacity-70 uppercase tracking-wide mb-3">Upload Files</label>
        <label
          htmlFor={`file-${categoryKey}`}
          className="flex items-center justify-center gap-3 px-6 py-8 rounded-lg border-2 border-dashed cursor-pointer transition hover:opacity-80"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--background)"
          }}
        >
          <Upload className="w-5 h-5 opacity-60" />
          <div className="text-center">
            <p className="text-sm font-medium">Click to upload or drag and drop</p>
            <p className="text-xs opacity-60">PDF or CSV files up to 10MB</p>
          </div>
        </label>
        <input
          id={`file-${categoryKey}`}
          type="file"
          accept=".pdf,.csv"
          onChange={(e) => onFileUpload(e, categoryKey)}
          className="hidden"
        />

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg group transition" style={{ backgroundColor: "var(--secondary)" }}>
                <FileText className="w-5 h-5 opacity-60 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs opacity-60">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                <button
                  onClick={() => onRemove(categoryKey, "files", idx)}
                  className="p-2 rounded opacity-0 group-hover:opacity-100 transition"
                  style={{ backgroundColor: "var(--background)" }}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Links */}
      <div>
        <label className="block text-xs font-medium opacity-70 uppercase tracking-wide mb-3">Add Links</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          <input
            type="text"
            value={newLinkName}
            onChange={(e) => setNewLinkName(e.target.value)}
            placeholder="Link name..."
            className="px-4 py-2.5 rounded-lg border-2 outline-none transition focus:shadow-md text-sm"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)"
            }}
          />
          <input
            type="url"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="Paste link here..."
            className="px-4 py-2.5 rounded-lg border-2 outline-none transition focus:shadow-md text-sm"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)"
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                onAddLink(newLinkName, newLinkUrl, categoryKey);
                setNewLinkName("");
                setNewLinkUrl("");
              }
            }}
          />
        </div>
        <button
          onClick={() => {
            onAddLink(newLinkName, newLinkUrl, categoryKey);
            setNewLinkName("");
            setNewLinkUrl("");
          }}
          disabled={!newLinkName.trim() || !newLinkUrl.trim()}
          className="w-full px-4 py-2.5 rounded-lg font-medium transition hover:shadow-md disabled:opacity-50 flex items-center gap-2"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)"
          }}
        >
          <Plus className="w-4 h-4" />
          Add Link
        </button>

        {links.length > 0 && (
          <div className="space-y-2 mt-4">
            {links.map((link, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg group transition" style={{ backgroundColor: "var(--secondary)" }}>
                <ExternalLink className="w-5 h-5 opacity-60 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline truncate block"
                  >
                    {link.name}
                  </a>
                  <p className="text-xs opacity-60 truncate">{link.url}</p>
                </div>
                <button
                  onClick={() => onRemove(categoryKey, "links", idx)}
                  className="p-2 rounded opacity-0 group-hover:opacity-100 transition"
                  style={{ backgroundColor: "var(--background)" }}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}