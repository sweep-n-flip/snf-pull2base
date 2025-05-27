"use client";

import { Suspense } from "react";
import { NFTTabsNavigation } from "./NFTTabsNavigation";

// Loading fallback component
function NFTTabsLoading() {
  return (
    <div className="w-full">
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 w-24 bg-gray-200 animate-pulse rounded"
            />
          ))}
        </nav>
      </div>
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    </div>
  );
}

export function NFTTabsWrapper() {
  return (
    <Suspense fallback={<NFTTabsLoading />}>
      <NFTTabsNavigation />
    </Suspense>
  );
}
