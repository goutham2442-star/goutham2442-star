const username = process.env.GITHUB_USERNAME || "goutham2442-star";
const token = process.env.GITHUB_TOKEN;
const readmePath = "README.md";
const startMarker = "<!-- ACTIVITY:START -->";
const endMarker = "<!-- ACTIVITY:END -->";

async function main() {
  if (!token) throw new Error("GITHUB_TOKEN is required (GitHub Actions provides it automatically).");
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }
  });
  if (!response.ok) throw new Error(`GitHub Events API returned ${response.status}: ${await response.text()}`);
  const events = await response.json();
  const types = new Set(["PushEvent", "PullRequestEvent", "IssuesEvent", "IssueCommentEvent", "CreateEvent", "ReleaseEvent", "PullRequestReviewEvent"]);
  const meaningful = events.filter((event) => types.has(event.type)).slice(0, 6);
  const lines = meaningful.length ? meaningful.map((event) => {
    const repo = event.repo?.name || "repository";
    const repoUrl = `https://github.com/${repo}`;
    const date = new Date(event.created_at).toISOString().slice(0, 10);
    let action = event.type.replace(/Event$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
    if (event.type === "PushEvent") action = `Pushed ${event.payload?.commits?.length ?? 0} commit(s) to`;
    if (event.type === "PullRequestEvent") action = `${event.payload?.action || "Updated"} pull request in`;
    if (event.type === "IssuesEvent") action = `${event.payload?.action || "Updated"} an issue in`;
    if (event.type === "CreateEvent") action = `Created ${event.payload?.ref_type || "item"} in`;
    return `- **${date}** · ${action} [${repo}](${repoUrl})`;
  }) : ["No recent public events were returned by GitHub. Check back as your public activity changes."];

  const fs = await import("node:fs/promises");
  let readme = await fs.readFile(readmePath, "utf8");
  const start = readme.indexOf(startMarker);
  const end = readme.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) throw new Error("Activity markers were not found in README.md.");
  const replacement = `${startMarker}\n${lines.join("\n")}\n${endMarker}`;
  readme = readme.slice(0, start) + replacement + readme.slice(end + endMarker.length);
  await fs.writeFile(readmePath, readme);
  console.log(`Updated public activity section with ${meaningful.length} event(s).`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
