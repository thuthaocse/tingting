export function viewingIdentity(group, signedIn, saved) {
  if (signedIn && group.viewerMemberId) return group.viewerMemberId;
  return group.members.some((member) => member.id === saved) ? saved : '';
}
