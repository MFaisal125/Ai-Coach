import { supabase } from "@/lib/supabase";
import { inngest } from "./client";
import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const generateIndustryInsights = inngest.createFunction(
  { name: "Generate Industry Insights" },
  { cron: "0 0 * * 0" }, // Run every Sunday at midnight
  async ({ event, step }) => {
    const industries = await step.run("Fetch industries", async () => {
      const { data, error } = await supabase
        .from("IndustryInsight")
        .select("industry");
      if (error) throw error;
      return data || [];
    });

    for (const { industry } of industries) {
      const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negative",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }
          
          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          Include at least 5 common roles for salary ranges.
          Growth rate should be a percentage.
          Include at least 5 skills and trends.
        `;

      const insights = await step.run(`Generate ${industry} insights`, async () => {
        const result = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
        });

        return JSON.parse(result.choices[0].message.content);
      });

      await step.run(`Update ${industry} insights`, async () => {
        const { error } = await supabase
          .from("IndustryInsight")
          .update({
            ...insights,
            lastUpdated: new Date().toISOString(),
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("industry", industry);
        if (error) throw error;
      });
    }
  }
);
