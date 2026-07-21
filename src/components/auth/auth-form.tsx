"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const signInSchema = z.object({
  email: z.email({ message: "Enter a valid email" }),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, "Enter your name"),
  email: z.email({ message: "Enter a valid email" }),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

export function AuthForm({
  mode,
  className,
}: {
  mode: "sign-in" | "sign-up";
  className?: string;
}) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";

  // Separate form instances keep the discriminated union tractable.
  const signIn = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const signUp = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const [isLoading, setIsLoading] = React.useState(false);

  const onSignIn = async (values: SignInValues) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Signed in.");
      router.push("/app");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const onSignUp = async (values: SignUpValues) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Account created! Check your email to verify.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSignUp) {
    return (
      <form
        onSubmit={signUp.handleSubmit(onSignUp)}
        className={cn("flex flex-col gap-4", className)}
      >
        <Field
          id="fullName"
          label="Full name"
          placeholder="Ada Lovelace"
          autoComplete="name"
          error={signUp.formState.errors.fullName?.message}
          {...signUp.register("fullName")}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={signUp.formState.errors.email?.message}
          {...signUp.register("email")}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          error={signUp.formState.errors.password?.message}
          {...signUp.register("password")}
        />
        <SubmitButton isLoading={isLoading} label="Create account" />
      </form>
    );
  }

  return (
    <form
      onSubmit={signIn.handleSubmit(onSignIn)}
      className={cn("flex flex-col gap-4", className)}
    >
      <Field
        id="email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={signIn.formState.errors.email?.message}
        {...signIn.register("email")}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={signIn.formState.errors.password?.message}
        {...signIn.register("password")}
      />
      <SubmitButton isLoading={isLoading} label="Sign in" />
    </form>
  );
}

function Field({
  id,
  label,
  error,
  ...props
}: React.ComponentProps<"input"> & {
  id: string;
  label: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

function SubmitButton({
  isLoading,
  label,
}: {
  isLoading: boolean;
  label: string;
}) {
  return (
    <Button type="submit" disabled={isLoading} className="mt-2">
      {isLoading && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}
