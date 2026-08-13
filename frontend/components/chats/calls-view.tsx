"use client";

import { useState } from "react";

export function CallsView() {
  const [search, setSearch] = useState("");

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      {/* Calls Sidebar Pane */}
      <div className="sidebar-pane">
        <div className="sidebar-header">
          <h2>Calls</h2>
          <button className="icon-btn" title="Call Options">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="search-container">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Create Call Link Item */}
        <div className="conversation-list" style={{ padding: "0 12px" }}>
          <button className="settings-menu-item" style={{ marginBottom: "16px" }} onClick={() => alert("Call link copied to clipboard!")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span>Create a Call Link</span>
          </button>

          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 10px" }}>
            <strong style={{ display: "block", fontSize: "14px", color: "var(--text-main)", marginBottom: "4px" }}>
              No calls
            </strong>
            <span style={{ fontSize: "12.5px" }}>Recent calls will appear here.</span>
          </div>
        </div>
      </div>

      {/* Calls Main Content Pane */}
      <div className="main-pane">
        <div className="empty-chat-state">
          <div className="empty-chat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <h2>No calls selected</h2>
          <p>Click 📞 inside any chat to start a new voice or video call.</p>
        </div>
      </div>
    </div>
  );
}
