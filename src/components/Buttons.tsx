"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn" onClick={() => window.print()}>
      🖨 {label}
    </button>
  );
}

// A small delete button that asks before doing it.
export function DeleteButton({
  action,
  label = "Delete",
  confirmText = "Delete this entry?",
}: {
  action: () => Promise<void>;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      className="no-print inline"
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <button className="cursor-pointer text-xs text-red-700 underline">{label}</button>
    </form>
  );
}
