export function EmptyState({
  icon = "movie",
  title = "No items found",
  description = "",
  actionLabel,
  onAction,
}) {
  return (
    <div className="empty-state">
      <span className="material-symbols-outlined empty-icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actionLabel && onAction && (
        <button className="secondary-button" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
