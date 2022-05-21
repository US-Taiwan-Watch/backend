// Members
// Step 1: Extract members from legacy table, transform and load to another table legacy.members
// Can update `db.members.insert` to `print` to view the transform result
db.entities.find({_type: 4, bioGuideId: {$exists: true}}).forEach(
  x => db.members.insert(Object.assign(
    Object.fromEntries(Object.entries(x).filter(([k, v]) => !['profilePictures', '_type', 'bioGuideId'].includes(k))),
    {
      _id: x.bioGuideId,
      congressRoles: x.congressRoles.map(r => Object.assign(r, {
        startDate: r.startDate == null ? undefined : new Date(r.startDate).toISOString().slice(0, 10),
        endDate: r.endDate == null ? undefined : new Date(r.endDate).toISOString().slice(0, 10),
        legacyStartDate: r.startDate,
        legacyEndDate: r.endDate
      }))
    }))
)

// Tags
db.entities.find({_type: 5}).forEach(
  x => {
    if (!db.assocs.findOne({_type: 1005, _id2: x._id})) {
      return
    }
    db.tags.insert({
      _id: x._id,
      name: {
        zh: x.name_zh,
        en: x.name
      }
    })
  }
)

// Bills
db.entities.find({_type: 3}).forEach(
  x => {
    print(x._id)
    let bill = Object.assign(
      Object.fromEntries(Object.entries(x).filter(([k, v]) => !['s3Entity', '_type', 'title', 'title_zh', 'summary', 'summary_zh'].includes(k))),
      {
        _id: x.congress + x.billType + x.billNumber,
        title: {
          en: x.title,
          zh: x.title_zh
        },
        summary: {
          en: x.summary,
          zh: x.summary_zh
        },
        cosponsorInfos: db.assocs.find({_type: 1004, _id2: x._id}).toArray().map(r => ({
          date: r.date == null ? undefined : new Date(r.date).toISOString().slice(0, 10),
          memberId: db.entities.findOne({ _type: 4, _id: r._id1}).bioGuideId
        }))
      })
    if (x.introducedDate) {
      bill.introducedDate = x.introducedDate == null ? undefined : new Date(x.introducedDate).toISOString().slice(0, 10)
    }
    if (x.versions) {
      bill.versions = x.versions.map(r => Object.assign(
        Object.fromEntries(Object.entries(r).filter(([k, v]) => !['id', 'documents'].includes(k))),
        {
          date: r.date == null ? undefined : new Date(r.date).toISOString().slice(0, 10)
        }))
    }
    if (x.actions) {
      bill.actions = x.actions.map(r => Object.assign(r, {
        date: r.datetime == null ? undefined : new Date(r.datetime).toISOString().slice(0, 10)
      }))
    }
    if (x.actionsAll) {
      bill.actionsAll = x.actionsAll.map(r => Object.assign(r, {
        date: r.datetime == null ? undefined : new Date(r.datetime).toISOString().slice(0, 10)
      }))
    }
    if (x.tags) {
      bill.tags = db.assocs.find({_type: 1005, _id1: x._id}).map(y => y._id2).toArray()
    }
    const sponsorEdge = db.assocs.findOne({_type: 1003, _id2: x._id})
    if (sponsorEdge) {
      bill.sponsorId = db.entities.findOne({ _type: 4, _id: sponsorEdge._id1}).bioGuideId
    }
    db.bills.insert(bill)
  }
)

// Step 2: Move legacy.members to ustw.members
db.adminCommand(
  {
    renameCollection: 'legacy.members',
    to: 'ustw.members'
  }
)
