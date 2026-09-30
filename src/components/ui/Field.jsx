import { useId } from 'react';

export default function Field({
  label, hint, error, id, as = 'input',
  className = '', children, ...rest
}) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const Control = as;

  return (
    <div className={`ui-field ${error ? 'ui-field--invalid' : ''} ${className}`.trim()}>
      {label && <label className="ui-field__label" htmlFor={controlId}>{label}</label>}
      <Control
        id={controlId}
        className="ui-field__control"
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {children}
      </Control>
      {hint && <span className="ui-field__hint" id={hintId}>{hint}</span>}
      {error && <span className="ui-field__error" id={errorId} role="alert">{error}</span>}
    </div>
  );
}
