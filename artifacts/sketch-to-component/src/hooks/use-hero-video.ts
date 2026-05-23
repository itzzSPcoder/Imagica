import { useEffect, useRef } from "react";

const FADE_DURATION = 0.5;
const REPLAY_DELAY_MS = 100;

export function useHeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.style.opacity = "0";

    let rafId = 0;
    let replayTimeout: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      const duration = video.duration;
      if (duration && Number.isFinite(duration) && !video.paused && !video.ended) {
        const t = video.currentTime;
        if (t < FADE_DURATION) {
          video.style.opacity = String(Math.min(1, t / FADE_DURATION));
        } else if (t > duration - FADE_DURATION) {
          video.style.opacity = String(Math.max(0, (duration - t) / FADE_DURATION));
        } else {
          video.style.opacity = "1";
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    const handleEnded = () => {
      video.style.opacity = "0";
      replayTimeout = setTimeout(() => {
        video.currentTime = 0;
        void video.play();
      }, REPLAY_DELAY_MS);
    };

    const handlePlay = () => {
      video.style.opacity = "0";
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("play", handlePlay);
    rafId = requestAnimationFrame(tick);
    void video.play().catch(() => {});

    return () => {
      cancelAnimationFrame(rafId);
      if (replayTimeout) clearTimeout(replayTimeout);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("play", handlePlay);
    };
  }, []);

  return videoRef;
}
