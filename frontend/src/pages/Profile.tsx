import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useMutation } from "@tanstack/react-query";
import { userApi } from "@/api/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Pencil, Check, X, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";

const passwordSchema = z
  .object({
    oldPassword: z.string().min(6, "Password must be at least 6 characters"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function getInitials(name: string) {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || "");

  const updateNameMutation = useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: (_, variables) => {
      if (variables.name && user) {
        setUser({ ...user, name: variables.name });
        toast.success("Name updated successfully");
      }
      setIsEditingName(false);
    },
    onError: (error) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to update profile");
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: () => {
      toast.success("Password updated successfully");
      passwordForm.reset();
    },
    onError: (error) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to update password");
    },
  });

  const handleNameSave = () => {
    if (!nameInput.trim()) return;
    if (nameInput === user?.name) {
      setIsEditingName(false);
      return;
    }
    updateNameMutation.mutate({ name: nameInput });
  };

  const handleNameCancel = () => {
    setNameInput(user?.name || "");
    setIsEditingName(false);
  };

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onPasswordSubmit = (data: PasswordFormValues) => {
    updatePasswordMutation.mutate({
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
    });
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Profile</h1>
      </div>

      <div className="mx-auto max-w-2xl w-full p-6 space-y-8 mt-4">
        {/* Profile Info Section */}
        <div className="flex flex-col items-center space-y-6">
          <Avatar className="h-32 w-32 border-4 border-muted">
            <AvatarImage src={user.avatarUrl || ""} />
            <AvatarFallback className="text-4xl">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-3 w-full max-w-sm justify-center">
            {isEditingName ? (
              <div className="flex items-center gap-2 w-full">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleNameSave}
                  disabled={updateNameMutation.isPending}
                  className="text-green-500 hover:text-green-600"
                >
                  {updateNameMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleNameCancel}
                  disabled={updateNameMutation.isPending}
                  className="text-red-500 hover:text-red-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-foreground">
                  {user.name}
                </h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsEditingName(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <p className="text-muted-foreground">{user.email}</p>
        </div>

        {/* Password Change Section */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="password-form" onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
              <FieldGroup>
                <Field>
                  <FieldLabel>Current Password</FieldLabel>
                  <PasswordInput
                    {...passwordForm.register("oldPassword")}
                  />
                  <FieldError errors={[passwordForm.formState.errors.oldPassword]} />
                </Field>

                <Field>
                  <FieldLabel>New Password</FieldLabel>
                  <PasswordInput
                    {...passwordForm.register("newPassword")}
                  />
                  <FieldError errors={[passwordForm.formState.errors.newPassword]} />
                </Field>

                <Field>
                  <FieldLabel>Confirm Password</FieldLabel>
                  <PasswordInput
                    {...passwordForm.register("confirmPassword")}
                  />
                  <FieldError errors={[passwordForm.formState.errors.confirmPassword]} />
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              type="submit"
              form="password-form"
              disabled={updatePasswordMutation.isPending}
            >
              {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}