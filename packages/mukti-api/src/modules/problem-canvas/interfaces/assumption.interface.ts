export interface AssumptionMapping {
  assumption: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  tested: boolean;
  riskScore?: number;
}

export interface ValidationData {
  confidence: number;
  newEvidence: string[];
}

export interface RiskMetrics {
  totalAssumptions: number;
  testedPercentage: number;
  highRiskPercentage: number;
  averageConfidence: number;
  riskTrend: 'improving' | 'stable' | 'concerning';
}
