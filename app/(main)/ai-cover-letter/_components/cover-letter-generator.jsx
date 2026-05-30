"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Sparkles, Building2, Briefcase, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateCoverLetter } from "@/actions/cover-letter";
import useFetch from "@/hooks/use-fetch";
import { coverLetterSchema } from "@/app/lib/schema";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const steps = [
  { id: 1, label: "Analyzing Profile", icon: Sparkles },
  { id: 2, label: "Analyzing Job Description", icon: Briefcase },
  { id: 3, label: "Drafting Content", icon: FileText },
  { id: 4, label: "Finalizing", icon: CheckCircle2 },
];

export default function CoverLetterGenerator() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(coverLetterSchema),
  });

  const {
    loading: generating,
    fn: generateLetterFn,
    data: generatedLetter,
  } = useFetch(generateCoverLetter);

  // Loading animation simulation
  useEffect(() => {
    if (generating) {
      const interval = setInterval(() => {
        setCurrentStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setCurrentStep(0);
    }
  }, [generating]);

  // Update content when letter is generated
  useEffect(() => {
    if (generatedLetter) {
      toast.success("Cover letter generated successfully!");
      router.push(`/ai-cover-letter/${generatedLetter.id}`);
      reset();
    }
  }, [generatedLetter, router, reset]);

  const onSubmit = async (data) => {
    try {
      // Log attempt to Supabase (Non-blocking: won't stop generation if it fails)
      try {
        await supabase.from("generation_logs").insert([{ 
          type: "cover_letter", 
          company: data.companyName, 
          timestamp: new Date().toISOString() 
        }]);
      } catch (logError) {
        console.warn("Telemetry log failed:", logError.message);
      }
      
      await generateLetterFn(data);
    } catch (error) {
      toast.error(error.message || "Failed to generate cover letter");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <Card className="border-none bg-white/10 backdrop-blur-md shadow-2xl overflow-hidden ring-1 ring-white/20">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        <CardHeader className="pt-8 px-8">
          <CardTitle className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-400" />
            AI Precision Tailoring
          </CardTitle>
          <CardDescription className="text-lg text-gray-400/80">
            Our high-end AI will align your expertise with the company's specific needs.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="companyName" className="text-md font-semibold text-gray-200">
                  Target Company
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <Input
                    id="companyName"
                    className="pl-10 bg-black/20 border-white/10 focus:ring-purple-500/50 h-12 transition-all hover:border-white/30"
                    placeholder="e.g., Google, Tesla, Spotify"
                    {...register("companyName")}
                  />
                </div>
                {errors.companyName && (
                  <p className="text-sm text-pink-500 font-medium italic">
                    {errors.companyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="jobTitle" className="text-md font-semibold text-gray-200">
                  Job Position
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <Input
                    id="jobTitle"
                    className="pl-10 bg-black/20 border-white/10 focus:ring-purple-500/50 h-12 transition-all hover:border-white/30"
                    placeholder="e.g., Senior Product Designer"
                    {...register("jobTitle")}
                  />
                </div>
                {errors.jobTitle && (
                  <p className="text-sm text-pink-500 font-medium italic">
                    {errors.jobTitle.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="jobDescription" className="text-md font-semibold text-gray-200">
                Job Description Details
              </Label>
              <Textarea
                id="jobDescription"
                className="bg-black/20 border-white/10 focus:ring-purple-500/50 h-48 transition-all hover:border-white/30 resize-none leading-relaxed"
                placeholder="Paste the full job description here. The more detail, the better our AI can tailor your letter."
                {...register("jobDescription")}
              />
              {errors.jobDescription && (
                <p className="text-sm text-pink-500 font-medium italic">
                  {errors.jobDescription.message}
                </p>
              )}
            </div>

            <div className="flex flex-col items-center gap-6 pt-4">
              {generating && (() => {
                const StepIcon = steps[currentStep].icon;
                return (
                  <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center text-sm font-medium text-gray-400">
                      <span className="flex items-center gap-2">
                        {StepIcon && <StepIcon className="h-4 w-4 text-purple-400" />}
                        {steps[currentStep].label}...
                      </span>
                      <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-700 ease-out" 
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              <Button 
                type="submit" 
                className="w-full md:w-auto px-12 h-14 text-lg font-bold bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Generating your Letter...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-3 h-5 w-5" />
                    Generate Bespoke Cover Letter
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mt-8">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <p className="text-white font-bold">Pro Quality</p>
          <p className="text-xs text-gray-500">High-end NLP models used</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <p className="text-white font-bold">Personalized</p>
          <p className="text-xs text-gray-500">Matches your unique bio</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <p className="text-white font-bold">Fast Delivery</p>
          <p className="text-xs text-gray-500">Generated in seconds</p>
        </div>
      </div>
    </div>
  );
}
