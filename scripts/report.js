const { spawnSync } = require('child_process');
const { Octokit } = require('octokit');

const result = spawnSync('yarn', ['--silent', 'tsc', '--noEmit']);

if (result.error) {
  console.log(result.error);

  process.exit(1);
}

const stdout = result.stdout.toString();
const stderr = result.stderr.toString();

if (process.status === 0) process.exit(0);

if (result.status !== 2) {
  console.log({ stdout, stderr });

  process.exit(1);
}

const octokit = new Octokit({
  auth: process.env.AUTH_TOKEN,
});

const owner = 'fersilva16';
const repo = 'pr-ts-report-action';
const baseUrl = `https://github.com/${owner}/${repo}`;
const prNumber = parseInt(process.env.PR_NUMBER);

const locations = stdout
  .trim()
  .split('\n')
  .filter((line) => !line.match(/^\s+/))
  .map((line) => {
    const [location, ...rest] = line.split(':');
    const githubPath = location.replace(
      /\(([0-9]+),[0-9]+\)$/,
      (_, l) => `#L${l}`
    );

    return {
      location,
      url: `${baseUrl}/tree/main/${githubPath}`,
      error: rest.join(':'),
    };
  });

const issueTitle = `TypeScript errors - #${prNumber}`;
const issueBodyLines = locations
  .map(
    ({ location, url, error }) => `- [ ] [${location}](${url}): \`${error}\``
  )
  .join('\n');

octokit.rest.issues.createComment({
  owner,
  repo,
  issue_number: prNumber,
  body: [
    '# TypeScript Report',
    '| Location | Error |',
    '| -------- | ----- |',
    ...locations.map(
      ({ location, url, error }) => `| [${location}](${url}) | \`${error}\` |`
    ),
    `[Create an issue](${baseUrl}/issues/new?title=${issueTitle}&body=${issueBodyLines})`,
  ].join('\n'),
});
