
export interface MacroAnalysisItem {
  news_summary: string;
  identified_macro_factors: string[];
  impact_analysis: string;
}

export interface MacroAnalysisResult {
  macro_analysis: MacroAnalysisItem[];
}