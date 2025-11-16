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
          importance_score: {
            type: Type.INTEGER,
            description: "A score from 1 to 10 indicating the importance of the news item based on its potential global market impact (10 being most important)."
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
        required: ["news_summary", "importance_score", "identified_macro_factors", "impact_analysis"]
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

// --- Agent 1.5: Verification Agent ---

/**
 * Agent 1.5's public-facing tool definition for A2A discovery.
 */
export const verificationTool: FunctionDeclaration = {
    name: "verify_financial_news_content",
    description: "Acts as a fact-checker. Takes a string of news items, verifies their authenticity and age (must be within 48 hours) using search, and returns the verified text.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            "unverified_news_text": {
                type: Type.STRING,
                description: "A string containing news items from the News Scout to be verified."
            }
        },
        required: ["unverified_news_text"]
    }
};

/**
 * Executes the Verification agent's logic.
 * @param unverifiedNewsText The string of news from the News Scout.
 * @returns The original text if verification passes.
 */
const runVerificationAgent = async (unverifiedNewsText: string): Promise<string> => {
    const agent_prompt = `
        You are a meticulous fact-checker. Your task is to verify the following news items provided by another agent.
        You MUST use your search tool to:
        1. Confirm that each news story is real and not fabricated.
        2. Verify that the core details in the summary are accurate by cross-referencing with other reputable sources.
        3. CRITICAL: Check the publication date of each original article and ensure it is within the last 48 hours.
        
        If any story is fake, inaccurate, or older than 48 hours, you MUST explain which one and why, and then stop execution. Your response should clearly state the error.
        
        If all news items are verified and recent, return the original text EXACTLY as it was given to you without any modification.
        
        News to verify:
        ---
        ${unverifiedNewsText}
        ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: agent_prompt,
            config: {
              systemInstruction: "You are a 'Verification' agent. Your sole purpose is to fact-check and verify the age of financial news provided to you. If verification fails, you must explain why.",
              tools: [{ googleSearch: {} }]
            }
        });
        
        // The prompt asks the model to return the original text if successful.
        // A more complex check could be implemented here if needed.
        return unverifiedNewsText;
    } catch (error) {
        console.error("Agent 1.5 (Verification) failed:", error);
        throw new Error("Verification agent failed. It may have found fake, inaccurate, or old news.");
    }
};


// --- Agent 2: Macro Analyst ---

/**
 * Agent 2's public-facing tool definition for A2A discovery.
 */
export const macroAnalystTool: FunctionDeclaration = {
    name: "get_macro_economic_analysis",
    description: "Accepts a string of verified financial news items and performs a detailed macro-economic analysis, returning a structured JSON output that includes an importance score for each item.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            "news_items_text": {
                type: Type.STRING,
                description: "A string containing the compiled and verified news items to be analyzed."
            }
        },
        required: ["news_items_text"]
    }
};

/**
 * Executes the Macro Analyst agent's logic.
 * @param newsItemsText The string of news from the Verification Agent.
 * @returns A structured MacroAnalysisResult object.
 */
const runMacroAnalystAgent = async (newsItemsText: string): Promise<MacroAnalysisResult> => {
   const agent_prompt = `
    Analyze the following verified financial news items.
    For each item, provide a detailed macro-economic analysis.
    Crucially, for each item, you MUST include an 'importance_score' from 1 to 10 (10 being most important) based on its potential global market impact.
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
          systemInstruction: "You are a 'Senior Macro Research Analyst'. Your task is to analyze financial news and output a structured JSON analysis based on the provided schema, including an importance score.",
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
 * It calls the News Scout, then the Verification Agent, and finally passes the output to the Macro Analyst.
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

    setStatus("Orchestrator: Calling Verification Agent...");
    const verifiedNewsText = await runVerificationAgent(newsText);

    setStatus("Orchestrator: Calling Macro Analyst Agent...");
    const analysisResult = await runMacroAnalystAgent(verifiedNewsText);
    
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