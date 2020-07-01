export async function getPeers(peerServerGetPeersURL: string) {
  const t1 = performance.now();
  const fetched = await fetch(peerServerGetPeersURL);
  console.debug(`Spent ${performance.now() - t1} on fetching online peers`);
  const parsed = await fetched.json();
  return new Set(parsed as string[]);
}
