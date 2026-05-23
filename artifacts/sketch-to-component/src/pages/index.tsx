import { useCallback, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import logoUrl from "@/assets/logo.svg";

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-100 text-foreground dark:bg-background">
      <video
        ref={videoRef}
        src={HERO_VIDEO_URL}
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
        onTimeUpdate={onTimeUpdate}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
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
                <span className="hidden font-headline text-lg font-semibold text-foreground sm:inline">
                  Imagica
                </span>
              </div>
            </Link>

            <ThemeToggle />
          </nav>

          <div className="mt-[3px] h-px w-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
        </header>

        <section className="flex min-h-0 flex-1 flex-col overflow-visible">
          <div className="relative flex flex-1 items-center justify-center overflow-visible px-6 py-8 sm:px-8">
            <div className="relative z-10 flex w-full max-w-5xl flex-col items-center px-2 text-center">
              <h1 className="font-headline w-full font-normal leading-[1.02] tracking-[-0.024em] text-foreground text-[clamp(3.5rem,14vw,220px)] lg:text-[220px]">
                Imagica
              </h1>

              <p className="mt-[9px] max-w-lg text-lg leading-8 text-hero-sub opacity-80">
                Turn hand-drawn sketches into production-ready UI code
                <br />
                powered by Gemini Vision AI
              </p>

              <Button
                variant="heroSecondary"
                className="mt-[25px] rounded-full px-[29px] py-[24px] text-base"
                asChild
              >
                <Link href="/studio">Get Started</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
