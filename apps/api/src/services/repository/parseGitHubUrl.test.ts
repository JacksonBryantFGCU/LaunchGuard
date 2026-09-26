import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGitHubUrl } from "./parseGitHubUrl.js";
import { RepositoryScanError } from "../../errors.js";

test("accepts a plain GitHub HTTPS URL", () => {
  const parsed = parseGitHubUrl("https://github.com/owner/repository");
  assert.equal(parsed.owner, "owner");
  assert.equal(parsed.name, "repository");
  assert.equal(parsed.cloneUrl, "https://github.com/owner/repository.git");
});

test("accepts and normalizes a .git-suffixed URL", () => {
  const parsed = parseGitHubUrl("https://github.com/owner/repository.git");
  assert.equal(parsed.name, "repository");
});

test("rejects a malformed URL", () => {
  assert.throws(() => parseGitHubUrl("not a url"), RepositoryScanError);
});

test("rejects an empty string", () => {
  assert.throws(() => parseGitHubUrl(""), RepositoryScanError);
});

test("rejects an SSH-style URL", () => {
  assert.throws(() => parseGitHubUrl("git@github.com:owner/repository.git"), RepositoryScanError);
});

test("rejects the git:// protocol", () => {
  assert.throws(() => parseGitHubUrl("git://github.com/owner/repository.git"), RepositoryScanError);
});

test("rejects file:// paths", () => {
  assert.throws(() => parseGitHubUrl("file:///etc/passwd"), RepositoryScanError);
});

test("rejects an unsupported host", () => {
  assert.throws(() => parseGitHubUrl("https://gitlab.com/owner/repository"), RepositoryScanError);
});

test("rejects a host that merely contains github.com as a subdomain trick", () => {
  assert.throws(() => parseGitHubUrl("https://github.com.evil.example/owner/repository"), RepositoryScanError);
});

test("rejects localhost", () => {
  assert.throws(() => parseGitHubUrl("https://localhost/owner/repository"), RepositoryScanError);
});

test("rejects embedded credentials", () => {
  assert.throws(() => parseGitHubUrl("https://user:pass@github.com/owner/repository"), RepositoryScanError);
});

test("rejects a URL missing the repository segment", () => {
  assert.throws(() => parseGitHubUrl("https://github.com/owner"), RepositoryScanError);
});

test("rejects owner/repo segments with unsupported characters", () => {
  assert.throws(() => parseGitHubUrl("https://github.com/owner%2Fname/repository"), RepositoryScanError);
});
