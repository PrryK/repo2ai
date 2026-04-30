const REDACTED = "[REDACTED]";

const ENV_SECRET_KEY_PATTERN =
  /^(?:TOKEN|API_TOKEN|ACCESS_TOKEN|REFRESH_TOKEN|SECRET_TOKEN|GITHUB_TOKEN|OPENAI_API_KEY|API_KEY|AUTH_TOKEN|BEARER_TOKEN|CLIENT_SECRET|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|[A-Z0-9]+(?:_[A-Z0-9]+)*(?:_API_KEY|_SECRET|_PASSWORD|_PRIVATE_KEY))$/;

const CONFIG_SECRET_KEY_PATTERN =
  /(?:^|[_-])(password|passwd|secret|api[_-]?key|apikey|private[_-]?key|credential)(?:$|[_-])/i;

const PROVIDER_TOKEN_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g
];

export interface RedactionResult {
  content: string;
  redacted: boolean;
}

export function redactSensitiveValues(input: string): RedactionResult {
  let content = input;

  content = redactPrivateKeyBlocks(content);
  content = redactAuthorizationBearer(content);
  content = redactEnvAssignments(content);
  content = redactJsonConfigSecrets(content);
  content = redactYamlConfigSecrets(content);
  content = redactKnownProviderTokens(content);

  return {
    content,
    redacted: content !== input
  };
}

function redactPrivateKeyBlocks(input: string): string {
  return input.replace(
    /-----BEGIN ([A-Z ]*PRIVATE KEY)-----[\s\S]*?-----END \1-----/g,
    `-----BEGIN $1-----\n${REDACTED}\n-----END $1-----`
  );
}

function redactAuthorizationBearer(input: string): string {
  return input.replace(/(\bAuthorization\s*:\s*Bearer\s+)([A-Za-z0-9._~+/=-]+)/gi, `$1${REDACTED}`);
}

function redactEnvAssignments(input: string): string {
  return input.replace(
    /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_.-]*)(\s*=\s*)(["']?)([^\r\n"']*)(\4)/gim,
    (match, prefix: string, key: string, separator: string, quote: string, value: string, closingQuote: string) => {
      if (!isSecretEnvKey(key)) {
        return match;
      }
      return `${prefix}${key}${separator}${quote}${REDACTED}${closingQuote}`;
    }
  );
}

function redactJsonConfigSecrets(input: string): string {
  return input
    .replace(
      /("[^"]*"\s*:\s*)"([^"]*)"/g,
      (match, keyPart: string) => {
        const key = extractJsonKey(keyPart);
        if (!key || !isConfigSecretKey(key)) {
          return match;
        }
        return `${keyPart}"${REDACTED}"`;
      }
    )
    .replace(
      /('[^']*'\s*:\s*)'([^']*)'/g,
      (match, keyPart: string, value: string) => {
        const key = extractSingleQuotedKey(keyPart);
        if (!key || !isConfigSecretKey(key)) {
          return match;
        }
        return `${keyPart}'${REDACTED}'`;
      }
    );
}

function redactYamlConfigSecrets(input: string): string {
  return input.replace(
    /^(\s*)([A-Za-z_][A-Za-z0-9_.-]*)(\s*:\s*)(.+)$/gim,
    (match, prefix: string, key: string, separator: string, value: string) => {
      if (!isConfigSecretKey(key) || looksLikeTypeAnnotation(value)) {
        return match;
      }
      return `${prefix}${key}${separator}${REDACTED}`;
    }
  );
}

function redactKnownProviderTokens(input: string): string {
  let content = input;
  for (const pattern of PROVIDER_TOKEN_PATTERNS) {
    content = content.replace(pattern, REDACTED);
  }
  return content;
}

function isSecretEnvKey(key: string): boolean {
  return ENV_SECRET_KEY_PATTERN.test(key);
}

function isConfigSecretKey(key: string): boolean {
  return CONFIG_SECRET_KEY_PATTERN.test(key);
}

function extractJsonKey(keyPart: string): string | undefined {
  return keyPart.match(/"([^"]*)"/)?.[1];
}

function extractSingleQuotedKey(keyPart: string): string | undefined {
  return keyPart.match(/'([^']*)'/)?.[1];
}

function looksLikeTypeAnnotation(value: string): boolean {
  const normalized = value.trim().replace(/[;,]$/, "");
  return /^(string|number|boolean|bigint|symbol|unknown|any|never|void|null|undefined)(\[\])?$/i.test(normalized);
}
