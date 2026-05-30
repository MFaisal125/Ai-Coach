"use server";

import { supabase } from "@/lib/supabase";
// import { auth } from "@clerk/nextjs/server";
import { Groq } from "groq-sdk";
import { checkUser } from "@/lib/checkUser";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateCoverLetter(data) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  try {
    // 1. Efficient User Lookup via Supabase
    let { data: user, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("clerkUserId", clerkUserId)
      .single();

    if (!user || userError) {
      user = await checkUser();
    }

    if (!user) throw new Error("User not found");

    // 2. Initializing Realtime Status
    const { data: initialDraft, error: draftError } = await supabase
      .from("CoverLetter")
      .insert([{
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "generating",
        userId: user.id,
        content: "Drafting your professional cover letter...",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }])
      .select()
      .single();

    if (draftError) throw draftError;

    // 3. AI Generation
    const prompt = `
      Write a high-end, professional, and persuasive cover letter for a ${data.jobTitle} position at ${data.companyName}.
      
      Candidate Profile:
      - Industry: ${user.industry}
      - Experience: ${user.experience} years
      - Skills: ${user.skills?.join(", ")}
      - Bio: ${user.bio}
      
      Job Description:
      ${data.jobDescription}
      
      Requirements:
      1. Tone: Professional, authoritative, and human-centric.
      2. Strategy: Align background with job specific requirements.
      3. Structure: Modern business format, bolding key impact points.
      4. Length: 300-400 words.
      
      Return ONLY markdown.
    `;

    const result = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    const content = result.choices[0].message.content.trim();

    // 4. Update with Final Content (Realtime will trigger UI update)
    const { data: finalLetter, error: updateError } = await supabase
      .from("CoverLetter")
      .update({
        content,
        status: "completed",
        updatedAt: new Date().toISOString(),
      })
      .eq("id", initialDraft.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return finalLetter;
  } catch (error) {
    console.error("Error generating cover letter:", error.message);
    throw new Error("Failed to generate cover letter");
  }
}

export async function getCoverLetters() {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  try {
    const { data: user } = await supabase
      .from("User")
      .select("id")
      .eq("clerkUserId", clerkUserId)
      .single();

    if (!user) return [];

    const { data: letters, error } = await supabase
      .from("CoverLetter")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return letters;
  } catch (error) {
    console.error("Error fetching cover letters:", error.message);
    return [];
  }
}

export async function getCoverLetter(id) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  try {
    const { data: letter, error } = await supabase
      .from("CoverLetter")
      .select("*, User!inner(clerkUserId)")
      .eq("id", id)
      .eq("User.clerkUserId", clerkUserId)
      .single();

    if (error) throw error;
    return letter;
  } catch (error) {
    console.error("Error fetching cover letter:", error.message);
    throw new Error("Failed to fetch cover letter");
  }
}

export async function deleteCoverLetter(id) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  try {
    const { data: user } = await supabase
      .from("User")
      .select("id")
      .eq("clerkUserId", clerkUserId)
      .single();

    if (!user) throw new Error("User not found");

    const { error } = await supabase
      .from("CoverLetter")
      .delete()
      .eq("id", id)
      .eq("userId", user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting cover letter:", error.message);
    throw new Error("Failed to delete cover letter");
  }
}
