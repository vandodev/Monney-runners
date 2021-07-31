import express from "express";
import mongoose from "mongoose";
import Busboy from "busboy";
import bcrypt from "bcrypt";
import moment from "moment";

import aws from "../services/aws.js";
import pagarme from "../services/pagarme.js";

import User from "../models/user.js";
import Challenge from "../models/challenge.js";
import UserChallenge from "../models/relationship/userChallenge.js";

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

router.put("/:userId/accept", async (req, res) => {
  try {
    const { userId } = req.params;
    let user = await User.findById(userId);

    const pargamerUser = await pagarme("/customers", {
      external_id: userId,
      name: user.name,
      type: "individual",
      country: "br",
      email: user.email,
      documents: [
        {
          type: "cpf",
          // number: user.document,
          number: user.cpf,
        },
      ],
      phone_numbers: [`+55${user.phone}`],
      birthday: user.birthday,
    });
    if (pargamerUser.error) {
      throw pargamerUser;
    }

    user = await User.findByIdAndUpdate(userId, {
      status: "active",
      externalId: pargamerUser.data.id,
      updatedAt: Date.now(),
    });

    res.json({ error: false, user });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

export default router;
