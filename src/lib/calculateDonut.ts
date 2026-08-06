export interface DonutSegment {
  id: string;
  label: string;
  count: number;
  color: string;
  percentage: number;
  strokeDasharray: string;
  strokeDashoffset: number;
}

/**
 * Calculates SVG stroke properties for a donut chart
 * radius default 60, circumference = 2 * PI * 60 = 376.99
 */
export function calculateDonutSegments(
  data: { label: string; count: number; color: string; id: string }[],
  radius: number = 60
): DonutSegment[] {
  const total = data.reduce((acc, curr) => acc + curr.count, 0);
  if (total === 0) return [];

  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return data.map((item) => {
    const percentage = (item.count / total) * 100;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);

    accumulatedPercent += percentage;

    return {
      ...item,
      percentage,
      strokeDasharray,
      strokeDashoffset,
    };
  });
}
