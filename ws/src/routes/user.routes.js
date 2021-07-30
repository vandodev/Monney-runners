import express from "express";
import mongoose from "mongoose";
import Busboy from "busboy";
import bcrypt from "bcrypt";
import moment from "moment";

import aws from "../services/aws.js";

const router = express.Router();

router.post("/", async (req, res) => {
  var busboy = new Busboy({ headers: req.headers });
  busboy.on("finish", async () => {
    try {
      //upload da imagem
      const userId = mongoose.Types.ObjectId();
      let photo = "";

      if (req.files) {
        const file = req.files.photo;

        const nameParts = file.name.split(".");
        const fileName = `${userId}.${nameParts[nameParts.length - 1]}`;
        photo = `tabUsers/${fileName}`;

        const response = await aws.uploadToS3(
          file,
          photo
          //, acl = https://docs.aws.amazon.com/pt_br/AmazonS3/latest/dev/acl-overview.html
        );

        if (response.error) {
          // errors.push({ error: true, message: response.message.message });
          res.json({
            error: true,
            message: response.message,
          });
          return false;
        }
      }
    } catch (err) {
      res.json({ error: true, message: err.message });
    }
  });
  req.pipe(busboy);
});

export default router;
