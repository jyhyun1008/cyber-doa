import { prisma } from "@/lib/db";
import LoginForm from "@/components/LoginForm";
import SignupForm from "@/components/SignupForm";

// account setup state changes at runtime (signup happens post-build), so this must not be prerendered
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const account = await prisma.appUser.findUnique({ where: { id: 1 } });
  const isSetup = Boolean(account?.passwordHash);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      {isSetup ? <LoginForm /> : <SignupForm />}
    </main>
  );
}
