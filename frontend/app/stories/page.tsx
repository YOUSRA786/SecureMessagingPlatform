"use client";

import { useState } from "react";

type Story = {
  id: number;
  name: string;
  time: string;
  avatar: string;
  viewed: boolean;
};

const stories: Story[] = [
  {
    id: 1,
    name: "Sarah",
    time: "Today, 2:30 PM",
    avatar: "S",
    viewed: false,
  },
  {
    id: 2,
    name: "Aisha",
    time: "Today, 1:15 PM",
    avatar: "A",
    viewed: false,
  },
  {
    id: 3,
    name: "Alex",
    time: "Yesterday",
    avatar: "A",
    viewed: true,
  },
];

export default function StoriesPage() {
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [selectedStory, setSelectedStory] =
    useState<Story | null>(null);

  return (
    <main className="stories-page">
      <div className="stories-content">
        <header className="stories-header">
          <div>
            <h1>Stories</h1>
            <p>Share moments with your contacts</p>
          </div>
        </header>

        <section className="stories-section">
          <h2>Your Story</h2>

          <button
            className="your-story-card"
            onClick={() => setShowComingSoon(true)}
          >
            <div className="story-avatar add-story">
              +
            </div>

            <div className="story-info">
              <strong>Add to your story</strong>
              <span>Share a photo or video</span>
            </div>
          </button>
        </section>

        <section className="stories-section">
          <h2>Recent</h2>

          <div className="stories-list">
            {stories.map((story) => (
              <button
                key={story.id}
                className="story-row"
                onClick={() => setSelectedStory(story)}
              >
                <div
                  className={`story-avatar ${
                    story.viewed
                      ? "story-viewed"
                      : "story-unviewed"
                  }`}
                >
                  <span>{story.avatar}</span>
                </div>

                <div className="story-info">
                  <strong>{story.name}</strong>
                  <span>{story.time}</span>
                </div>

                <span className="story-arrow">›</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {showComingSoon && (
        <div
          className="story-modal-overlay"
          onClick={() => setShowComingSoon(false)}
        >
          <div
            className="story-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="story-modal-icon">◉</div>

            <h2>Stories</h2>

            <p>
              Story sharing is coming soon.
            </p>

            <button
              className="story-modal-button"
              onClick={() => setShowComingSoon(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {selectedStory && (
        <div
          className="story-modal-overlay"
          onClick={() => setSelectedStory(null)}
        >
          <div
            className="story-viewer"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="story-close"
              onClick={() => setSelectedStory(null)}
            >
              ×
            </button>

            <div className="story-viewer-avatar">
              {selectedStory.avatar}
            </div>

            <h2>{selectedStory.name}</h2>

            <p>{selectedStory.time}</p>

            <div className="story-placeholder">
              <span>Story Preview</span>
              <small>
                Story content placeholder
              </small>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}