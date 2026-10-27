export function Spinner({ message = "Loading...", className = "" }) {
  return (
    <div className={`spinner-container ${className}`} role="status">
      <span className="material-symbols-outlined spin-icon" aria-hidden="true">
        sync
      </span>
      {message && <span className="spinner-message">{message}</span>}
      <span className="visually-hidden">{message}</span>
    </div>
  );
}
