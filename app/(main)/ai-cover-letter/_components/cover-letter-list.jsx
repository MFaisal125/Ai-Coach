"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Eye, Trash2, Calendar, Building2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteCoverLetter } from "@/actions/cover-letter";

export default function CoverLetterList({ coverLetters }) {
  const router = useRouter();

  const handleDelete = async (id) => {
    try {
      await deleteCoverLetter(id);
      toast.success("Cover letter successfully discarded.");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Failed to delete cover letter");
    }
  };

  if (!coverLetters?.length) {
    return (
      <Card className="border-dashed border-2 bg-white/5 backdrop-blur-sm">
        <CardHeader className="text-center py-12">
          <CardTitle className="text-2xl font-bold text-gray-300">No Professional Archive Found</CardTitle>
          <CardDescription className="text-gray-500">
            Begin your journey by crafting your first bespoke cover letter.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {coverLetters.map((letter) => (
        <Card 
          key={letter.id} 
          className="group relative bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl hover:shadow-purple-500/10"
        >
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                  {letter.jobTitle}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Building2 className="h-3 w-3" />
                  <span>{letter.companyName}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {format(new Date(letter.createdAt), "MMM d, yyyy")}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-gray-400 text-sm line-clamp-2 leading-relaxed italic opacity-80">
              "{letter.jobDescription || "Professional career synchronization..."}"
            </div>
            
            <div className="flex justify-between items-center pt-2">
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  className="bg-white/10 hover:bg-white/20 border-none h-9 px-4 text-xs font-semibold"
                  onClick={() => router.push(`/ai-cover-letter/${letter.id}`)}
                >
                  <Eye className="h-3.5 w-3.5 mr-2" />
                  Review Draft
                </Button>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-black/90 backdrop-blur-xl border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold">Discard Professional Archive?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      This will permanently remove the tailored correspondence for **{letter.jobTitle}** at **{letter.companyName}**. This action is irreversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(letter.id)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold"
                    >
                      Confirm Discard
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
