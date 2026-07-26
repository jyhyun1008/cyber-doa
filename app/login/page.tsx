import { prisma } from "@/lib/db";
import LoginPageClient from "@/components/LoginPageClient";

// signup-enabled state can change at runtime, so this must not be prerendered
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  const signupEnabled = settings?.signupEnabled ?? true;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <LoginPageClient signupEnabled={signupEnabled} />
    </main>
  );
}
