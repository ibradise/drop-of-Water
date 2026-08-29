export type ObjectId = string;

let counter = 0;
export function makeId(): ObjectId {
  counter += 1;
  const hex = counter.toString(16).padStart(6, "0");
  const stamp = Date.now().toString(16);
  return (stamp + hex).padStart(24, "0").slice(-24);
}

export function nowIso(): string {
  return new Date().toISOString();
}
