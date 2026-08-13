"use client";

import { useState } from "react";
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

  function toggleTheme(newTheme: "light" | "dark") {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  }

  return (
    <div className="settings-view">
      {/* Settings Sidebar Pane */}
      <div className="settings-sidebar">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px 8px 4px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>Settings</h2>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label="Close Settings">
              ✕
            </button>
          )}
        </div>

        {/* Profile Card at top */}
        <div
          className={`settings-profile-card ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <div className="avatar">{user.display_name.slice(0, 1).toUpperCase()}</div>
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
          <span>⚙</span> General
        </button>

        <button
          className={`settings-menu-item ${activeTab === "appearance" ? "active" : ""}`}
          onClick={() => setActiveTab("appearance")}
        >
          <span>🎨</span> Appearance
        </button>

        <button
          className={`settings-menu-item ${activeTab === "chats" ? "active" : ""}`}
          onClick={() => setActiveTab("chats")}
        >
          <span>💬</span> Chats
        </button>

        <button
          className={`settings-menu-item ${activeTab === "calls" ? "active" : ""}`}
          onClick={() => setActiveTab("calls")}
        >
          <span>📞</span> Calls
        </button>

        <button
          className={`settings-menu-item ${activeTab === "notifications" ? "active" : ""}`}
          onClick={() => setActiveTab("notifications")}
        >
          <span>🔔</span> Notifications
        </button>

        <button
          className={`settings-menu-item ${activeTab === "privacy" ? "active" : ""}`}
          onClick={() => setActiveTab("privacy")}
        >
          <span>🔒</span> Privacy
        </button>

        <button
          className={`settings-menu-item ${activeTab === "data" ? "active" : ""}`}
          onClick={() => setActiveTab("data")}
        >
          <span>📊</span> Data usage
        </button>

        <button
          className={`settings-menu-item ${activeTab === "backups" ? "active" : ""}`}
          onClick={() => setActiveTab("backups")}
        >
          <span>🕒</span> Backups
        </button>

        <button
          className={`settings-menu-item ${activeTab === "donate" ? "active" : ""}`}
          onClick={() => setActiveTab("donate")}
        >
          <span>💙</span> Donate to Signal
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

        {activeTab === "appearance" && (
          <div>
            <h2 className="settings-section-title">Appearance</h2>
            <div className="settings-group">
              <div className="settings-group-header">Theme</div>
              <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                <button
                  className={`button ${theme === "light" ? "button-primary" : "button-secondary"}`}
                  onClick={() => toggleTheme("light")}
                >
                  ☀️ Light Mode
                </button>
                <button
                  className={`button ${theme === "dark" ? "button-primary" : "button-secondary"}`}
                  onClick={() => toggleTheme("dark")}
                >
                  🌙 Dark Mode
                </button>
              </div>
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
