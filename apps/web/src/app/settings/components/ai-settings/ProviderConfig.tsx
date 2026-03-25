/**
 * @file ProviderConfig.tsx
 * @description AI Provider and API key configuration sub-component.
 */

import { Eye, EyeOff, Key, Globe, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface ProviderConfigProps {
  apiKey: string;
  setApiKey: (val: string) => void;
  provider: string;
  setProvider: (val: string) => void;
  onSave: () => void;
  onReveal: () => void;
  isSaving: boolean;
  isRevealing?: boolean;
}

export function ProviderConfig({ 
  apiKey, 
  setApiKey, 
  provider, 
  setProvider, 
  onSave,
  onReveal,
  isSaving,
  isRevealing = false
}: ProviderConfigProps) {
  const [showKey, setShowKey] = useState(false);

  const handleToggleReveal = () => {
    if (!showKey && apiKey === "********") {
      onReveal();
    }
    setShowKey(!showKey);
  };

  return (
    <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card relative">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-600 transition-all group-hover/card:w-1.5" />
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 shadow-sm border border-blue-500/20 group-hover/card:scale-110 transition-transform">
            <Globe className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              AI Intelligence Gateway
            </CardTitle>
            <CardDescription>
              Configure your cognitive provider and authentication keys.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              <Sparkles className="h-3 w-3 text-blue-500" />
              Preferred Provider
            </div>
            <Select value={provider} onValueChange={(v) => v && setProvider(v)}>
              <SelectTrigger className="rounded-2xl border-border/40 bg-muted/20 h-12 focus:ring-blue-500/20 transition-all hover:bg-muted/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass">
                <SelectItem value="Google">Google Gemini</SelectItem>
                <SelectItem value="OpenAI" disabled>OpenAI (Coming Soon)</SelectItem>
                <SelectItem value="Anthropic" disabled>Anthropic (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              <Key className="h-3 w-3 text-blue-500" />
              Authentication Key
            </div>
            <div className="relative group/input">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="rounded-2xl border-border/40 bg-muted/20 h-12 pr-12 focus-visible:ring-blue-500/20 transition-all hover:bg-muted/30"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-xl hover:bg-background h-10 w-10 transition-colors"
                onClick={handleToggleReveal}
                disabled={isRevealing}
              >
                {isRevealing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : showKey ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-dashed border-border/60">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground/80 font-medium">
              Keys are AES-256 encrypted before persistence to infrastructure.
            </span>
          </div>
          <Button 
            onClick={onSave} 
            disabled={isSaving} 
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:opacity-90 shadow-lg shadow-blue-500/20 px-6 font-bold"
          >
            {isSaving ? "Syncing..." : "Update Configuration"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
