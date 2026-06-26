import { authApi } from "@/api/auth";
import { setAccessToken } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  verifyEmailSchema,
  type VerifyEmailForm,
} from "@/lib/validations/auth";
import { useAuthStore } from "@/store/authStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((state) => state.setUser);

  const email = location.state?.email as string | undefined;

  // Redirect if no email is provided
  useEffect(() => {
    if (!email) {
      navigate("/register");
    }
  }, [email, navigate]);

  const form = useForm<VerifyEmailForm>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: email || "",
      otp: "",
    },
  });

  const mutation = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: (data) => {
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);
      toast.success("Email verified successfully");
      navigate("/chat");
    },
    onError: (error: { data?: { error?: string } }) => {
      const errorMessage =
        error.data?.error ||
        "Verification failed. Please try again.";
      toast.error(errorMessage);
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => {
      if (!email) return Promise.reject(new Error("Email is required"));
      return authApi.resendOtp({ email });
    },
    onSuccess: () => {
      toast.success("Verification code resent to your email");
    },
    onError: () => {
      toast.error("Failed to resend code. Please try again.");
    },
  });

  function onSubmit(data: VerifyEmailForm) {
    mutation.mutate(data);
  }

  if (!email) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>Enter the 6-digit code we sent you</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            We sent a verification code to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="otp"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="otp">Verification code</FieldLabel>
                    <Input
                      {...field}
                      id="otp"
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      aria-invalid={fieldState.invalid}
                      disabled={mutation.isPending}
                      className="text-center tracking-widest"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                    {!fieldState.invalid && (
                      <FieldDescription>Enter the 6 digits</FieldDescription>
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
            <Button
              type="submit"
              className="w-full mt-6"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Verifying..." : "Verify"}
            </Button>
          </form>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <button
          onClick={() => resendMutation.mutate()}
          disabled={resendMutation.isPending || mutation.isPending}
          className="text-sm text-primary hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendMutation.isPending ? "Resending..." : "Resend code"}
        </button>
      </CardFooter>
    </Card>
  );
}

export default VerifyEmailPage;
