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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginForm } from "@/lib/validations/auth";
import { useAuthStore } from "@/store/authStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      console.log(data);
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);
      navigate("/chat");
    },
    onError: (error: AxiosError<{ error: string; code: string }>) => {
      console.log(error);
      const status = error?.status ?? error?.response?.status;
      const code = error?.response?.data?.code;
      const message =
        error?.response?.data?.error ?? "Login failed. Please try again.";
      // Check if email is not verified
      if (status === 403 && code === "EMAIL_NOT_VERIFIED") {
        const email = form.getValues("email");
        navigate("/verify-email", { state: { email } });
        toast.error("Please verify your email first");
      } else {
        toast.error(message);
      }
    },
  });

  function onSubmit(data: LoginForm) {
    mutation.mutate(data);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Log in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    {...field}
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
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
            {mutation.isPending ? "Logging in..." : "Log in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <span className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          {/* <a
            href="/register"
            className="text-primary hover:underline font-medium"
          >
            Sign up
          </a> */}
          <Link
            to="/register"
            className="text-primary hover:underline font-medium"
          >
            Sign up
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}

export default LoginPage;
