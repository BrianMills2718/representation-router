import { createHash } from "node:crypto";

const sha256 = (text) => "sha256:" + createHash("sha256").update(text, "utf8").digest("hex");

function assertBinding(binding) {
  if (!binding?.repository || !binding?.commit_sha || !binding?.entrypoint) throw new Error("artifact binding requires repository, commit_sha, and entrypoint");
  if (!/^[0-9a-f]{40}$/.test(binding.commit_sha)) throw new Error("artifact commit_sha must be exact 40-character lowercase hex");
}

function registrationFor(registry, binding) {
  const item = registry?.find(x => x.repository === binding.repository);
  if (!item) throw new Error(`unregistered product artifact repository: ${binding.repository}`);
  if (!Array.isArray(item.allowed_entrypoints) || !item.allowed_entrypoints.includes(binding.entrypoint)) {
    throw new Error(`unregistered product artifact entrypoint: ${binding.entrypoint}`);
  }
  return item;
}

function inlineAssets(html, files) {
  let out = html;
  for (const file of files) {
    const leaf = file.path.split("/").at(-1).replace(/[.*+?^$()|[\]\\]/g, "\\$&");
    if (file.kind === "style") {
      out = out.replace(new RegExp(`<link[^>]+href=["'][^"']*${leaf}[^"']*["'][^>]*>`, "i"), `<style data-resolved-from="${file.path}">${file.content}</style>`);
    } else if (file.kind === "script") {
      out = out.replace(new RegExp(`<script[^>]+src=["'][^"']*${leaf}[^"']*["'][^>]*><\\/script>`, "i"), `<script data-resolved-from="${file.path}">${file.content}<\\/script>`);
    }
  }
  return out;
}

export async function resolveProductArtifact(binding, { registry, fetchFile }) {
  assertBinding(binding);
  if (binding.artifact_kind !== "source_ui") throw new Error(`unsupported artifact_kind: ${binding.artifact_kind}`);
  const registration = registrationFor(registry, binding);
  const sourceFiles = [{ path: binding.entrypoint, kind: "html" }, ...(registration.assets ?? [])];
  const fetched = [];
  for (const item of sourceFiles) {
    const result = await fetchFile({ repository: binding.repository, commit_sha: binding.commit_sha, path: item.path });
    if (!result || result.repository !== binding.repository || result.commit_sha !== binding.commit_sha || result.path !== item.path) {
      throw new Error(`artifact resolver returned mixed or incorrect revision for ${item.path}`);
    }
    if (typeof result.content !== "string") throw new Error(`artifact resolver returned no text content for ${item.path}`);
    const checksum = sha256(result.content);
    const expected = registration.source_checksums?.[item.path] ?? null;
    if (expected && checksum !== expected) throw new Error(`source checksum mismatch for ${item.path}`);
    fetched.push({ ...item, content: result.content, checksum });
  }
  const htmlFile = fetched.find(x => x.kind === "html");
  if (!htmlFile) throw new Error("registered artifact has no HTML entrypoint");
  const resolvedHtml = inlineAssets(htmlFile.content, fetched.filter(x => x.kind !== "html"));
  const outputChecksum = sha256(resolvedHtml);
  if (binding.checksum && binding.checksum !== outputChecksum) throw new Error("resolved product artifact checksum mismatch");
  return {
    repository: binding.repository,
    commit_sha: binding.commit_sha,
    entrypoint: binding.entrypoint,
    resolved_html: resolvedHtml,
    output_checksum: outputChecksum,
    sources: fetched.map(({ path, checksum }) => ({ path, checksum }))
  };
}
