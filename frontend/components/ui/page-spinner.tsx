export function PageSpinner({ label = "Loading securely…" }: { label?: string }) {
  return <div className="page-spinner" role="status"><span className="spinner" />{label}</div>;
}
