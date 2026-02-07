/**
 * @file app/auth/login/page.tsx
 * @description Login page with simplified glassmorphic design
 */
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, User } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { useAuth } from "@/hooks/use-auth";

import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();

  const loginMutation = useMutation(
    trpc.auth.login.mutationOptions({
      onSuccess: (data) => {
        setAuth(data.token, data.user);
        toast.success("Welcome back!");
        router.push("/"); // Or wherever 'home' is
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    loginMutation.mutate(values);
  }

  return (
    <AuthLayout>
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter text-white">
            Welcome back
          </h1>
          <p className="text-neutral-400 text-sm">
            Enter your credentials to continue
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 text-left"
          >
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-300">Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="john_doe"
                        className="bg-neutral-900/50 border-neutral-800 focus:border-purple-500/50 focus:ring-purple-500/20 text-white placeholder:text-neutral-600 pl-10 h-11 rounded-xl"
                        {...field}
                      />
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-300">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="bg-neutral-900/50 border-neutral-800 focus:border-purple-500/50 focus:ring-purple-500/20 text-white placeholder:text-neutral-600 pr-10 h-11 rounded-xl"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-900/20 transition-all duration-300 transform hover:scale-[1.01]"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign In
            </Button>

            <div className="text-sm text-center text-neutral-400 pt-2">
              Don&apos;t have an account?{" "}
              <Link
                href={"/auth/register" as any}
                className="text-white hover:text-purple-400 font-semibold transition-colors"
              >
                Sign up
              </Link>
            </div>
          </form>
        </Form>

        <div className="text-xs text-neutral-500 mt-4">
          Protected by Application Security
        </div>
      </div>
    </AuthLayout>
  );
}
