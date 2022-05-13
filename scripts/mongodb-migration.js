// Members
// Step 1: Extract members from legacy table, transform and load to another table legacy.members
// Can update `db.members.insert` to `print` to view the transform result
db.entities.find({_type: 4}).forEach(
  x => db.members.insert(Object.assign(
    Object.fromEntries(Object.entries(x).filter(([k, v]) => !['profilePictures', '_type'].includes(k))),
    {
      congressRoles: x.congressRoles.map(r => Object.assign(r, {
        startDate: r.startDate == null ? undefined : new Date(r.startDate).toISOString().slice(0, 10),
        endDate: r.endDate == null ? undefined : new Date(r.endDate).toISOString().slice(0, 10),
        legacyStartDate: r.startDate,
        legacyEndDate: r.endDate
      }))
    }))
)

// Step 2: Move legacy.members to ustw.members
db.adminCommand(
  {
    renameCollection: 'legacy.members',
    to: 'ustw.members'
  }
)

// Bills
