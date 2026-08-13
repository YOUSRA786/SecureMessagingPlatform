"use client";

import { useState, useEffect } from "react";
import { type User } from "@/lib/api";

type SettingsTab =
  | "profile"
  | "general"
  | "appearance"
  | "chats"
  | "calls"
  | "notifications"
  | "privacy"
  | "data"
  | "backups"
  | "donate";

interface SettingsViewProps {
  user: User;
  onClose?: () => void;
}

export function SettingsView({ user, onClose }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [showCallNotifications, setShowCallNotifications] = useState(true);
  const [screenSecurity, setScreenSecurity] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showChatColor, setShowChatColor] = useState(false);
  const defaultColor = typeof window !== "undefined" ? (getComputedStyle(document.documentElement).getPropertyValue("--bubble-outgoing") || "#6d63d8") : "#6d63d8";
  const storedColor = typeof window !== "undefined" ? window.localStorage.getItem("signal_chat_color") : null;
  const initialColor = (storedColor && storedColor.trim()) || defaultColor.trim();
  const [selectedColor, setSelectedColor] = useState<string>(initialColor);

  // apply selected color to the global CSS variable so all chat bubbles update
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--bubble-outgoing", selectedColor);
      // keep timestamp color readable by leaving text/time variables as-is
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("signal_chat_color", selectedColor);
    }
  }, [selectedColor]);

  const PALETTE = [
    "#7c63ff",
    "#ff3b30",
    "#ff6b00",
    "#ff8a65",
    "#8b5e3c",
    "#10b981",
    "#16a34a",
    "#06b6d4",
    "#0ea5e9",
    "#2563eb",
    "#6d63d8",
    "#8b5cf6",
    "#ec4899",
    "#ff7ab6",
    "#9ca3af",
    "#a78bfa",
    "#f97316",
    "#ef4444",
    "#f43f5e",
    "#10b981",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#7c3aed",
  ];

  function toggleTheme(newTheme: "light" | "dark") {
    try {
      setTheme(newTheme);
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", newTheme);
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem("signal_theme", newTheme);
      }
    } catch (err) {
      // fail safe: don't throw in UI
      // eslint-disable-next-line no-console
      console.error("toggleTheme error", err);
    }
  }

  // apply persisted theme on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("signal_theme");
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", stored);
        }
      }
    }
  }, []);

  function initials(name: string) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return (
    <div className="settings-view">
      {/* Settings Sidebar Pane */}
      <div className="settings-sidebar">
        <div className="settings-sidebar-top">
          {/* <button className="hamburger-btn" aria-label="Open menu">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
          </button> */}
          <h2 className="settings-title">Settings</h2>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label="Close Settings">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
            </button>
          )}
        </div>

        {/* Profile Card at top */}
        <div
          className={`settings-profile-card ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <div className="avatar">{initials(user.display_name)}</div>
          <div className="settings-profile-info">
            <strong>{user.display_name}</strong>
            <small>{user.phone ?? `@${user.username}`}</small>
          </div>
        </div>

        {/* Categories Menu */}
        <button
          className={`settings-menu-item ${activeTab === "general" ? "active" : ""}`}
          onClick={() => setActiveTab("general")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="settings-item-icon"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          General
        </button>

        <button
          className={`settings-menu-item ${activeTab === "appearance" ? "active" : ""}`}
          onClick={() => setActiveTab("appearance")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="settings-item-icon"><path d="M21 12a9 9 0 1 1-9-9"/><circle cx="12" cy="12" r="3"/></svg>
          Appearance
        </button>

        <button
          className={`settings-menu-item ${activeTab === "chats" ? "active" : ""}`}
          onClick={() => setActiveTab("chats")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="settings-item-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Chats
        </button>

        <button
          className={`settings-menu-item ${activeTab === "calls" ? "active" : ""}`}
          onClick={() => setActiveTab("calls")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="settings-item-icon"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 0 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 0 22 16.92z"/></svg>
          Calls
        </button>

        <button
          className={`settings-menu-item ${activeTab === "notifications" ? "active" : ""}`}
          onClick={() => setActiveTab("notifications")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="settings-item-icon"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Notifications
        </button>

        <button
          className={`settings-menu-item ${activeTab === "privacy" ? "active" : ""}`}
          onClick={() => setActiveTab("privacy")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="settings-item-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Privacy
        </button>

        <button
          className={`settings-menu-item ${activeTab === "data" ? "active" : ""}`}
          onClick={() => setActiveTab("data")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="settings-item-icon"><path d="M3 3v18h18"/><path d="M18 7v11"/><path d="M13 11v7"/><path d="M8 14v4"/></svg>
          Data usage
        </button>

        <button
          className={`settings-menu-item ${activeTab === "backups" ? "active" : ""}`}
          onClick={() => setActiveTab("backups")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="settings-item-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v6l4 2"/></svg>
          Backups
        </button>

        <button
          className={`settings-menu-item ${activeTab === "donate" ? "active" : ""}`}
          onClick={() => setActiveTab("donate")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="settings-item-icon"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.78 0L12 5.62l-1.02-1.02a5.5 5.5 0 0 0-7.78 7.78L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/></svg>
          Donate to Signal
        </button>
      </div>

      {/* Main Settings Detail Content */}
      <div className="settings-content">
        {activeTab === "profile" && (
          <div>
            <h2 className="settings-section-title">Profile</h2>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
              <div className="avatar lg" style={{ marginBottom: "12px" }}>
                {user.display_name.slice(0, 1).toUpperCase()}
              </div>
              <button className="button button-secondary" style={{ height: "32px", fontSize: "13px" }}>
                Edit photo
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                <strong>Display Name</strong>
                <span>{user.display_name}</span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                <strong>Username</strong>
                <span>@{user.username}</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  People can now message you using your optional username so you don't have to give out your phone number.
                </span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                <strong>Phone Number</strong>
                <span>{user.phone ?? "Not configured"}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "general" && (
          <div>
            <h2 className="settings-section-title">General</h2>
            <div className="setting-item">
              <div className="setting-label">
                <strong>Phone Number</strong>
              </div>
              <span>{user.phone ?? "+91 98765 43210"}</span>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                <strong>Device Name</strong>
              </div>
              <span>Windows</span>
            </div>

            <div className="settings-group" style={{ marginTop: "24px" }}>
              <div className="settings-group-header">System</div>
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked />
                <span>Open at computer login</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Hide menu bar</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked />
                <span>Minimize to system tray</span>
              </label>
            </div>

            <div className="settings-group">
              <div className="settings-group-header">Permissions</div>
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Allow access to the microphone</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Allow access to the camera</span>
              </label>
            </div>

            <div className="settings-group">
              <div className="settings-group-header">Update</div>
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked />
                <span>Automatically download updates</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === "appearance" && !showChatColor && (
          <div>
            <h2 className="settings-section-title">Appearance</h2>

            <div className="appearance-row" role="button">
              <div className="row-left">
                <svg viewBox="0 0 24 24" className="row-icon" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M21 12a9 9 0 1 0-9 9"/></svg>
                <div className="row-label">Language</div>
              </div>
              <div className="row-right">System Language</div>
            </div>

            <div className="appearance-row">
              <div className="row-left">
                <svg viewBox="0 0 24 24" className="row-icon" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v2"/><path d="M12 19v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/><circle cx="12" cy="12" r="3"/></svg>
                <div className="row-label">Theme</div>
              </div>
              <div className="row-right">
                <select className="form-input" value={theme} onChange={(e) => toggleTheme(e.target.value as "light" | "dark")}> 
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>

            <div className="appearance-row" onClick={() => setShowChatColor(true)} role="button">
              <div className="row-left">
                <svg viewBox="0 0 24 24" className="row-icon" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <div className="row-label">Chat color</div>
              </div>
              <div className="row-right">
                <span className="color-indicator" style={{ background: selectedColor }} />
                <svg viewBox="0 0 24 24" className="chevron" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>

            <div className="appearance-row">
              <div className="row-left">
                <svg viewBox="0 0 24 24" className="row-icon" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v2H3z"/><path d="M3 11h18v2H3z"/><path d="M3 19h18v2H3z"/></svg>
                <div className="row-label">Zoom level</div>
              </div>
              <div className="row-right">
                <select className="form-input" defaultValue="100%">
                  <option>100%</option>
                  <option>125%</option>
                  <option>150%</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === "appearance" && showChatColor && (
          <div className="chat-color-page">
            <div className="chat-color-header">
              <button className="icon-btn" onClick={() => setShowChatColor(false)} aria-label="Back">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <h2 className="settings-section-title">Chat Color</h2>
            </div>

            <div className="chat-color-previews">
              <div className="preview-incoming">
                <div className="preview-text">Here's a preview of the chat color.</div>
                <div className="preview-time">10:12 PM</div>
              </div>

              <div className="preview-outgoing" style={{ background: selectedColor }}>
                <div className="preview-text" style={{ color: 'var(--bubble-outgoing-text)' }}>The color is visible to only you.</div>
                <div className="preview-time outgoing-time">Now</div>
              </div>
            </div>

            <div className="palette-grid">
              {PALETTE.map((c, i) => (
                <button
                  key={`${c}-${i}`}
                  className={`swatch ${c.toLowerCase() === selectedColor.toLowerCase() ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setSelectedColor(c)}
                  aria-label={`Select ${c}`}
                />
              ))}
              <button className="swatch add-swatch">+</button>
            </div>

            <div className="chat-color-footer">
              <button className="button button-secondary" onClick={() => setSelectedColor(defaultColor)}>Reset all chat colors</button>
            </div>
          </div>
        )}

        {activeTab === "privacy" && (
          <div>
            <h2 className="settings-section-title">Privacy</h2>

            <div className="setting-item">
              <div className="setting-label">
                <strong>Phone Number</strong>
                <span>Choose who can see your phone number and who can contact you on Signal with it.</span>
              </div>
              <button className="button button-secondary" style={{ height: "32px", fontSize: "13px" }}>
                Change…
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                <strong>Blocked</strong>
                <span>No users or groups</span>
              </div>
              <button className="button button-secondary" style={{ height: "32px", fontSize: "13px" }}>
                View
              </button>
            </div>

            <div className="settings-group" style={{ marginTop: "24px" }}>
              <div className="settings-group-header">Messaging</div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => setReadReceipts(e.target.checked)}
                />
                <div>
                  <strong>Read receipts</strong>
                  <span style={{ display: "block", fontSize: "12.5px", color: "var(--text-muted)" }}>
                    If disabled, you won't see read receipts from others.
                  </span>
                </div>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={typingIndicators}
                  onChange={(e) => setTypingIndicators(e.target.checked)}
                />
                <div>
                  <strong>Typing indicators</strong>
                  <span style={{ display: "block", fontSize: "12.5px", color: "var(--text-muted)" }}>
                    If disabled, you won't see typing indicators from others.
                  </span>
                </div>
              </label>
            </div>

            <div className="settings-group">
              <div className="settings-group-header">Disappearing messages</div>
              <div className="setting-item">
                <div className="setting-label">
                  <strong>Default timer for new chats</strong>
                  <span>Set a default disappearing message timer for all new chats started by you.</span>
                </div>
                <select className="form-input" style={{ width: "auto" }} defaultValue="off">
                  <option value="off">Off</option>
                  <option value="5m">5 minutes</option>
                  <option value="1h">1 hour</option>
                  <option value="1d">1 day</option>
                  <option value="1w">1 week</option>
                </select>
              </div>
            </div>

            <div className="settings-group">
              <div className="settings-group-header">Application</div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={screenSecurity}
                  onChange={(e) => setScreenSecurity(e.target.checked)}
                />
                <div>
                  <strong>Screen security</strong>
                  <span style={{ display: "block", fontSize: "12.5px", color: "var(--text-muted)" }}>
                    Prevent screenshots of Signal on this computer for added privacy.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div>
            <h2 className="settings-section-title">Notifications</h2>

            <div className="settings-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={enableNotifications}
                  onChange={(e) => setEnableNotifications(e.target.checked)}
                />
                <span>Enable notifications</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showCallNotifications}
                  onChange={(e) => setShowCallNotifications(e.target.checked)}
                />
                <span>Show notifications for calls</span>
              </label>

              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Draw attention to this window when a notification arrives</span>
              </label>

              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Include muted chats in badge count</span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                <strong>Notification content</strong>
              </div>
              <select className="form-input" style={{ width: "auto" }} defaultValue="name_content">
                <option value="name_content">Name, content, and actions</option>
                <option value="name_only">Name only</option>
                <option value="no_name">No name or content</option>
              </select>
            </div>
          </div>
        )}

        {["chats", "calls", "data", "backups", "donate"].includes(activeTab) && (
          <div>
            <h2 className="settings-section-title">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              Standard Signal Desktop options for {activeTab} settings are enabled.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
