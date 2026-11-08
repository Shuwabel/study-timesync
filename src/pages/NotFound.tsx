import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <AppShell width="max-w-3xl">
    <section className="border border-border bg-card p-6 md:p-10">
      <h1 className="font-display text-5xl font-bold uppercase leading-none">No such page</h1>
      <p className="mt-3 max-w-prose text-muted-foreground">The address does not match anything in StudySync.</p>
      <Button asChild size="lg" className="mt-6">
        <Link to="/today">Go to Today</Link>
      </Button>
    </section>
  </AppShell>
);

export default NotFound;
