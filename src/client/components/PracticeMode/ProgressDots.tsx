interface ProgressDotsProps {
  total: number;
  current: number;
  answeredIndexes?: number[];
}

export function ProgressDots({
  total,
  current,
  answeredIndexes = [],
}: ProgressDotsProps) {
  // For large numbers, show a condensed version
  const showCondensed = total > 12;

  if (showCondensed) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {/* Show first few dots */}
          {Array.from({ length: Math.min(3, total) }).map((_, i) => (
            <Dot
              key={i}
              status={getDotStatus(i, current, answeredIndexes)}
              isCurrent={i === current}
            />
          ))}

          {/* Ellipsis if needed */}
          {current > 4 && (
            <span className="text-base-content/40 text-xs px-1">...</span>
          )}

          {/* Dots around current position */}
          {current > 3 &&
            current < total - 3 &&
            Array.from({ length: 3 }).map((_, i) => {
              const index = current - 1 + i;
              return (
                <Dot
                  key={`mid-${index}`}
                  status={getDotStatus(index, current, answeredIndexes)}
                  isCurrent={index === current}
                />
              );
            })}

          {/* Ellipsis if needed */}
          {current < total - 4 && (
            <span className="text-base-content/40 text-xs px-1">...</span>
          )}

          {/* Show last few dots */}
          {Array.from({ length: Math.min(3, total) }).map((_, i) => {
            const index = total - 3 + i;
            if (index <= current + 1 && current > 3) return null;
            return (
              <Dot
                key={`end-${index}`}
                status={getDotStatus(index, current, answeredIndexes)}
                isCurrent={index === current}
              />
            );
          })}
        </div>

        <span className="text-sm text-base-content/60 tabular-nums">
          {current + 1} / {total}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <Dot
          key={i}
          status={getDotStatus(i, current, answeredIndexes)}
          isCurrent={i === current}
        />
      ))}
    </div>
  );
}

type DotStatus = "completed" | "current" | "upcoming";

function getDotStatus(
  index: number,
  current: number,
  answeredIndexes: number[],
): DotStatus {
  if (answeredIndexes.includes(index)) return "completed";
  if (index === current) return "current";
  return "upcoming";
}

function Dot({ status, isCurrent }: { status: DotStatus; isCurrent: boolean }) {
  const baseClasses = "rounded-full transition-all duration-200";

  if (isCurrent) {
    return (
      <div
        className={`${baseClasses} w-3 h-3 bg-primary ring-2 ring-primary/30 ring-offset-1 ring-offset-base-100`}
      />
    );
  }

  if (status === "completed") {
    return <div className={`${baseClasses} w-2.5 h-2.5 bg-success`} />;
  }

  return <div className={`${baseClasses} w-2 h-2 bg-base-300`} />;
}
