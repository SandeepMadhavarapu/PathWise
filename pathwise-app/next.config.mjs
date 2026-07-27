import { execSync } from 'node:child_process';

/**
 * The commit the running build was made from, resolved once at build time.
 *
 * The footer prints this so a judge (or we, mid-demo) can tell which build is on screen. It used to
 * be a string typed into AppShell.tsx, which meant it was accurate for exactly as long as someone
 * remembered to retype it — and it had already drifted two commits by the time anyone looked. The
 * rest of PathWise refuses to hand-type a value that has a real source; the build stamp had no
 * business being the exception.
 *
 * Vercel supplies the sha as an env var and does not ship a .git directory, so that is tried first.
 * Locally there is no such var but there IS a repo, so git answers. Neither is a failure worth
 * breaking a build over: 'dev' is the honest answer when the build genuinely has no commit behind
 * it, which is the case in a bare tarball or a fresh unversioned copy.
 */
function buildSha() {
  const fromCI = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromCI) return fromCI.slice(0, 7);

  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'dev';
  }
}

/** A working tree with uncommitted changes is not the commit it claims to be. Say so. */
function isDirty() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return false; // CI builds from a clean checkout.
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD_SHA: `${buildSha()}${isDirty() ? '+dirty' : ''}`,
  },
};

export default nextConfig;
