(() => {
  const replicaSetName = "nubian-rs";
  const expectedHosts = [
    "mongo1:27017",
    "mongo2:27017",
    "mongo3:27017"
  ];
  const timeoutMs = 60000;
  const pollIntervalMs = 1000;

  const assertCondition = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const sameStrings = (actual, expected) =>
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());

  const replicaConfig = {
    _id: replicaSetName,
    members: expectedHosts.map((host, index) => ({
      _id: index,
      host,
      priority: 1,
      votes: 1
    }))
  };

  print("Portfolio 5 replica-set initialisation");

  let initiatedThisRun = false;
  try {
    const existingConfig = rs.conf();
    const existingHosts = existingConfig.members.map((member) => member.host);
    assertCondition(
      existingConfig._id === replicaSetName,
      `unexpected replica-set name ${existingConfig._id}`
    );
    assertCondition(
      sameStrings(existingHosts, expectedHosts),
      `existing replica-set hosts differ: ${JSON.stringify(existingHosts)}`
    );
    print("Replica set already configured; validating existing topology.");
  } catch (error) {
    const notInitialised =
      error.code === 94 || error.codeName === "NotYetInitialized";
    if (!notInitialised) {
      throw error;
    }

    const initiateResult = rs.initiate(replicaConfig);
    assertCondition(
      initiateResult.ok === 1,
      `replica-set initiation failed: ${EJSON.stringify(initiateResult)}`
    );
    initiatedThisRun = true;
    print("Replica-set configuration accepted.");
  }

  const deadline = Date.now() + timeoutMs;
  let healthyStatus = null;
  let lastObservedStates = [];

  while (Date.now() < deadline) {
    try {
      const currentStatus = rs.status();
      const healthyMembers = currentStatus.members.filter(
        (member) => member.health === 1
      );
      const primaries = healthyMembers.filter(
        (member) => member.stateStr === "PRIMARY"
      );
      const secondaries = healthyMembers.filter(
        (member) => member.stateStr === "SECONDARY"
      );

      lastObservedStates = currentStatus.members.map((member) => ({
        name: member.name,
        state: member.stateStr,
        health: member.health
      }));

      if (
        currentStatus.set === replicaSetName &&
        currentStatus.members.length === 3 &&
        primaries.length === 1 &&
        secondaries.length === 2
      ) {
        healthyStatus = currentStatus;
        break;
      }
    } catch (error) {
      lastObservedStates = [{ error: error.message }];
    }

    sleep(pollIntervalMs);
  }

  assertCondition(
    healthyStatus,
    `replica set did not become healthy within ${timeoutMs} ms; last observation: ${EJSON.stringify(lastObservedStates)}`
  );

  const confirmedConfig = rs.conf();
  assertCondition(
    confirmedConfig.members.every(
      (member) =>
        member.votes === 1 &&
        member.priority === 1 &&
        member.arbiterOnly !== true
    ),
    "expected three equal-priority data-bearing voting members"
  );

  const memberSummary = healthyStatus.members
    .map((member) => ({
      name: member.name,
      state: member.stateStr,
      health: member.health
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  printjson({
    mongoVersion: db.version(),
    replicaSet: healthyStatus.set,
    initiatedThisRun,
    votingMembers: healthyStatus.votingMembersCount,
    majorityVotesRequired: healthyStatus.majorityVoteCount,
    members: memberSummary
  });
  print("REPLICA SET INITIALISATION PASSED");
})();
