import express from "express";
import mongoose from "mongoose";
import Busboy from "busboy";
import bcrypt from "bcrypt";
import moment from "moment";

import aws from "../services/aws.js";

import User from "../models/user.js";

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

      // CRIAR SENHA COM BCRYPT
      const password = await bcrypt.hash(req.body.password, 10);

      const user = await new User({
        ...req.body,
        _id: userId,
        password,
        photo,
      }).save();

      res.json({ user });
    } catch (err) {
      res.json({ error: true, message: err.message });
    }
  });
  req.pipe(busboy);
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email,
      status: "A",
    });

    if (!user) {
      res.json({ error: true, message: "Nenhum e-mail ativo encontrado." });
      return false;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.json({
        error: true,
        message: "Combinação errada de E-mail / Senha.",
      });
      return false;
    }
    delete user.password;
    res.json({
      user,
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

export default router;
