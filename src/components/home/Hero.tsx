import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { FlaskIcon, HeartIcon, HourglassIcon } from "@/components/ui/Icons";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { HERO_VIDEO_SRC } from "@/lib/media";

const DETAILS = [
  {
    Icon: FlaskIcon,
    title: "Small-batch craft",
    body: "Thoughtfully composed, beautifully balanced.",
  },
  {
    Icon: HourglassIcon,
    title: "Made to linger",
    body: "Rich perfume extracts for your everyday ritual.",
  },
  {
    Icon: HeartIcon,
    title: "Uniquely yours",
    body: "Find a fragrance that feels like you.",
  },
];

export function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(
    typeof document === "undefined" || !document.hidden,
  );
  const [failed, setFailed] = useState(false);
  const mobile = useMediaQuery("(max-width: 700px)");
  const [saveData, setSaveData] = useState(false);
  useEffect(
    () =>
      setSaveData(
        Boolean(
          (navigator as Navigator & { connection?: { saveData?: boolean } })
            .connection?.saveData,
        ),
      ),
    [],
  );
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver((entries) =>
      setVisible(entries.some((entry) => entry.isIntersecting)),
    );
    observer.observe(video);
    const update = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!visible || !pageVisible || reducedMotion || saveData)
      video.pause();
    else void video.play().catch(() => {});
  }, [visible, pageVisible, reducedMotion, saveData, mobile]);

  return (
    <section className="pastel-hero pastel-hero--film" aria-labelledby="hero-h">
      <div className="hero__bg" aria-hidden="true" />
      <video
        ref={videoRef}
        className="pastel-hero__film"
        src={
          !mounted || saveData || reducedMotion
            ? undefined
            : mobile
              ? "/videos/hero-bottles-mobile.mp4"
              : HERO_VIDEO_SRC
        }
        poster="/images/hero-poster.webp"
        autoPlay={!reducedMotion && !saveData}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        onError={() => setFailed(true)}
        style={failed ? { display: "none" } : undefined}
      />
      <div className="pastel-hero__film-shade" aria-hidden="true" />
      <div className="pastel-hero__content">
        <div className="pastel-hero__layout">
          <div className="pastel-hero__copy">
            <p className="pastel-hero__eyebrow">Scent. Soul. Signature.</p>
            <h1 id="hero-h">
              <span>Fragrance</span>
              <span>beyond words.</span>
            </h1>
            <p className="pastel-hero__description">
              Thoughtfully crafted perfume extracts to elevate your everyday.
              Discover a world of rich oud, soft florals, and fresh citrus.
            </p>
            <div className="pastel-hero__actions">
              <Link to="/collection" className="btn btn-primary">
                Shop the collection <span aria-hidden="true">→</span>
              </Link>
              <Link to="/pages/our-story" className="btn btn-secondary">
                Discover the house
              </Link>
            </div>
            <p className="pastel-hero__footnote">
              Composed slowly. Worn closely. Crafted in India.
            </p>
          </div>
          <div className="pastel-hero__film-space" aria-hidden="true" />
        </div>
        <ul className="pastel-hero__details">
          {DETAILS.map(({ Icon, title, body }, i) => (
            <li key={title}>
              <span className={`pastel-hero__icon pastel-hero__icon--${i}`}>
                <Icon width={28} height={28} />
              </span>
              <div>
                <h2>{title}</h2>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
