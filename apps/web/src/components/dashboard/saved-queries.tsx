/**
 * @file apps/web/src/components/dashboard/saved-queries.tsx
 * @description Compact saved queries list for the Bento Grid.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { Star, PlayCircle, FolderHeart } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

import { databaseApi } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function SavedQueries() {
  const { token } = useAuth();

  const { data: savedQueryData, isLoading } = useQuery({
    queryKey: ["savedQueries"],
    queryFn: () => databaseApi.listSavedQueries(),
    enabled: !!token,
  });

  const savedQueries = (savedQueryData as any[])?.slice(0, 4) || [];

  return (
    <motion.div
      className="col-span-1 md:col-span-1 glass-card p-6 flex flex-col h-full"
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium tracking-tight text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Star className="h-3.5 w-3.5" /> Bookmarks
        </h2>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md bg-black/5 dark:bg-white/5" />
            ))}
          </div>
        ) : savedQueries.length > 0 ? (
          <ul className="space-y-2">
            {savedQueries.map((query: any) => (
              <li key={query.id} className="group relative rounded-lg border border-black/5 dark:border-white/5 bg-black/5 dark:bg-black/10 hover:bg-black/10 dark:hover:bg-white/5 transition-colors">
                <Link to={`/sqllab?saved=${query.id}`} className="flex items-center justify-between p-3" title={query.name}>
                  <span className="text-sm font-medium truncate pr-6 font-sans text-foreground/90">
                    {query.name}
                  </span>
                  <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="h-4 w-4 text-accent" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-32 text-center relative mt-4">
             <div className="absolute -top-4 w-20 h-20 bg-accent/10 rounded-full blur-xl mix-blend-screen" />
            <FolderHeart className="h-8 w-8 text-accent/50 mb-3 stroke-1" />
            <p className="text-xs text-muted-foreground max-w-[150px]">
              Queries you save will appear here for quick access.
            </p>
          </div>
        )}
      </div>

      {savedQueries.length > 0 && (
         <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
           <Button variant="link" className="text-xs w-full h-auto p-0 text-muted-foreground hover:text-foreground" asChild>
             <Link to="/sqllab">View All</Link>
           </Button>
         </div>
      )}
    </motion.div>
  );
}
