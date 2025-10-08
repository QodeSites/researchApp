"use client";

import { createContext, useContext, useState, useEffect } from "react";

const PermissionsContext = createContext();

export function PermissionsProvider({ children }) {
  const [allowedItems, setAllowedItems] = useState([
    { title: "Dashboard", url: "/dashboard", icon: "Home" },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const allItems = [
    { title: "Dashboard", url: "/dashboard", icon: "Home" },
    { title: "Performance", url: "/performance", icon: "ClipboardList" },
    { title: "Monthly Report", url: "/monthly-report", icon: "FileText" },
    { title: "Drawdown Comparison", url: "/drawdown-comparison", icon: "Activity" },
    { title: "Client Tracker", url: "/client-tracker", icon: "Users" },
    { title: "Portfolio Visualiser", url: "/portfolio-visualiser", icon: "LineChart" },
    { title: "Website Enquiries", url: "/website-enquiries", icon: "MessageSquare" },
    { title: "MyQode Website Enquiries", url: "/myqode-website-enquiries", icon: "Inbox" },
    { title: "Admin", url: "/admin", icon: "Settings" },
  ];

  useEffect(() => {
    async function loadPermissions() {
      try {
        console.log("Context Runs")
        const res = await fetch("/api/clientpermissions");
        if (!res.ok) throw new Error("Not authorized");
        const data = await res.json();
        const userPerms = data.permissions.map((p) => p.url);

        const filtered = allItems.filter((item) =>
          userPerms.includes(item.url.replace("/", ""))
        );

        const withDashboard = [
          { title: "Dashboard", url: "/dashboard", icon: "Home" },
          ...filtered.filter((i) => i.url !== "/dashboard"),
        ];

        setAllowedItems(withDashboard);
      } catch (err) {
        setError(err.message);
        await fetch("/api/logout", { method: "POST" });
      } finally {
        setLoading(false);
      }
    }
    loadPermissions();
  }, []);

  return (
    <PermissionsContext.Provider value={{ allowedItems, loading, error }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  console.log(context)
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}