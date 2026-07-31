import { ReactNode } from "react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="flex flex-col bg-canvas-card border border-hairline rounded-sm p-[32px] h-full transition-colors hover:border-body-mid/30">
      {icon && (
        <div className="mb-[24px] text-accent-sunset">
          {icon}
        </div>
      )}
      <h3 className="text-[20px] font-normal leading-[1.4] text-ink mb-[12px] tracking-[-0.2px]">
        {title}
      </h3>
      <p className="text-[16px] text-body leading-[1.5]">
        {description}
      </p>
    </div>
  );
}





