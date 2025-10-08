"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Map of section IDs to display name (optional if API already returns them)
async function fetchSections() {
  const res = await fetch("/api/admin/sections");
  if (!res.ok) throw new Error("Failed to load sections");
  return res.json();
}

const allItems = [
  { title: "Dashboard", url: "/dashboard", icon: "Home" },
  { title: "Portfolio Visualiser", url: "/portfolio-visualiser", icon: "LineChart" },
  { title: "Performance", url: "/performance", icon: "ClipboardList" },
  { title: "Monthly Report", url: "/monthly-report", icon: "FileText" },
  { title: "Drawdown Comparison", url: "/drawdown-comparison", icon: "Activity" },
  { title: "Client Tracker", url: "/client-tracker", icon: "Users" },
  { title: "Website Enquiries", url: "/website-enquiries", icon: "MessageSquare" },
  { title: "MyQode Website Enquiries", url: "/myqode-website-enquiries", icon: "Inbox" },
  { title: "Admin", url: "/admin", icon: "Settings" }
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load users + sections
  useEffect(() => {
    async function loadData() {
      try {
        const [userRes, sectionRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/sections"),
        ]);
        const userData = await userRes.json();
        const sectionData = await sectionRes.json();
        setUsers(userData.users ?? []);
        setSections(sectionData.sections ?? []);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    }
    loadData();
  }, []);

  const togglePermission = async (email, sectionId, checked) => {
    try {
      setLoading(true);
      if (checked) {
        // Add permission
        await fetch("/api/admin/permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, section_id: sectionId }),
        });
      } else {
        // Remove permission
        await fetch("/api/admin/permissions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, section_id: sectionId }),
        });
      }

      // Refresh users
      const userRes = await fetch("/api/admin/users");
      const userData = await userRes.json();
      setUsers(userData.users ?? []);
    } catch (err) {
      console.error("Error updating permissions:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-lvh p-6">
      <h2 className="text-2xl font-bold mb-4">User Permissions</h2>
      <Card className="">
        <CardHeader>
          <CardTitle></CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                {sections.map((section) => (
                  <TableHead key={section.section_id}>
                    {section.section_name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  {sections.map((section) => {
                    const hasPerm = user.permissions.some(
                      (p) => p.section_id === section.section_id
                    );
                    return (
                      <TableCell
                        key={section.section_id}
                        className="text-center"
                      >
                        <Checkbox
                          checked={hasPerm}
                          disabled={loading}
                          onCheckedChange={(checked) =>
                            togglePermission(
                              user.email,
                              section.section_id,
                              checked
                            )
                          }
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <p className="text-sm text-gray-500 mt-3">Updating...</p>}
        </CardContent>
      </Card>
    </div>
  );
}
