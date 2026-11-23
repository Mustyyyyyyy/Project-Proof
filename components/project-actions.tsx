"use client";

import { Bookmark, Check, Copy, Heart } from "lucide-react";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

export function ProjectActions({
  projectId,
  initialLikes,
}: {
  projectId: string;
  initialLikes: number;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [notice, setNotice] = useState("");

  async function toggle(action: "like" | "bookmark") {
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json();
      if (response.status === 401) {
        setNotice("Sign in to save or like projects.");
        return;
      }
      if (!response.ok) throw new Error(result.error?.message || "The action could not be completed.");
      if (action === "like") {
        setLiked(Boolean(result.data.liked));
        setLikes(Number(result.data.count));
      } else {
        setBookmarked(Boolean(result.data.bookmarked));
      }
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "The action could not be completed.");
    }
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Project link copied.");
    } catch {
      setNotice("Could not copy the project link. Copy the page address from your browser.");
    }
  }

  return (
    <div>
      <div className="mt-5 flex gap-2">
        <button onClick={() => void toggle("like")} className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-md border text-sm ${liked ? "border-blue-700 text-blue-700" : ""}`}>
          <Heart size={16} fill={liked ? "currentColor" : "none"} /> {likes}
        </button>
        <button onClick={() => void toggle("bookmark")} className={`grid size-10 place-items-center rounded-md border ${bookmarked ? "border-blue-700 text-blue-700" : ""}`} aria-label={bookmarked ? "Remove bookmark" : "Bookmark project"}>
          {bookmarked ? <Check size={16} /> : <Bookmark size={16} />}
        </button>
        <button onClick={() => void share()} className="grid size-10 place-items-center rounded-md border" aria-label="Copy project link">
          <Copy size={16} />
        </button>
      </div>
      {notice && <p role="status" className="mt-3 text-xs text-neutral-600">{notice}</p>}
    </div>
  );
}
