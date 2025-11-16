import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import type { MacroAnalysisResult } from '../types';

// Fallback for environments where process.env is not defined.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// --- Agent 2: Schema Definition ---
const MACRO_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    macro_analysis: {
      type: Type.ARRAY,
      description: "An array of macro-economic analyses for each of the top 5 news items from the last 48 hours.",
      items: {
        type: Type.OBJECT,
        properties: {
          news_summary: {
            type: Type.STRING,
            description: "A concise summary of the financial news item."
          },
          identified_macro_factors: {
            type: Type.ARRAY,
            description: "A list of key macro-economic factors identified in the news (e.g., inflation, interest rates, GDP growth, unemployment).",
            items: {
              type: Type.STRING
            }
          },
          impact_analysis: {
            type: Type.STRING,
            description: "A detailed analysis of the potential impact of the news on the economy, markets, and specific sectors."
          }
        },
        required: ["news_summary", "identified_macro_factors", "impact_analysis"]
      }
    }
  },
  required: ["macro_analysis"]
};

// --- Agent 1: News Scout ---

/**
 * Agent 1's public-facing tool definition for A2A discovery.
 */
export const newsScoutTool: FunctionDeclaration = {
    name: "get_verified_financial_news",
    description: "Scours reputable sources (Bloomberg, Reuters, FT, WSJ) for the top 5 most significant financial news items from the past 48 hours, verifies them, and returns a ranked list as a string.",
    parameters: { type: Type.OBJECT, properties: {} }
};

/**
 * Executes the News Scout agent's logic.
 * @returns A string containing the verified news items.
 */
const runNewsScoutAgent = async (): Promise<string> => {
  const agent_prompt = `
    Find the top 5 most significant and verified financial news items from the past 48 hours.
    Rank them by relevance and impact on global markets.
    You MUST prioritize reputable sources: Bloomberg, Reuters, Financial Times (FT), and Wall Street Journal (WSJ).
    For each news item you find, you MUST perform a second, verification search to confirm its authenticity and key details.
    List the 5 verified news items clearly in ranked order. For each item, provide a brief summary and the primary source.
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: agent_prompt,
        config: {
          systemInstruction: "You are a 'News Scout' agent. Your sole purpose is to find and verify important financial news from trusted sources using your search tool.",
          tools: [{ googleSearch: {} }]
        }
    });
    return response.text;
  } catch (error) {
    console.error("Agent 1 (News Scout) failed:", error);
    throw new Error("News Scout agent failed to retrieve news.");
  }
};


// --- Agent 2: Macro Analyst ---

/**
 * Agent 2's public-facing tool definition for A2A discovery.
 */
export const macroAnalystTool: FunctionDeclaration = {
    name: "get_macro_economic_analysis",
    description: "Accepts a string of financial news items and performs a detailed macro-economic analysis, returning the output in a structured JSON format.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            "news_items_text": {
                type: Type.STRING,
                description: "A string containing the compiled news items to be analyzed."
            }
        },
        required: ["news_items_text"]
    }
};

/**
 * Executes the Macro Analyst agent's logic.
 * @param newsItemsText The string of news from the News Scout.
 * @returns A structured MacroAnalysisResult object.
 */
const runMacroAnalystAgent = async (newsItemsText: string): Promise<MacroAnalysisResult> => {
   const agent_prompt = `
    Analyze the following financial news items provided by the News Scout.
    For each item, provide a detailed macro-economic analysis.
    News Items:
    ---
    ${newsItemsText}
    ---
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: agent_prompt,
        config: {
          systemInstruction: "You are a 'Senior Macro Research Analyst'. Your task is to analyze financial news and output a structured JSON analysis based on the provided schema.",
          responseMimeType: "application/json",
          responseSchema: MACRO_ANALYSIS_SCHEMA
        }
    });

    const resultJson = response.text.trim();
    if (!resultJson) {
        throw new Error("Macro Analyst returned an empty response.");
    }
    return JSON.parse(resultJson);
  } catch (error) {
    console.error("Agent 2 (Macro Analyst) failed:", error);
    throw new Error("Macro Analyst agent failed to generate analysis. The model may have returned invalid JSON.");
  }
};


/**
 * Orchestrator function that manages the A2A workflow.
 * It calls the News Scout and then passes its output to the Macro Analyst.
 */
export const runAnalysisOrchestrator = async (
  setStatus: (message: string) => void
): Promise<MacroAnalysisResult | null> => {
  try {
    setStatus("Orchestrator: Calling News Scout Agent...");
    const newsText = await runNewsScoutAgent();

    if (!newsText || newsText.trim() === "") {
      throw new Error("News Scout returned no content.");
    }

    setStatus("Orchestrator: Calling Macro Analyst Agent...");
    const analysisResult = await runMacroAnalystAgent(newsText);
    
    return analysisResult;

  } catch(error) {
    console.error("Orchestrator failed:", error);
    // Re-throw the specific error from the agent to be displayed in the UI
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unknown error occurred during orchestration.");
  }
};
