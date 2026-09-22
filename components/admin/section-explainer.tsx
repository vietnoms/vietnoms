import { ChevronDown, HelpCircle } from "lucide-react";
import { EXPLAINERS, type ExplainerKey } from "./section-explainers";

/**
 * Collapsible "How this works" panel. Uses native <details> so it works in
 * server and client components alike and needs no JS to toggle.
 */
export function SectionExplainer({
  id,
  className = "",
}: {
  id: ExplainerKey;
  className?: string;
}) {
  const explainer = EXPLAINERS[id];

  return (
    <details
      className={`group rounded-lg border border-gray-800 bg-surface/60 text-sm ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-gray-400 hover:text-white transition-colors [&::-webkit-details-marker]:hidden">
        <HelpCircle className="h-4 w-4 flex-shrink-0 text-brand-yellow" />
        <span className="font-medium">How this works</span>
        <ChevronDown className="ml-auto h-4 w-4 flex-shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-gray-800 px-4 py-4 text-gray-300">
        <p>{explainer.summary}</p>
        {explainer.sections.map((section) => (
          <div key={section.title}>
            <h3 className="font-semibold text-white">{section.title}</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-gray-400">
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
