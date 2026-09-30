export default function Card({
  title, subtitle, action, variant, interactive = false, raised = false,
  className = '', children, ...rest
}) {
  const classes = [
    'ui-card',
    variant ? `ui-card--${variant}` : '',
    interactive ? 'ui-card--interactive' : '',
    raised ? 'ui-card--raised' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...rest}>
      {(title || action) && (
        <div className="ui-card__header">
          <div>
            {title && <h3 className="ui-card__title">{title}</h3>}
            {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
