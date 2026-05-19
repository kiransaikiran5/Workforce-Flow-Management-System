import React from "react";
import Sidebar from "./Sidebar"; // adjust import if needed

export default function Layout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6">
        {children}
      </main>
    </div>
  );
}