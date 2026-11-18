export default function MetricCard({
  icon, label, value, badge, badgeTone = 'positive', hint, accent = 'blue', children,
}) {
  return (
    <article className={`metric-card metric-card--${accent}`}>
      <div className="metric-card__top">
        <span className="metric-card__icon" aria-hidden="true">{icon}</span>
        <span className="metric-card__label">{label}</span>
        {badge && (
          <span className={`metric-card__badge metric-card__badge--${badgeTone}`}>{badge}</span>
        )}
      </div>

      <div className="metric-card__value">{value}</div>
      {hint && <div className="metric-card__hint">{hint}</div>}
      {children && <div className="metric-card__chart">{children}</div>}
    </article>
  );
}

export function Sparkline({ values = [], color = 'var(--accent)' }) {
  const width = 240;
  const height = 46;
  const pad = 4;
  const data = values.length > 1 ? values : [0, 0];
  const min = Math.min(...data);
  const max = Math.max(...data);

  const range = max - min || 1;
  const step = (width - pad * 2) / (data.length - 1);
  const points = data
    .map((value, i) => `${pad + i * step},${height - pad - ((value - min) / range) * (height - pad * 2)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function MiniBars({ values = [], color = 'var(--accent)' }) {
  const data = values.length > 0 ? values : [0];
  const max = Math.max(...data, 1);

  return (
    <div className="mini-bars" aria-hidden="true">
      {data.map((value, i) => (
        <span
          key={i}
          style={{
            height: `${Math.max(10, (value / max) * 100)}%`,
            background: color,
            opacity: 0.35 + (i / data.length) * 0.65,
          }}
        />
      ))}
    </div>
  );
}
