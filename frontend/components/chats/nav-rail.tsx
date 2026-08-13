"use client";

export type NavTab = "chats" | "stories" | "calls" | "settings";

interface NavRailProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unreadCount?: number;
  onLogout: () => void;
  onToggleRail?: () => void;
}

export function NavRail({
  activeTab,
  onTabChange,
  unreadCount = 0,
  onLogout,
  onToggleRail,
}: NavRailProps) {
  return (
    <aside className="nav-rail" aria-label="Main Navigation">
      <div className="rail-toggle-wrap">
        <button
          type="button"
          className="rail-toggle"
          aria-label="Toggle navigation"
          onClick={() => onToggleRail && onToggleRail()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
      <div className="rail-top">
        {/* Signal logo - always returns to Chats */}
        {/* <button
          type="button"
          className="rail-btn signal-logo"
          data-label="Signal"
          aria-label="Signal"
          onClick={() => onTabChange("chats")}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.34 5L2 22l5.13-1.31A9.95 9.95 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.57 0-3.04-.43-4.3-1.18l-.31-.19-3.2.82.84-3.11-.2-.33A7.95 7.95 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
          </svg>
        </button> */}

        {/* Chats */}
        <button
          type="button"
          className={`rail-btn ${
            activeTab === "chats" ? "active" : ""
          }`}
          onClick={() => onTabChange("chats")}
          data-label="Chats"
          aria-label="Chats"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>

          {unreadCount > 0 && (
            <span className="rail-badge" />
          )}
        </button>

        {/* Stories */}
        <button
          type="button"
          className={`rail-btn ${
            activeTab === "stories" ? "active" : ""
          }`}
          onClick={() => onTabChange("stories")}
          data-label="Stories"
          aria-label="Stories"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        </button>

        {/* Calls */}
        <button
          type="button"
          className={`rail-btn ${
            activeTab === "calls" ? "active" : ""
          }`}
          onClick={() => onTabChange("calls")}
          data-label="Calls"
          aria-label="Calls"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 0 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 0 22 16.92z" />
          </svg>
        </button>
      </div>

      <div className="rail-bottom">
        {/* Settings */}
        <button
          type="button"
          className={`rail-btn ${
            activeTab === "settings" ? "active" : ""
          }`}
          onClick={() => onTabChange("settings")}
          data-label="Settings"
          aria-label="Settings"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* Logout */}
        <button
          type="button"
          className="rail-btn"
          data-label="Sign Out"
          aria-label="Sign Out"
          onClick={onLogout}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}