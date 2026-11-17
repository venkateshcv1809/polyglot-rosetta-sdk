export function meetsMinimumVersion(current: string, minimum: string | undefined): boolean {
  const required = stripVersion(minimum);

  if (!required) {
    return true;
  }

  const running = stripVersion(current);

  if (!running || running === 'dev') {
    return true;
  }

  return compareVersions(running, required) >= 0;
}

export function compareVersions(left: string, right: string): number {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const a = leftParts[index] ?? 0;
    const b = rightParts[index] ?? 0;

    if (a < b) {
      return -1;
    }

    if (a > b) {
      return 1;
    }
  }

  return 0;
}

function stripVersion(value: string | undefined): string {
  return value?.trim().replace(/^v/, '') ?? '';
}

function versionParts(value: string): number[] {
  const numeric = value.split('-')[0]?.split('+')[0] ?? '';

  return numeric.split('.').map((field) => {
    const parsed = Number.parseInt(field, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}
