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
  const { user } = useAuth();

  const { data: savedQueryData, isLoading } = useQuery({
    queryKey: ["savedQueries"],
    queryFn: () => databaseApi.listSavedQueries(),
    enabled: !!user,
  });


  const savedQueries = (savedQueryData as any[])?.slice(0, 4) || [];

  return (
    <motion.div
      className="col-span-1 bento-card p-6 flex flex-col h-full bg-linear-to-br from-card to-muted/20 border-none shadow-premium relative group/bookmarks"
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-2">
          <Star className="h-3.5 w-3.5 fill-primary/20 text-primary animate-pulse" /> Bookmarked
        </h2>
        <div className="flex gap-0.5">
           {[1, 2].map(i => <div key={i} className="w-1 h-3 rounded-full bg-primary/20" />)}
        </div>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : savedQueries.length > 0 ? (
          <ul className="space-y-3">
            {savedQueries.map((query: any) => (
              <li key={query.id} className="group relative rounded-xl border border-border/50 bg-background/40 hover:bg-primary/5 hover:border-primary/20 transition-all duration-300">
                <Link to={`/sqllab?saved=${query.id}`} className="flex items-center justify-between p-3.5" title={query.name}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                    <span className="text-xs font-bold truncate pr-6 font-sans text-foreground/80 group-hover:text-foreground">
                      {query.name}
                    </span>
                  </div>
                  <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    <PlayCircle className="h-4 w-4 text-primary" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-48 text-center relative mt-2 group/empty">
             <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover/bookmarks:opacity-100 transition-opacity duration-1000" />
            <FolderHeart className="h-12 w-12 text-primary/20 mb-4 stroke-1 group-hover/empty:scale-110 transition-transform duration-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Library Empty</p>
            <p className="text-[10px] text-muted-foreground font-medium max-w-[140px] leading-relaxed">
              Archive your favorite architectures for instant retrieval here.
            </p>
          </div>
        )}
      </div>

      {savedQueries.length > 0 && (
         <div className="mt-6 pt-4 border-t border-border/10">
           <Button variant="ghost" className="text-[10px] font-black uppercase tracking-[0.2em] w-full h-auto py-2.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all" asChild>
             <Link to="/sqllab">System Catalog</Link>
           </Button>
         </div>
      )}
    </motion.div>
  );
}
