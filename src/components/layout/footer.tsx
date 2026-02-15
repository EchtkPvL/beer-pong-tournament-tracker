export function Footer() {
  const commitSha = process.env.NEXT_PUBLIC_COMMIT_SHA;
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL;

  return (
    <footer className="border-t py-4 text-center text-sm text-muted-foreground">
      <div className="container mx-auto px-4">
        {commitSha ? (
          <span>
            BPTT{' '}
            {githubUrl ? (
              <a
                href={`${githubUrl}/commit/${commitSha}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline"
              >
                {commitSha}
              </a>
            ) : (
              commitSha
            )}
          </span>
        ) : (
          <span>BPTT dev</span>
        )}
        {githubUrl && (
          <>
            <span className="mx-1">&middot;</span>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:underline"
            >
              GitHub
            </a>
          </>
        )}
        <span className="mx-1">&middot;</span>
        <span>AGPL-3.0</span>
      </div>
    </footer>
  );
}
