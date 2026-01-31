interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({
  size = "sm",
  className,
}: LoadingSpinnerProps) {
  const sizeClass = `loading-${size}`;
  const classes = ["loading", "loading-spinner", sizeClass, className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes} />;
}
