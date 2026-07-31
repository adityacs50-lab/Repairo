import { Check } from "lucide-react";

export function PricingCard({
  tier,
  price,
  description,
  features,
  buttonText,
  highlighted = false,
}: {
  tier: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex flex-col p-[32px] rounded-2xl border transition-colors ${
        highlighted
          ? "border-accent-sunset bg-[rgba(255,122,23,0.03)]"
          : "border-hairline bg-transparent hover:border-body-mid"
      }`}
    >
      <div className="flex flex-col gap-[8px] mb-[32px]">
        <h3
          className={`font-mono text-[14px] uppercase tracking-[1.4px] ${
            highlighted ? "text-accent-sunset" : "text-ink"
          }`}
        >
          {tier}
        </h3>
        <div className="text-[32px] md:text-[40px] font-normal tracking-tight text-ink leading-none">
          {price}
        </div>
        <p className="text-[14px] text-body-mid leading-[1.5] h-[42px]">
          {description}
        </p>
      </div>

      <button
        className={`w-full py-[12px] rounded-full text-[14px] font-medium transition-transform active:scale-95 mb-[32px] ${
          highlighted
            ? "bg-primary text-on-primary hover:opacity-90"
            : "bg-transparent text-ink border border-hairline hover:border-body-mid"
        }`}
      >
        {buttonText}
      </button>

      <div className="flex flex-col gap-[16px]">
        {features.map((feature, i) => (
          <div key={i} className="flex items-start gap-[12px]">
            <Check className="w-[18px] h-[18px] text-primary shrink-0 mt-[2px]" />
            <span className="text-[14px] text-body leading-[1.5]">
              {feature}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PricingSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[24px]">
      <PricingCard
        tier="Free"
        price="$0"
        description="Let solo devs try it, feel the 'oh it actually caught something' moment."
        buttonText="Get started for free"
        features={[
          "1 repo connected",
          "Manual / On-Demand Scans",
          "Impact mapping & diffing",
          "No Auto-PRs (manual fix)",
          "Community support",
        ]}
      />
      <PricingCard
        tier="Pro"
        price="$29/mo"
        description="Bread-and-butter tier for indie devs, startups, and small agencies."
        buttonText="Start free trial"
        features={[
          "Up to 10 repos",
          "Scheduled daily scans",
          "Auto-generated fix PRs",
          "Safety scoring on PRs",
          "Email notifications",
        ]}
      />
      <PricingCard
        tier="Business"
        price="$99/mo"
        description="For established engineering teams managing multiple microservices."
        buttonText="Start free trial"
        highlighted={true}
        features={[
          "Up to 50 repos",
          "Real-time webhook scans",
          "Auto-merge for high safety",
          "Slack / Teams integration",
          "PR history & audit logs",
        ]}
      />
      <PricingCard
        tier="Enterprise"
        price="Custom"
        description="Sold, not self-served. For organizations with deep compliance needs."
        buttonText="Contact us"
        features={[
          "Unlimited repos",
          "SSO / SAML",
          "VPC / Self-hosted runner",
          "Custom SLAs",
          "Dedicated Slack channel",
        ]}
      />
    </div>
  );
}
