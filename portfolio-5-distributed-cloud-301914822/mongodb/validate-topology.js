(() => {
  const expectedReplicaSet = "nubian-rs";
  const expectedHosts = [
    "mongo1:27017",
    "mongo2:27017",
    "mongo3:27017"
  ];

  const assertCondition = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const status = rs.status();
  const config = rs.conf();
  const actualHosts = config.members.map((member) => member.host).sort();
  const primaries = status.members.filter(
    (member) => member.health === 1 && member.stateStr === "PRIMARY"
  );
  const secondaries = status.members.filter(
    (member) => member.health === 1 && member.stateStr === "SECONDARY"
  );

  print("Portfolio 5 topology validation");

  assertCondition(status.set === expectedReplicaSet, "unexpected replica-set name");
  assertCondition(
    JSON.stringify(actualHosts) === JSON.stringify([...expectedHosts].sort()),
    `unexpected replica-set members ${JSON.stringify(actualHosts)}`
  );
  assertCondition(
    config.members.every(
      (member) =>
        member.votes === 1 &&
        member.priority === 1 &&
        member.arbiterOnly !== true
    ),
    "expected three equal-priority data-bearing voting members"
  );
  assertCondition(
    status.votingMembersCount === 3 && status.majorityVoteCount === 2,
    "expected three voting members and a majority of two"
  );
  assertCondition(
    primaries.length === 1 && secondaries.length === 2,
    "expected one healthy primary and two healthy secondaries"
  );

  const members = status.members
    .map((member) => ({
      name: member.name,
      state: member.stateStr,
      health: member.health
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  print("PASS exact three-member replica-set configuration");
  print("PASS three data-bearing voters with majority of two");
  print("PASS one healthy primary and two healthy secondaries");
  printjson({
    replicaSet: status.set,
    votingMembers: status.votingMembersCount,
    majorityVotesRequired: status.majorityVoteCount,
    members
  });
  print("TOPOLOGY VALIDATION PASSED");
})();
