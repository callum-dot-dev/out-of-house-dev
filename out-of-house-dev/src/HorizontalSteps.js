import React, { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_STEPS = [
  { num: '01', title: 'The call',     body: 'A 30-minute call to understand your business and what done looks like. No questionnaires. No forms. Real conversation.', accent: 'Day 0' },
  { num: '02', title: 'Scope and quote', body: 'Within 24 hours, often within the hour, you get a tight scope, a fixed price, and a delivery date you can plan around. No surprises later.', accent: 'Day 0 to 1' },
  { num: '03', title: 'We build',     body: 'Senior engineers shipping working slices daily. Direct Slack access. You see real progress every day. No black-box waiting.', accent: 'Day 1 to 14' },
  { num: '04', title: 'Live and iterate', body: 'We deploy it, hand it over (or host it for you), and stick around to evolve it as your needs change. Pause or keep going. Your call.', accent: 'Live' },
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
  const totalRef = useRef(0);
  const maxShiftRef = useRef(0);
  const rafRef = useRef(0);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mode, setMode] = useState('desktop'); // 'desktop' | 'mobile' | 'reduced'

  // Mode detection (mobile + reduced motion)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mqMobile = window.matchMedia('(max-width: 900px)');
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (mqReduce.matches) setMode('reduced');
      else if (mqMobile.matches) setMode('mobile');
      else setMode('desktop');
    };
    apply();
    mqMobile.addEventListener?.('change', apply);
    mqReduce.addEventListener?.('change', apply);
    return () => {
      mqMobile.removeEventListener?.('change', apply);
      mqReduce.removeEventListener?.('change', apply);
    };
  }, []);

  // Measurement, only on resize
  useEffect(() => {
    if (mode !== 'desktop' || typeof window === 'undefined') return undefined;
    const measure = () => {
      const wrapper = wrapperRef.current;
      const track = trackRef.current;
      if (!wrapper || !track) return;
      const headerEl = document.querySelector('.App-header');
      const h = headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 0;
      wrapper.style.setProperty('--hsteps-nav-offset', `${h > 0 ? h : 84}px`);

      const rect = wrapper.getBoundingClientRect();
      totalRef.current = rect.height - window.innerHeight;

      const vw = window.innerWidth;
      const lastCard = track.lastElementChild;
      if (lastCard) {
        const trailingGap = vw * 0.06;
        const lastRight = lastCard.offsetLeft + lastCard.offsetWidth;
        maxShiftRef.current = Math.max(0, lastRight + trailingGap - vw);
      } else {
        maxShiftRef.current = Math.max(0, track.scrollWidth - vw);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [mode]);

  const update = useCallback(() => {
    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    const progress = progressRef.current;
    if (!wrapper || !track) return;

    const rect = wrapper.getBoundingClientRect();
    const total = totalRef.current;
    if (total <= 0) {
      track.style.transform = 'translate3d(0,0,0)';
      if (progress) progress.style.transform = 'scaleX(0)';
      return;
    }

    const raw = -rect.top / total;
    const p = Math.max(0, Math.min(1, raw));
    const maxShift = maxShiftRef.current;
    track.style.transform = `translate3d(${(-p * maxShift).toFixed(2)}px, 0, 0)`;
    if (progress) progress.style.transform = `scaleX(${p.toFixed(4)})`;

    const idx = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
    if (idx !== activeIndexRef.current) {
      activeIndexRef.current = idx;
      setActiveIndex(idx);
    }
  }, [STEPS.length]);

  useEffect(() => {
    if (mode !== 'desktop') {
      if (trackRef.current) trackRef.current.style.transform = '';
      if (progressRef.current) progressRef.current.style.transform = '';
      return undefined;
    }
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        update();
      });
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [mode, update]);

  if (mode !== 'desktop') {
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
              <div key={s.num} className={`hstep-card ${i === activeIndex ? 'is-active' : ''}`}>
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
