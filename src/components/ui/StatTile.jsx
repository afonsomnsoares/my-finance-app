export default function StatTile({
  label, value, hint, tone, delta, deltaDirection,
  className = '', ...rest
}) {
  const valueClasses = [
    'ui-stat__value',
    tone ? `ui-stat__value--${tone}` : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`ui-stat ${className}`.trim()} {...rest}>
      <span className="ui-stat__label">{label}</span>
      <span className={valueClasses}>{value}</span>
      {delta !== undefined && delta !== null && (
        <span className={`ui-stat__delta ui-stat__delta--${deltaDirection || 'flat'}`}>
          {delta}
        </span>
      )}
      {hint && <span className="ui-stat__hint">{hint}</span>}
    </div>
  );
}
