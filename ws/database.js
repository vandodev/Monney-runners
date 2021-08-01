import mongoose from "mongoose";
import { URI } from "./src/data/keys.js";

let options = {};

mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);

mongoose
  .connect(URI, options)
  .then(() => console.log("DB is Up!"))
  .catch((err) => console.log(err));
