import express from "express";
import fileUpload from "express-fileupload";
import { AzureStorageManager, Container } from "../storage/azure-storage-manager";
import { v4 as uuid } from "uuid";
import { Logger } from "../util/logger";

const logger = new Logger('upload-router');

const router = express.Router();

router.use(fileUpload());

router.post("/post-image", async (req, res) => {
  uploadPicture(req, res, "posts");
});

router.post("/profile-picture", async (req, res) => {
  uploadPicture(req, res, "profile");
});

async function uploadPicture(
  req: express.Request,
  res: express.Response,
  path: string
) {
  if (!req.files || !req.files.image || Array.isArray(req.files.image)) {
    res.status(400).send("No file uploaded");
    return;
  }
  try {
    const image = req.files.image;
    if (!["image/png", "image/jpeg"].includes(image.mimetype)) {
      res.status(400).send("Not supported type");
    }
    const filename = `${
      process.env.NODE_ENV === "dev" ? "dev/" : ""
    }${uuid()}.${image.mimetype.replace("image/", "")}`;
    logger.log(`Start uploading post image ${image.name} as ${filename}`);
    const ress = await AzureStorageManager.uploadBlobData(
      Container.PUBLIC_IMAGE,
      `${path}/${filename}`,
      image.mimetype,
      image.data
    );
    logger.log(`Uploaded ${filename}`);
    res.send(`https://static.ustw.watch/public-image/${path}/${filename}`);
  } catch (err) {
    logger.log(err);
    res.status(500).send(err);
  }
}

export default router;