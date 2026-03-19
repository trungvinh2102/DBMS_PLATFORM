/**
 * @file AvatarDialog.tsx
 * @description Dialog for updating user avatar via URL or local file upload.
 */

import React from "react";
import { Camera, Link as LinkIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

interface AvatarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
}

export function AvatarDialog({
  open,
  onOpenChange,
  avatarUrl,
  setAvatarUrl,
  onFileChange,
  fileInputRef,
}: AvatarDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={
        <Button 
          size="icon" 
          variant="secondary"
          className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl shadow-xl border-2 border-background transition-all duration-300 hover:scale-110 active:scale-95 opacity-100 z-20"
        />
      }>
        <Camera className="h-5 w-5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Avatar</DialogTitle>
          <DialogDescription>
            Upload a professional photo or link to an image.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="h-32 w-32 rounded-2xl overflow-hidden border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
            {avatarUrl ? (
              <img src={avatarUrl} className="h-full w-full object-cover" alt="Preview" />
            ) : (
              <Camera className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div className="grid w-full gap-4">
            <div className="flex gap-2">
               <Input 
                 placeholder="Image URL..." 
                 value={avatarUrl}
                 onChange={(e) => setAvatarUrl(e.target.value)}
                 className="flex-1"
               />
               <Button size="icon" variant="outline"><LinkIcon className="h-4 w-4" /></Button>
            </div>
            <Separator />
            <input 
              type="file" 
              hidden 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={onFileChange}
            />
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" /> Upload local file
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
