const staffRoster = (() => {
  "use strict";

  const distributionRoles = ["胸花發放", "工作人員胸章發放"];

  function teamRoles(team, memberIds = team.memberIds) {
    const roles = [
      ["負責人", team.leaderId ? [team.leaderId] : []],
      ["組員", memberIds],
      ["支援", team.supportIds],
      ["待核對", team.candidateIds]
    ];
    return roles.map(([label, ids]) => [label, [...new Set(ids || [])]])
      .filter(([, ids]) => ids.length);
  }

  function distribution(team, people) {
    if (team.id !== "badges") return null;
    const byName = new Map();
    for (const id of new Set(team.memberIds)) {
      const name = people.get(id);
      if (name) byName.set(name, [...(byName.get(name) || []), id]);
    }
    const roles = new Map(distributionRoles.map((label) => [label, new Set()]));
    const items = new Map();

    // Published work items already carry these assignments. Accept the existing
    // sentences and the role: names format without inferring roles from roster order.
    for (const { items: tasks } of team.periods) {
      for (const task of tasks) {
        const text = task.trim().replace(/[。.]$/, "");
        const labelled = text.match(/^(胸花發放|(?:工作人員)?胸章發放)[：:]\s*(.+)$/);
        const sentence = text.match(/^(.+?)\s*負責\s*(胸花|(?:工作人員)?胸章)(?:發放)?$/);
        if (!labelled && !sentence) continue;
        const role = (labelled?.[1] || sentence[2]).startsWith("胸花") ? distributionRoles[0] : distributionRoles[1];
        const names = (labelled?.[2] || sentence[1]).split(/[、，,／/]/).map((name) => name.trim());
        const ids = [...new Set(names.flatMap((name) => byName.get(name) || []))];
        items.set(task, { role, ids });
        ids.forEach((id) => roles.get(role).add(id));
      }
    }

    const assigned = new Set([...roles.values()].flatMap((ids) => [...ids]));
    return {
      roles: [...roles].map(([label, ids]) => [label, [...ids]]),
      items,
      unassigned: team.memberIds.filter((id) => !assigned.has(id))
    };
  }

  return { teamRoles, distribution };
})();

if (typeof module !== "undefined" && module.exports) module.exports = staffRoster;
