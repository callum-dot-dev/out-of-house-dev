// @mention parsing helpers.
// Mentions are matched as @<word> tokens, then resolved against a list of
// candidate profiles by partial-name or email-prefix match.

export const MENTION_REGEX = /(^|\s)@([a-z0-9_.-]{2,40})/gi;

export const parseMentions = (body, candidates = []) => {
  if (!body) return [];
  const tokens = new Set();
  let m;
  const re = new RegExp(MENTION_REGEX);
  while ((m = re.exec(body)) !== null) {
    tokens.add(m[2].toLowerCase());
  }
  if (tokens.size === 0) return [];

  const ids = new Set();
  for (const token of tokens) {
    const match = candidates.find((c) => {
      const name = (c.full_name || '').toLowerCase().replace(/\s+/g, '');
      const handle = (c.email || '').split('@')[0].toLowerCase();
      return name.startsWith(token) || handle === token || handle.startsWith(token);
    });
    if (match) ids.add(match.id);
  }
  return Array.from(ids);
};

export const renderMentions = (body, candidates = []) => {
  if (!body) return body;
  const map = new Map();
  candidates.forEach((c) => {
    const name = (c.full_name || '').toLowerCase().replace(/\s+/g, '');
    const handle = (c.email || '').split('@')[0].toLowerCase();
    if (name) map.set(name, c);
    if (handle) map.set(handle, c);
  });
  return body.replace(MENTION_REGEX, (full, lead, token) => {
    const c = map.get(token.toLowerCase());
    if (!c) return full;
    return `${lead}<span class="mention">@${c.full_name || token}</span>`;
  });
};
