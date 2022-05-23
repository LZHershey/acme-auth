const Sequelize = require("sequelize");
const { STRING } = Sequelize;
const jwt = require("jsonwebtoken");
const bycrypt = require("bcrypt");
const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

User.byToken = async (token) => {
  try {
    const user = await jwt.verify(token, "shh");
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });

  if (await bycrypt.compare(password, user.password)) {
    const token = await jwt.sign(user.dataValues, "shh");
    return token;
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

User.beforeCreate(async (user) => {
  let hashed = await bycrypt.hash(user.password, 5);
  user.password = hashed;
});

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const notes = [
    { text: "Something" },
    { text: "Another thing" },
    { text: "List of passwords" },
    { text: "Wow coding is fun" },
    { text: "Hello world" },
  ];
  const [note1, note2, note3, note4, note5] = await Promise.all(
    notes.map((note) => Note.create(note))
  );

  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );

  await lucy.setNotes([note1, note2]);
  await moe.setNotes([note3, note4]);
  await larry.setNotes([note5]);
  return {
    users: {
      lucy,
      moe,
      larry,
    },
    notes: {
      note1,
      note2,
      note3,
      note4,
      note5,
    },
  };
};

Note.belongsTo(User);
User.hasMany(Note);

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
