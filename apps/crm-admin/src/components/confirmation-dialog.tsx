import { Button } from "@social-crm/ui";
import "./confirmation-dialog.css";

type ConfirmationDetail = {
  label: string;
  value: string;
};

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  details?: ConfirmationDetail[];
  warning?: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationDialog(props: ConfirmationDialogProps) {
  if (!props.open) return null;

  return (
    <div className="confirmation-dialog-backdrop" role="presentation" onMouseDown={props.onCancel}>
      <section
        className="confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirmation-dialog__body">
          <div className="confirmation-dialog__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 4.3 2.8 17.1A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.9L13.7 4.3a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <h2 id="confirmation-dialog-title" className="confirmation-dialog__title">{props.title}</h2>
          <p id="confirmation-dialog-description" className="confirmation-dialog__description">{props.description}</p>
          {props.details?.length ? (
            <div className="confirmation-dialog__details">
              {props.details.map((detail) => (
                <div key={detail.label} className="confirmation-dialog__detail">
                  <span className="confirmation-dialog__detail-label">{detail.label}</span>
                  <span className="confirmation-dialog__detail-value">{detail.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          {props.warning ? <div className="confirmation-dialog__warning">{props.warning}</div> : null}
        </div>
        <footer className="confirmation-dialog__actions">
          <Button variant="secondary" onClick={props.onCancel} disabled={props.isPending}>
            {props.cancelLabel}
          </Button>
          <Button variant="danger" onClick={props.onConfirm} disabled={props.isPending}>
            {props.isPending && props.pendingLabel ? props.pendingLabel : props.confirmLabel}
          </Button>
        </footer>
      </section>
    </div>
  );
}
