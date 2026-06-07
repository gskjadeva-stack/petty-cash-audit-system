/**
 * Create GitHub repo and push current branch using git credential manager token.
 * Usage: node scripts/create-github-repo.mjs [owner/repo-name]
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const target = process.argv[2] || 'petty-cash-audit-system';

function getGitHubToken() {
  const input = 'protocol=https\nhost=github.com\n\n';
  const result = spawnSync('git', ['credential', 'fill'], {
    input,
    encoding: 'utf8',
    cwd: root,
  });
  if (result.status !== 0) {
    throw new Error('git credential fill failed — sign in to GitHub in Git Credential Manager');
  }
  const passwordLine = result.stdout
    .split('\n')
    .find((line) => line.startsWith('password='));
  if (!passwordLine) {
    throw new Error('No GitHub token from credential manager');
  }
  return passwordLine.slice('password='.length).trim();
}

function getGitHubUser(token) {
  const res = spawnSync(
    'curl',
    ['-s', '-H', `Authorization: Bearer ${token}`, 'https://api.github.com/user'],
    { encoding: 'utf8' }
  );
  if (res.status !== 0) throw new Error('curl failed fetching GitHub user');
  const user = JSON.parse(res.stdout);
  if (user.message) throw new Error(`GitHub API: ${user.message}`);
  return user.login;
}

async function createRepo(token, owner, name) {
  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      private: false,
      description: 'Petty Cash Audit System',
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    if (body.message?.includes('already exists')) {
      return `https://github.com/${owner}/${name}.git`;
    }
    throw new Error(`Create repo failed: ${JSON.stringify(body)}`);
  }
  return body.clone_url;
}

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

const token = getGitHubToken();
const owner = getGitHubUser(token);
const repoName = target.includes('/') ? target.split('/')[1] : target;
const cloneUrl = await createRepo(token, owner, repoName);
const remoteUrl = `https://github.com/${owner}/${repoName}.git`;

console.log('Repository:', remoteUrl);

try {
  git(['remote', 'remove', 'origin']);
} catch {
  // no origin
}
git(['remote', 'add', 'origin', remoteUrl]);
git(['push', '-u', 'origin', 'main']);

console.log('Pushed main to', remoteUrl);
console.log('Set GITHUB_REPO_URL=' + remoteUrl.replace(/\.git$/, ''));
