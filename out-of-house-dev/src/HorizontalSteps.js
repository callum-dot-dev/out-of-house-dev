import React, { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_STEPS = [
  {
    num: '01',
    title: 'The Call',
    body: 'We hop on a 30-minute call to understand your business, the problem, and what "done" looks like. No questionnaires, no forms — just a real conversation.',
    accent: 'Day 0',
  },
  {
    num: '02',
    title: 'Scope & Quote',
    body: 'Within 24 hours, often within the hour, you get a tight scope, a fixed price, and a delivery date you can plan around. No surprises later.',
    accent: 'Day 0–1',
  },
  {
    num: '03',
    title: 'We Build',
    body: 'Senior engineers shipping working slices daily. Direct Slack access to the team. You see real progress every day — no black-box waiting.',
    accent: 'Day 1–14',
  },
  {
    num: '04',
    title: 'Live & Iterate',
    body: 'We deploy it, hand it over (or host it for you), and stick around to evolve it as your needs change. Pause or keep going — your call.',
    accent: 'Live',
  },
];

const DEFAULT_HEADER = {
  eyebrow: 'How we work',
  title: (<>A call. A scope. <span className="accent">Working software</span>, fast.</>),
};

const HorizontalSteps = ({ id = 'workflow', steps = DEFAULT_STEPS, header = DEFAULT_HEADER }) => {
  const STEPS = steps;
  const wrapperRef = useRef(null);
  const trackRef = useRef(null);
  const progressRef = useRef(null);
  const rafRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile / reduced-motion detection
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 900px)');
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener?.('change', handler);
    mq.addListener?.(handler);
    return () => {
      mq.removeEventListener?.('change', handler);
      mq.removeListener?.(handler);
    };
  }, []);

  // Measure the fixed marketing header's real on-screen height and surface
  // it as `--hsteps-nav-offset` on the wrapper. Without this the sticky
  // stage docks under the header and the section reads as half-broken.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;
    const measure = () => {
      const header = document.querySelector('.App-header');
      const h = header ? Math.round(header.getBoundingClientRect().height) : 0;
      wrapper.style.setProperty('--hsteps-nav-offset', `${h > 0 ? h : 84}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // rAF-throttled scroll handler. Maps section scroll-progress (0..1) onto
  // the horizontal distance the track needs to travel. End anchor sits the
  // last card's right edge ~6vw inside the viewport's right edge so it
  // reads as the closing card, not pinned against the edge.
  const update = useCallback(() => {
    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    const progress = progressRef.current;
    if (!wrapper || !track) return;

    const rect = wrapper.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = rect.height - vh;
    if (total <= 0) {
      track.style.transform = 'translate3d(0,0,0)';
      if (progress) progress.style.transform = 'scaleX(0)';
      setActiveIndex(0);
      return;
    }

    const raw = (-rect.top) / total;
    const p = Math.max(0, Math.min(1, raw));

    const vw = window.innerWidth;
    const lastCard = track.lastElementChild;
    let maxShift;
    if (lastCard) {
      const trailingGap = vw * 0.06;
      const lastRight = lastCard.offsetLeft + lastCard.offsetWidth;
      maxShift = Math.max(0, lastRight + trailingGap - vw);
    } else {
      maxShift = Math.max(0, track.scrollWidth - vw);
    }

    track.style.transform = `translate3d(${(-p * maxShift).toFixed(2)}px, 0, 0)`;
    if (progress) progress.style.transform = `scaleX(${p.toFixed(4)})`;

    const idx = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
    setActiveIndex(idx);
  }, []);

  useEffect(() => {
    if (isMobile) {
      // Clear any leftover transform from desktop.
      if (trackRef.current) trackRef.current.style.transform = '';
      if (progressRef.current) progressRef.current.style.transform = '';
      return undefined;
    }

    const onScrollOrResize = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        update();
      });
    };

    update();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [isMobile, update]);

  if (isMobile) {
    return (
      <section id={id} className="hsteps-wrapper hsteps-mobile">
        <div className="hsteps-mobile-inner">
          <div className="eyebrow">{header.eyebrow}</div>
          <h2 className="section-title">{header.title}</h2>
          <div className="hsteps-mobile-list">
            {STEPS.map((s) => (
              <div key={s.num} className="hstep-card">
                <div className="hstep-meta">
                  <span className="hstep-num">{s.num}</span>
                  <span className="hstep-accent">{s.accent}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={id} className="hsteps-wrapper" ref={wrapperRef}>
      <div className="hsteps-pin">
        <div className="hsteps-header">
          <div>
            <div className="eyebrow">{header.eyebrow}</div>
            <h2 className="section-title">{header.title}</h2>
          </div>
          <div className="hsteps-counter">
            <span className="hsteps-counter-active">{String(activeIndex + 1).padStart(2, '0')}</span>
            <span className="hsteps-counter-sep">/</span>
            <span className="hsteps-counter-total">{String(STEPS.length).padStart(2, '0')}</span>
          </div>
        </div>

        <div className="hsteps-track-viewport">
          <div className="hsteps-track" ref={trackRef}>
            {STEPS.map((s, i) => (
              <div
                key={s.num}
                className={`hstep-card ${i === activeIndex ? 'is-active' : ''}`}
              >
                <div className="hstep-meta">
                  <span className="hstep-num">{s.num}</span>
                  <span className="hstep-accent">{s.accent}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="hsteps-progress">
          <div className="hsteps-progress-bar" ref={progressRef} />
        </div>
      </div>
    </section>
  );
};

export default HorizontalSteps;
