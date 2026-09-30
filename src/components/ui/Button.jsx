export default function Button({
  variant = 'primary', size, block = false, as, icon,
  className = '', children, ...rest
}) {
  const classes = [
    'ui-btn',
    `ui-btn--${variant}`,
    size ? `ui-btn--${size}` : '',
    block ? 'ui-btn--block' : '',
    className,
  ].filter(Boolean).join(' ');

  const Tag = as || 'button';
  // Um <button> sem type dentro de um <form> submete-o sem querer.
  const typeProp = Tag === 'button' && rest.type === undefined ? { type: 'button' } : {};

  return (
    <Tag className={classes} {...typeProp} {...rest}>
      {icon}
      {children}
    </Tag>
  );
}
