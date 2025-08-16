import { Ground } from "../../db.js";

export const fetchGrounds = async (req, res) => {
  const grounds = await Ground.find({});
  if (grounds.length == 0) {
    return res.send("No grounds available");
  }

  return res.send(grounds);
};
