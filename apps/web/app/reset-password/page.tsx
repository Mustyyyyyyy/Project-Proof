import { ResetPasswordForm } from "../../components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  return <ResetPasswordForm defaultEmail={email} />;
}
