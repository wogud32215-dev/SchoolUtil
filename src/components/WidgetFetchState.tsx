type LoadingProps = {
  label?: string;
};

export function WidgetLoading({ label = "불러오는 중…" }: LoadingProps) {
  return (
    <p className="widget-state-loading muted" role="status">
      {label}
    </p>
  );
}

type ErrorProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function WidgetFetchError({
  message,
  onRetry,
  retryLabel = "다시 불러오기",
}: ErrorProps) {
  return (
    <div className="widget-fetch-error" role="alert">
      <p className="widget-fetch-error-text">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}

type EmptyProps = {
  children: string;
};

export function WidgetEmpty({ children }: EmptyProps) {
  return <p className="widget-state-empty muted">{children}</p>;
}
