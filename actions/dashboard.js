"use server";

import { supabase } from "@/lib/supabase";
// import { auth } from "@clerk/nextjs/server";
import { Groq } from "groq-sdk";
import { checkUser } from "@/lib/checkUser";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const generateAIInsights = async (industry) => {
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
};

export async function getIndustryInsights() {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  try {
    // 1. Unified User & Insight Lookup
    const { data: user, error: userError } = await supabase
      .from("User")
      .select("*, IndustryInsight(*)")
      .eq("clerkUserId", clerkUserId)
      .single();

    if (!user || userError) {
      const fallbackUser = await checkUser();
      if (!fallbackUser) throw new Error("User not found");
      return await getIndustryInsights(); // Recursive call once user is created
    }

    // 2. If no insights exist for the user's industry, generate them
    if (!user.IndustryInsight) {
      const insights = await generateAIInsights(user.industry);

      const { data: industryInsight, error: createError } = await supabase
        .from("IndustryInsight")
        .insert([{
          industry: user.industry,
          ...insights,
          nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }])
        .select()
        .single();

      if (createError) throw createError;
      return industryInsight;
    }

    return user.IndustryInsight;
  } catch (error) {
    console.error("Error fetching industry insights:", error.message);
    throw new Error("Failed to fetch industry insights");
  }
}
