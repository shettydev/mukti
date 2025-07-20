export function Proof() {
  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8">
            <p className="text-lg mb-4 text-foreground font-medium">
              &quot;MIT research shows AI dependency leads to cognitive debt.
              Mukti reverses this trend.&quot;
            </p>
            <a
              href="https://arxiv.org/pdf/2506.08872"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Read the MIT Study →
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">1000+</div>
              <div className="text-sm text-muted-foreground">Early Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">89%</div>
              <div className="text-sm text-muted-foreground">
                Improved Thinking
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">4.9★</div>
              <div className="text-sm text-muted-foreground">User Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">MIT</div>
              <div className="text-sm text-muted-foreground">
                Research Backed
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
