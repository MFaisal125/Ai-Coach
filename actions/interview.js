"use server";

import { supabase } from "@/lib/supabase";
// import { auth } from "@clerk/nextjs/server";
import { Groq } from "groq-sdk";
import { checkUser } from "@/lib/checkUser";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateQuiz() {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  try {
    let { data: user, error: userError } = await supabase
      .from("User")
      .select("industry, skills, id")
      .eq("clerkUserId", clerkUserId)
      .single();

    if (!user || userError) {
      user = await checkUser();
    }

    if (!user) throw new Error("User not found");

    const prompt = `
      Generate 10 technical interview questions for a ${
        user.industry
      } professional${
      user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
    }.
      
      Each question should be multiple choice with 4 options.
      
      Return the response in this JSON format only, no additional text:
      {
        "questions": [
          {
            "question": "string",
            "options": ["string", "string", "string", "string"],
            "correctAnswer": "string",
            "explanation": "string"
          }
        ]
      }
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

    const quiz = JSON.parse(result.choices[0].message.content);
    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz:", error.message);
    throw new Error("Failed to generate quiz questions");
  }
}

export async function saveQuizResult(questions, answers, score) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  try {
    const { data: user } = await supabase
      .from("User")
      .select("id, industry")
      .eq("clerkUserId", clerkUserId)
      .single();

    if (!user) throw new Error("User not found");

    const questionResults = questions.map((q, index) => ({
      question: q.question,
      answer: q.correctAnswer,
      userAnswer: answers[index],
      isCorrect: q.correctAnswer === answers[index],
      explanation: q.explanation,
    }));

    // Get wrong answers
    const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

    // Only generate improvement tips if there are wrong answers
    let improvementTip = null;
    if (wrongAnswers.length > 0) {
      const wrongQuestionsText = wrongAnswers
        .map(
          (q) =>
            `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
        )
        .join("\n\n");

      const improvementPrompt = `
        The user got the following ${user.industry} technical interview questions wrong:

        ${wrongQuestionsText}

        Based on these mistakes, provide a concise, specific improvement tip.
        Focus on the knowledge gaps revealed by these wrong answers.
        Keep the response under 2 sentences and make it encouraging.
        Don't explicitly mention the mistakes, instead focus on what to learn/practice.
      `;

      const result = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: improvementPrompt,
          },
        ],
        model: "llama-3.3-70b-versatile",
      });

      improvementTip = result.choices[0].message.content.trim();
    }

    const { data: assessment, error } = await supabase
      .from("Assessment")
      .insert([
        {
          userId: user.id,
          quizScore: score,
          questions: questionResults,
          category: "Technical",
          improvementTip,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error.message);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments() {
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

    const { data: assessments, error } = await supabase
      .from("Assessment")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: true });

    if (error) throw error;
    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error.message);
    throw new Error("Failed to fetch assessments");
  }
}
