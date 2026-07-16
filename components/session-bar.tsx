import { signOutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";

export function SessionBar() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm">
        Sign out
      </Button>
    </form>
  );
}
