import { uploadTaiwanMedia } from './endpoints/uploadMedia';
import { CMS_ORIGIN, WEB_ORIGINS, productionConfig } from './runtime/config';
import { storagePlugins } from './runtime/media';
import { podcastEndpoint } from './runtime/podcast';
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtime = productionConfig();


import { mongooseAdapter } from "@payloadcms/db-mongodb";

import { slateEditor } from "@payloadcms/richtext-slate";
import { buildConfig } from "payload";

import { Admin } from "./collections/Admin";
import { Peoples } from "./collections/Peoples";
import { Bills } from "./collections/Bills";
import { Votes } from "./collections/Votes";
import { UstwAuthors } from "./collections/Ustw/Authors";
import { UstwArticles } from "./collections/Ustw/Articles";
import { UstwProjects } from "./collections/Ustw/Projects";
import { UstwMembers } from "./collections/Ustw/Members";
import { UstwFootprints } from "./collections/Ustw/Footprints";
import { KetagalanAuthors } from "./collections/Ketagalan/Authors";
import { KetagalanArticles } from "./collections/Ketagalan/Articles";
import { KetagalanProjects } from "./collections/Ketagalan/Projects";
import { KetagalanMembers } from "./collections/Ketagalan/Members";
import { KetagalanFootprints } from "./collections/Ketagalan/Footprints";
import { TaiwanRecords } from "./collections/TaiwanRecords";
import { Tags } from "./collections/Tags";
import { CategoriesArticle, CategoriesBill, CategoriesKetagalan, CategoriesPeople } from "./collections/Categories";
import { Members } from "./collections/Members";
import { MediaArticle, MediaTaiwanRecord, MediaPeople, MediaKetagalan, MediaProject, MediaMember } from "./collections/Media";

import { addViewCountPeopleMutation } from "./collections/Peoples/mutations/addViewCount";
import { getMemberCustomizedMutations } from "./collections/Members/mutations";
import { getTaiwanRecordCustomizedMutations } from "./collections/TaiwanRecords/mutations";

import { addBillCountPeopleQuery } from "./collections/Peoples/queries/addBillCount";
import { getBillCustomizedQueries } from "./collections/Bills/queries";
import { getMeInfoQueries } from "./collections/Members/queries";
import { getPeopleCustomizedQueries } from "./collections/Peoples/queries";

export default buildConfig({
  cookiePrefix: 'ustw-cms',
  endpoints: [
    { path: '/taiwan-record-media', method: 'post', handler: uploadTaiwanMedia },
    { path: '/health', method: 'get', handler: async req => Response.json({ status: (req.payload.db as any).connection?.readyState === 1 ? 'ok' : 'unavailable', automaticUpdates: false, newsletters: false }, { status: (req.payload.db as any).connection?.readyState === 1 ? 200 : 503, headers: { 'cache-control': 'no-store' } }) },
    { path: '/podcast-options', method: 'get', handler: podcastEndpoint },
  ],
  admin: {
    avatar: 'default',
    user: Admin.slug,
    importMap: { baseDir: __dirname },
  },
  editor: slateEditor({}),
  collections: [
    Peoples,
    Bills,
    Votes,
    Tags,
    TaiwanRecords,
    UstwArticles,
    UstwAuthors,
    UstwProjects,
    UstwMembers,
    UstwFootprints,
    KetagalanArticles,
    KetagalanAuthors,
    KetagalanProjects,
    KetagalanMembers,
    KetagalanFootprints,
    CategoriesArticle,
    CategoriesKetagalan,
    CategoriesPeople,
    CategoriesBill,
    MediaArticle,
    MediaKetagalan,
    MediaPeople,
    MediaTaiwanRecord,
    MediaProject,
    MediaMember,
    Admin,
    Members,
  ],
  typescript: {
    outputFile: path.resolve(__dirname, "payload-types.ts"),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, "generated-schema.graphql"),
    disablePlaygroundInProduction: true,
    queries: (GraphQL, payload) => ({
      ...addBillCountPeopleQuery(GraphQL, payload),
      ...getBillCustomizedQueries(GraphQL, payload),
      ...getPeopleCustomizedQueries(GraphQL, payload),
      ...getMeInfoQueries(GraphQL, payload),
    }),
    mutations: (GraphQL, payload) => ({
      ...addViewCountPeopleMutation(GraphQL, payload),
      ...getMemberCustomizedMutations(GraphQL, payload),
      ...getTaiwanRecordCustomizedMutations(GraphQL, payload),
    }),
  },
  serverURL: CMS_ORIGIN,
  cors: WEB_ORIGINS,
  csrf: WEB_ORIGINS,
  secret: runtime.payloadSecret,
  sharp,
  upload: { requestSizeLimit: 6 * 1024 * 1024, limits: { fileSize: 2 * 1024 * 1024 }, abortOnLimit: true },
  telemetry: false,
  email: () => ({ name: "delivery-disabled", defaultFromName: "USTW", defaultFromAddress: "contact@ustw.watch", sendEmail: async () => { throw new Error("Email delivery is disabled for this release"); } }),
  plugins: storagePlugins(),
  db: mongooseAdapter({
    url: runtime.databaseURI,
    connectOptions: { autoIndex: false, ...(runtime.caFile ? { tls: true, tlsCAFile: runtime.caFile } : {}) },
  }),

});
