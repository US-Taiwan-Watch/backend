// Members
// Step 1: Extract members from legacy table, transform and load to another table legacy.members
// Can update `db.members.insert` to `print` to view the transform result
db.entities.find({ _type: 4, bioGuideId: { $exists: true } }).forEach(x =>
  db.members.insert(
    Object.assign(
      Object.fromEntries(
        Object.entries(x).filter(
          ([k, v]) => !["profilePictures", "_type", "bioGuideId"].includes(k),
        ),
      ),
      {
        _id: x.bioGuideId,
        congressRoles: x.congressRoles.map(r =>
          Object.assign(r, {
            startDate:
              r.startDate == null
                ? undefined
                : new Date(r.startDate).toISOString().slice(0, 10),
            endDate:
              r.endDate == null
                ? undefined
                : new Date(r.endDate).toISOString().slice(0, 10),
            legacyStartDate: r.startDate,
            legacyEndDate: r.endDate,
          }),
        ),
      },
    ),
  ),
);

// Tags
db.entities.find({ _type: 5 }).forEach(x => {
  if (!db.assocs.findOne({ _type: 1005, _id2: x._id })) {
    return;
  }
  db.tags.insert({
    _id: x._id,
    name: {
      zh: x.name_zh,
      en: x.name,
    },
  });
});

// Bills
db.entities.find({ _type: 3 }).forEach(x => {
  print(x._id);
  let bill = Object.assign(
    Object.fromEntries(
      Object.entries(x).filter(
        ([k, v]) =>
          ![
            "s3Entity",
            "_type",
            "title",
            "title_zh",
            "summary",
            "summary_zh",
          ].includes(k),
      ),
    ),
    {
      _id: x.congress + "-" + x.billType + "-" + x.billNumber,
      title: {
        en: x.title,
        zh: x.title_zh,
      },
      summary: {
        en: x.summary,
        zh: x.summary_zh,
      },
      cosponsorInfos: db.assocs
        .find({ _type: 1004, _id2: x._id })
        .toArray()
        .map(r => ({
          date:
            r.date == null
              ? undefined
              : new Date(r.date).toISOString().slice(0, 10),
          memberId: db.entities.findOne({ _type: 4, _id: r._id1 }).bioGuideId,
        })),
      tags: db.assocs
        .find({ _type: 1005, _id1: x._id })
        .toArray()
        .map(r => r._id2),
    },
  );
  if (x.introducedDate) {
    bill.introducedDate =
      x.introducedDate == null
        ? undefined
        : new Date(x.introducedDate).toISOString().slice(0, 10);
  }
  if (x.versions) {
    bill.versions = x.versions.map(r =>
      Object.assign(
        Object.fromEntries(
          Object.entries(r).filter(
            ([k, v]) => !["id", "documents"].includes(k),
          ),
        ),
        {
          date:
            r.date == null
              ? undefined
              : new Date(r.date).toISOString().slice(0, 10),
        },
      ),
    );
  }
  if (x.actions) {
    bill.actions = x.actions.map(r =>
      Object.assign(r, {
        date:
          r.datetime == null
            ? undefined
            : new Date(r.datetime).toISOString().slice(0, 10),
      }),
    );
  }
  if (x.actionsAll) {
    bill.actionsAll = x.actionsAll.map(r =>
      Object.assign(r, {
        date:
          r.datetime == null
            ? undefined
            : new Date(r.datetime).toISOString().slice(0, 10),
      }),
    );
  }
  if (x.tags) {
    bill.tags = db.assocs
      .find({ _type: 1005, _id1: x._id })
      .map(y => y._id2)
      .toArray();
  }
  const sponsorEdge = db.assocs.findOne({ _type: 1003, _id2: x._id });
  if (sponsorEdge) {
    bill.sponsorId = db.entities.findOne({
      _type: 4,
      _id: sponsorEdge._id1,
    }).bioGuideId;
  }
  db.bills.insert(bill);
});

// Step 2: Move legacy.members to ustw.members
db.adminCommand({
  renameCollection: "legacy.members",
  to: "ustw.members",
});

// Sync FB posts to articles
var crypto = require("crypto");
db.fb_posts2.find({ found_in_dp: true }).forEach(post => {
  const message = post.message.replace(/​/g, "");
  const title = message.split("\n")[0];
  const text = message
    .replace(title, "")
    .replace(/^\s+/, "")
    .replace(/\n/g, "\\n")
    .replace(/"/g, '\\"')
    .replace(/\u0008/g, "");

  var myValue = post.id;
  var myHash = crypto.createHash("md5").update(myValue).digest("hex");
  var id =
    myHash.substr(0, 8) +
    "-" +
    myHash.substr(8, 4) +
    "-" +
    "4" +
    myHash.substr(13, 3) +
    "-" +
    "a" +
    myHash.substr(16, 3) +
    "-" +
    myHash.substr(19, 12);

  // const id = UUID()
  //   .toString("hex")
  //   .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
  const article = {
    id,
    _id: id,
    title: { zh: title },
    content: `{"id":"yqsyyd","version":1,"rows":[{"id":"518dnt","cells":[{"id":"72dy7s","size":12,"plugin":{"id":"ory/editor/core/content/slate","version":1},"dataI18n":{"zh":{"slate":[{"type":"PARAGRAPH/PARAGRAPH","children":[{"text":"${text}"}]}]}},"rows":[],"inline":null}]}]}`,
    authors: ["google-oauth2|117639421567357025264"],
    imageSource: `https://static.ustw.watch/public-image/posts/${post.id}.jpg`,
    type: 1,
    createdTime: new Date(post.created_time).getTime(),
    lastModifiedTime: new Date(post.updated_time).getTime(),
    fbPostId: post.id,
    tags: [],
    deleted: false,
    isPublished: true,
    publishedTime: new Date(post.created_time).getTime(),
  };
  db.articles.insertOne(article);
});
