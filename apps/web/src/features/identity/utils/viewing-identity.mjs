export function viewingIdentity(group, signedIn, saved) {
  if (signedIn) return group.viewerMemberId || '';
  return group.members.some((member) => member.id === saved) ? saved : '';
}
