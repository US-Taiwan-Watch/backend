import express from "express";
import fileUpload from "express-fileupload";
import { NotionSyncResolver } from "../resolver/notion-sync.resolver";

const router = express.Router();

router.use(fileUpload());

// router.get("/notion/:table", async (req, res) => {
//   if (!Object.values(TableName).includes(req.params.table as TableName)) {
//     res.status(400).send("wrong table");
//     return;
//   }
//   await new NotionSyncResolver().syncFromNotion(req.params.table as TableName);
//   res.status(200).send("done");
// });

export default router;
