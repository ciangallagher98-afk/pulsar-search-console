import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Pulsar Search Console</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in with your own Pulsar API key to see and manage your team&apos;s searches.
            Your key is stored in a secure cookie that JavaScript can&apos;t read, and is never
            shared with other users of this tool.
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
