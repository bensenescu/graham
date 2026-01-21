import { createFileRoute } from "@tanstack/react-router";
import { NewPageOptions } from "@/client/components/NewPageOptions";

export const Route = createFileRoute("/new")({
  component: NewPage,
});

function NewPage() {
  return (
    <div className="h-full overflow-auto">
      <div className="px-4 pb-24 md:pt-4 md:pb-4 max-w-4xl mx-auto">
        {/* Header - desktop only */}
        <div className="hidden md:block py-4">
          <h1 className="text-2xl font-bold text-base-content">New Page</h1>
        </div>

        <div className="py-4 md:py-0">
          <NewPageOptions />
        </div>
      </div>
    </div>
  );
}
