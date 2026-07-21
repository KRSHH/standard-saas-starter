"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Field, SubmitButton } from "@/components/auth/form-fields";
import { updateProfile } from "@/lib/auth/actions";

const schema = z.object({
  fullName: z.string().min(1, "Enter your name").max(200, "Name is too long"),
});

type Values = z.infer<typeof schema>;

export function ProfileForm({ defaultFullName }: { defaultFullName: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: defaultFullName },
  });

  const onSubmit = async (values: Values) => {
    setIsLoading(true);
    try {
      const result = await updateProfile(values.fullName);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile saved.");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <Field
        id="fullName"
        label="Full name"
        autoComplete="name"
        error={form.formState.errors.fullName?.message}
        {...form.register("fullName")}
      />
      <SubmitButton isLoading={isLoading} label="Save profile" />
    </form>
  );
}
