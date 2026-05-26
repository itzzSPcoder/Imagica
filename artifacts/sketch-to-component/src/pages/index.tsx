import { useCallback, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/logo.svg";
import { useAuth } from "@clerk/clerk-react";

const HERO_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4";

/** Avoid a visible flash when the video loops by seeking before the last frame. */
function useSeamlessVideoLoop() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    if (video.duration - video.currentTime < 0.08) {
      video.currentTime = 0.05;
    }
  }, []);

  return { videoRef, onTimeUpdate };
}

export default function Index() {
  const { videoRef, onTimeUpdate } = useSeamlessVideoLoop();
  const { isSignedIn } = useAuth();

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-neutral-950 text-zinc-100">
      <video
        ref={videoRef}
        src={HERO_VIDEO_URL}
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
        onTimeUpdate={onTimeUpdate}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60"
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-6 py-5 sm:px-8">
          <nav className="flex items-center justify-between gap-4">
            <Link href="/" className="shrink-0">
              <div className="flex items-center gap-2.5">
                <img
                  src={logoUrl}
                  alt="Imagica"
                  className="h-8 w-8 object-contain bg-transparent"
                />
                <span className="hidden font-headline text-lg font-semibold text-zinc-100 sm:inline">
                  Imagica
                </span>
              </div>
            </Link>

            {/* ThemeToggle is intentionally removed from the landing page as it is now exclusively night/dark mode. */}
            <div className="w-9 h-9" />
          </nav>

          <div className="mt-[3px] h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        </header>

        <section className="flex min-h-0 flex-1 flex-col overflow-visible">
          <div className="relative flex flex-1 items-center justify-center overflow-visible px-6 py-8 sm:px-8">
            <div className="relative z-10 flex w-full max-w-5xl flex-col items-center px-2 text-center">
              <h1 className="font-headline w-full font-normal leading-[1.02] tracking-[-0.024em] text-zinc-100 text-[clamp(3.5rem,14vw,220px)] lg:text-[220px]">
                Imagica
              </h1>

              <p className="mt-[9px] max-w-lg text-lg leading-8 text-zinc-400 opacity-90">
                Turn hand-drawn sketches into production-ready UI code
                <br />
                powered by Gemini Vision AI
              </p>

              <Button
                variant="heroSecondary"
                className="mt-[25px] rounded-full px-[29px] py-[24px] text-base bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all shadow-xl backdrop-blur-sm cursor-pointer select-none"
                asChild
              >
                <Link href={isSignedIn ? "/studio" : "/sign-in"}>Get Started</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
