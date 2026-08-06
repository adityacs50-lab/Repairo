export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export interface PartnerLogo {
  name: string;
  svgPath?: string;
  componentName?: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  mandatoryTag?: string; // e.g. "Zero AI hallucinations"
}

export interface PipelineStepItem {
  stepNumber: string;
  title: string;
  description: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  isMandatorySecurity?: boolean;
  bulletPoints?: string[];
}

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}
