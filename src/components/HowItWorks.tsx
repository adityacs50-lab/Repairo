export function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Detect drift",
      description: "We diff the OpenAPI specs of your dependencies every time they release. When a breaking change is found, we catch it instantly.",
    },
    {
      step: "02",
      title: "Map impact",
      description: "Repairo scans your codebase. We find exactly where the API was called, what types changed, and trace the full impact.",
    },
    {
      step: "03",
      title: "Apply patch",
      description: "We generate the necessary code changes and open a clean, reviewable Pull Request. Providers announce, Repairo patches.",
    }
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col bg-canvas-card border border-hairline rounded-sm p-[24px]">
            <div className="font-mono text-[12px] uppercase tracking-[1.4px] text-mute mb-[16px]">
              Phase {step.step}
            </div>
            <h3 className="text-[18px] font-normal leading-[1.4] text-ink mb-[8px] tracking-[-0.2px]">
              {step.title}
            </h3>
            <p className="text-[14px] text-body leading-[1.5]">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
