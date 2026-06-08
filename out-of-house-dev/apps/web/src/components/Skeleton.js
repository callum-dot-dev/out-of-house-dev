import React from 'react';

export const Skeleton = ({ w = '100%', h = 16, r = 6, style, className = '', ...rest }) => (
  <span
    className={`skeleton ${className}`}
    style={{
      display: 'inline-block',
      width: typeof w === 'number' ? `${w}px` : w,
      height: typeof h === 'number' ? `${h}px` : h,
      borderRadius: r,
      ...style,
    }}
    aria-hidden="true"
    {...rest}
  />
);

export const SkeletonBlock = ({ rows = 3, gap = 10, lastWidth = '70%' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap }}>
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} h={14} w={i === rows - 1 ? lastWidth : '100%'} />
    ))}
  </div>
);

export const SkeletonCard = ({ headerHeight = 22, lines = 3, height = 180 }) => (
  <div className="skeleton-card" style={{ minHeight: height }}>
    <Skeleton h={headerHeight} w="40%" />
    <div style={{ height: 16 }} />
    <SkeletonBlock rows={lines} />
  </div>
);

export const SkeletonGrid = ({ count = 3 }) => (
  <div className="project-grid">
    {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
  </div>
);

export const SkeletonPage = ({ title = 60, lead = 80, sections = 2 }) => (
  <div className="app-page">
    <div className="app-page-head">
      <div style={{ flex: 1 }}>
        <Skeleton h={12} w={120} />
        <div style={{ height: 14 }} />
        <Skeleton h={36} w={`${title}%`} />
        <div style={{ height: 12 }} />
        <Skeleton h={14} w={`${lead}%`} />
      </div>
    </div>
    {Array.from({ length: sections }).map((_, i) => (
      <section className="app-section" key={i}>
        <Skeleton h={20} w={160} />
        <div style={{ height: 18 }} />
        <SkeletonGrid count={3} />
      </section>
    ))}
  </div>
);

export default Skeleton;
