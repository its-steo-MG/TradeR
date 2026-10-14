"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Users, Heart, CornerUpLeft, ImagePlus } from "lucide-react";

interface Sender {
  username?: string;
  name?: string;
  avatar_url?: string | null;
  country?: string;
  country_flag?: string;
  is_premium?: boolean;
  profit_fake?: number | string;
}

interface FeedPost {
  id: string;
  sender: Sender | null;
  sender_type: "real" | "fake" | "unknown";
  text: string;
  image?: string | null;
  content_type?: string;
  likes?: number;
  time_ago?: string;
  is_ai_generated?: boolean;
}

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export function TraderPulseWidget() {
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [online, setOnline] = useState(0);
  const [text, setText] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [myName, setMyName] = useState("");
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const lastTap = useRef<{ id: string; time: number }>({ id: "", time: 0 });
  const swipeStart = useRef<{ x: number; y: number; id: string } | null>(null);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem("access_token"));
    try {
      const raw = localStorage.getItem("user_session");
      if (raw) setMyName(JSON.parse(raw)?.username || "");
    } catch {}
  }, [open]);

  useEffect(() => {
    const token = localStorage.getItem("access_token")?.replace(/^"|"$/g, "");
    const url = token
      ? `${WS_BASE}/ws/traderpulse/?token=${encodeURIComponent(token)}`
      : `${WS_BASE}/ws/traderpulse/`;

    let stopped = false;
    const connect = () => {
      if (stopped) return;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "feed_history" && Array.isArray(data.posts)) {
            setPosts([...data.posts].reverse());
            return;
          }
          if (data.type === "online_update") {
            setOnline(Number(data.online) || 0);
            return;
          }
          if (data.type === "like_update") {
            setPosts((prev) =>
              prev.map((p) => (String(p.id) === String(data.post_id) ? { ...p, likes: data.likes } : p))
            );
            return;
          }
          if (data.type === "error") {
            setError(data.message || "Something went wrong");
            return;
          }
          if (data.id && (data.text || data.image)) {
            setPosts((prev) => [...prev, data as FeedPost].slice(-100));
            if (!open) setUnread((n) => n + 1);
          }
        } catch {}
      };

      ws.onclose = () => {
        if (!stopped) setTimeout(connect, 4000);
      };
    };

    connect();
    return () => {
      stopped = true;
      wsRef.current?.close();
    };
  }, [open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [posts, open]);

  const send = () => {
    const content = text.trim();
    if ((!content && !imagePreview) || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        action: "post",
        content,
        image: imagePreview || "",
        reply_to: replyTo || "",
      })
    );
    setText("");
    setImagePreview(null);
    setReplyTo(null);
    setError("");
  };

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only images are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(typeof reader.result === "string" ? reader.result : null);
      setError("");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const like = (postId: string) => {
    if (!loggedIn) {
      setError("Log in to like");
      return;
    }
    if (liked[postId]) return;
    setLiked((prev) => ({ ...prev, [postId]: true }));
    wsRef.current?.send(JSON.stringify({ action: "like", post_id: postId }));
  };

  const onTouchStart = (e: React.TouchEvent, id: string) => {
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY, id };
  };

  const onTouchEnd = (e: React.TouchEvent, username: string) => {
    if (!swipeStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeStart.current.x;
    const dy = t.clientY - swipeStart.current.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      setReplyTo(username);
    }
    swipeStart.current = null;
  };

  const onTap = (postId: string) => {
    const now = Date.now();
    if (lastTap.current.id === postId && now - lastTap.current.time < 320) {
      like(postId);
      lastTap.current = { id: "", time: 0 };
      return;
    }
    lastTap.current = { id: postId, time: now };
  };

  const nameOf = (p: FeedPost) => p.sender?.username || p.sender?.name || "Trader";
  const isMine = (p: FeedPost) => !!myName && nameOf(p).toLowerCase() === myName.toLowerCase();

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-[99998] flex h-[70vh] max-h-[520px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80">
          <div className="flex items-center justify-between border-b border-white/30 px-4 py-3 dark:border-white/10">
            <div>
              <p className="text-sm font-bold">TraderPulse</p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3" /> {online.toLocaleString()} online
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/40 dark:hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex flex-1 flex-col space-y-2 overflow-y-auto p-3">
            {posts.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">No posts yet</p>
            )}
            {posts.map((p) => {
              const mine = isMine(p);
              const username = nameOf(p);
              return (
                <div key={p.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                  <div
                    onDoubleClick={() => like(String(p.id))}
                    onTouchStart={(e) => onTouchStart(e, String(p.id))}
                    onTouchEnd={(e) => onTouchEnd(e, username)}
                    onClick={() => onTap(String(p.id))}
                    className={`drop-on-top relative !flex max-w-[85%] cursor-pointer select-none flex-col overflow-hidden rounded-2xl border px-3 py-2.5 text-sm backdrop-blur-md ${
                      mine
                        ? "border-pink-300/60 bg-pink-500/20 text-pink-950 dark:border-pink-400/30 dark:bg-pink-500/25 dark:text-white"
                        : "border-white/70 bg-white/50 text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    }`}
                  >
                    <div className="relative z-[1] mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-semibold">
                        {mine ? "You" : `${p.sender?.country_flag || ""} @${username}`}
                        {!mine && p.sender?.is_premium && (
                          <span className="ml-1 text-[10px] text-amber-500">PRO</span>
                        )}
                      </span>
                      <span className="shrink-0 text-[10px] opacity-70">{p.time_ago || ""}</span>
                    </div>
                    <p className="relative z-[1] whitespace-pre-wrap leading-snug">{p.text}</p>
                    {p.image && (
                      <img src={p.image} alt="" className="relative z-[1] mt-2 max-h-40 w-full rounded-xl object-cover" />
                    )}
                    <p className="relative z-[1] mt-1 flex items-center justify-between gap-2 text-[11px] opacity-70">
                      <span className="flex items-center gap-1">
                        <Heart className={`h-3 w-3 ${liked[String(p.id)] ? "fill-red-500 text-red-500" : ""}`} />
                        {p.likes || 0}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyTo(username);
                        }}
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-white/30 dark:hover:bg-white/10"
                      >
                        <CornerUpLeft className="h-3 w-3" /> Reply
                      </button>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {error && <p className="px-3 text-xs text-red-500">{error}</p>}

          <div className="border-t border-white/30 p-3 dark:border-white/10">
            {replyTo && (
              <div className="mb-2 flex items-center justify-between rounded-xl bg-pink-500/10 px-3 py-1.5 text-xs">
                <span className="flex items-center gap-1">
                  <CornerUpLeft className="h-3 w-3" /> Replying to @{replyTo}
                </span>
                <button onClick={() => setReplyTo(null)} className="opacity-70 hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {loggedIn ? (
              <div className="space-y-2">
                {imagePreview && (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="preview" className="h-16 w-16 rounded-xl object-cover" />
                    <button
                      onClick={() => setImagePreview(null)}
                      className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-white/60 dark:border-white/10 dark:bg-white/5"
                    aria-label="Attach image"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder={replyTo ? `Reply to @${replyTo}` : "Share a thought..."}
                    className="h-10 flex-1 rounded-xl border border-white/40 bg-white/60 px-3 text-sm dark:border-white/10 dark:bg-white/5"
                  />
                  <button
                    onClick={send}
                    disabled={!text.trim() && !imagePreview}
                    className="drop-on-top relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-pink-600 text-white disabled:opacity-50"
                  >
                    <Send className="relative z-[1] h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">Log in to post</p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[99998] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/30"
        aria-label="Open TraderPulse"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </>
  );
}
