import Link from "next/link";

export function Proof() {
  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="my-44">
            <p className="text-lg mb-4 text-foreground font-medium">
              &quot;MIT research shows AI dependency leads to cognitive debt.
              Mukti reverses this trend.&quot;
            </p>
            <Link
              href="https://arxiv.org/pdf/2506.08872"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Read the MIT Study →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
