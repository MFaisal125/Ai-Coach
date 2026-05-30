"use server";

import { supabase } from "@/lib/supabase";
// import { auth } from "@clerk/nextjs/server";
import { Groq } from "groq-sdk";
import { revalidatePath } from "next/cache";
import { checkUser } from "@/lib/checkUser";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function saveResume(content) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  try {
    let { data: user, error: userError } = await supabase
      .from("User")
      .select("id")
      .eq("clerkUserId", clerkUserId)
      .single();

    if (!user || userError) {
      user = await checkUser();
    }

    if (!user) throw new Error("User not found");

    const { data: resume, error } = await supabase
      .from("Resume")
      .upsert({
        userId: user.id,
        content,
        updatedAt: new Date().toISOString(),
      }, {
        onConflict: "userId",
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error.message);
    throw new Error("Failed to save resume");
  }
}

export async function getResume() {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  try {
    const { data: user } = await supabase
      .from("User")
      .select("id")
      .eq("clerkUserId", clerkUserId)
      .single();

    if (!user) return null;

    const { data: resume, error } = await supabase
      .from("Resume")
      .select("*")
      .eq("userId", user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return resume;
  } catch (error) {
    console.error("Error fetching resume:", error.message);
    return null;
  }
}

export async function improveWithAI({ current, type }) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  try {
    let { data: user, error: userError } = await supabase
      .from("User")
      .select("id, industry, professionalTitle, experience")
      .eq("clerkUserId", clerkUserId)
      .single();

    if (!user || userError) {
      user = await checkUser();
    }

    if (!user) throw new Error("User not found");

    const prompt = `
      As an expert resume writer, improve the following ${type} description for a professional in the ${user.industry} industry.
      Professional Title: ${user.professionalTitle || "Professional"}
      Experience Level: ${user.experience} years
      
      Requirements:
      1. Tone: High-end, impactful, and result-oriented.
      2. Methodology: Use the STAR method (Situation, Task, Action, Result) but integrate metrics naturally.
      3. Verbs: Use powerful action verbs.
      4. Avoid empty placeholders like [X%]. Instead, provide realistic examples or leave it polished without brackets.
      
      Current content: "${current}"
      
      Return ONLY the improved paragraph.
    `;

    const result = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    return result.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error improving resume with AI:", error.message);
    throw new Error("Failed to improve content");
  }
}
