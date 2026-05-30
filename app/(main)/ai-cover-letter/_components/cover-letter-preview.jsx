"use client";

import React, { useEffect, useState } from "react";
import MDEditor from "@uiw/react-md-editor";

const CoverLetterPreview = ({ content }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="py-6 animate-in fade-in duration-700">
      <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
        {isMounted ? (
          <MDEditor value={content} preview="preview" height={700} />
        ) : (
          <div className="h-[700px] flex items-center justify-center text-gray-500">
            Initialising Professional Preview...
          </div>
        )}
      </div>
    </div>
  );
};

export default CoverLetterPreview;
