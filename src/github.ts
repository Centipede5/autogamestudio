export async function createPullRequest(params: {
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is required for auto-PR.");
  }

  const response = await fetch(`https://api.github.com/repos/${params.repo}/pulls`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "autogamestudio-cli"
    },
    body: JSON.stringify({
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base
    })
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to create pull request: ${payload}`);
  }

  return JSON.parse(payload) as { html_url?: string };
}

