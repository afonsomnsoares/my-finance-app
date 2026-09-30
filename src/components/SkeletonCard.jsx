export default function SkeletonCard({ width, height, style }) {
  return (
    <div className="skeleton-card" style={{ width: width || '100%', height: height || '100%', ...style }}>
      <div className="skeleton-shimmer" />
    </div>
  );
}
