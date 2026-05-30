"use server";

import { supabase } from "@/lib/supabase";
// import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";
import { checkUser } from "@/lib/checkUser";

export async function updateUser(data) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  try {
    // 1. Fetch user to ensure they exist
    let { data: user, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("clerkUserId", clerkUserId)
      .single();

    if (!user || userError) {
      user = await checkUser();
    }

    if (!user) throw new Error("User not found");

    // 2. Handle Industry Insights (Realtime ready)
    const { data: industryInsight, error: insightError } = await supabase
      .from("IndustryInsight")
      .select("*")
      .eq("industry", data.industry)
      .single();

    if (!industryInsight || insightError) {
      const insights = await generateAIInsights(data.industry);
      await supabase.from("IndustryInsight").insert([{
        industry: data.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }]);
    }

    // 3. Modernized Update with Professional Fields
    const { data: updatedUser, error: updateError } = await supabase
      .from("User")
      .update({
        industry: data.industry,
        experience: data.experience,
        bio: data.bio,
        skills: data.skills,
        professionalTitle: data.professionalTitle,
        location: data.location,
        socialLinks: data.socialLinks,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    revalidatePath("/");
    return updatedUser;
  } catch (error) {
    console.error("Error updating user profile:", error.message);
    throw new Error("Failed to update profile");
  }
}

export async function getUserOnboardingStatus() {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  try {
    const { data: user, error } = await supabase
      .from("User")
      .select("industry")
      .eq("clerkUserId", clerkUserId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return {
      isOnboarded: !!user?.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error.message);
    throw new Error("Failed to check onboarding status");
  }
}
