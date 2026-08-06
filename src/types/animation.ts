export interface TiltOptions {
  maxRotation?: number; // In degrees, default max 6deg
  maxTranslation?: number; // In px, default max 4px
  speed?: number;
}

export interface CountUpOptions {
  duration?: number; // Default 1000ms
  start?: number;
  end: number;
}

export interface AnimationConfig {
  duration: number;
  delay?: number;
  ease?: string | number[];
}
