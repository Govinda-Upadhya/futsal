import { Admin, Ground } from "../../db.js";
import { toMinutes } from "../../lib.js";

export const createGround = async (req, res) => {
  const { name, image, address, availability, description } = req.body;
  try {
    const groundExists = await Ground.find({
      name: { $regex: String(name || ""), $options: "i" },
      description: { $regex: String(description || ""), $options: "i" },
      address: { $regex: String(address || ""), $options: "i" },
    });

    if (groundExists.length != 0) {
      return res.send("Ground already exists");
    }
    for (const time of availability) {
      if (!time.start || !time.end) {
        return res.status(400).send("Start and end times are required");
      }

      const start = time.start.trim();
      const end = time.end.trim();

      if (toMinutes(start) > toMinutes(end)) {
        return res.status(400).send(`Invalid time range: ${start} - ${end}`);
      }
    }
    const admin = await Admin.findOne({ email: req.admin.email });
    const createGround = await Ground.create({
      name: name,
      description: description,
      address: address,
      availability: availability,
      images: image,
      admin: admin._id,
    });
    return res.send("ground created");
  } catch (error) {
    console.log(error);
    return res.send("ground couldnt be created");
  }
};

export const deleteGround = async (req, res) => {
  const groundId = req.params.id;
  try {
    const groundExists = await Ground.findById(groundId);
    if (!groundExists) {
      return res.send("the ground doesnt exists");
    }
    const deleted = await Ground.findByIdAndDelete(groundId);
    if (!deleted) {
      return res.send("Ground couldnt be deleted, try again letter");
    }
    return res.send("Ground removed successfully");
  } catch (error) {
    console.log(error);
    return res.send("some error occured");
  }
};

export const updateGround = async (req, res) => {
  const groundId = req.params.id;
  const { name, image, address, availability, description } = req.body;

  try {
    const groundExists = await Ground.findById(groundId);
    if (!groundExists) {
      return res.send("the ground doesnt exists");
    }
    for (const time of availability) {
      if (!time.start || !time.end) {
        return res.status(400).send("Start and end times are required");
      }

      const start = time.start.trim();
      const end = time.end.trim();

      if (toMinutes(start) > toMinutes(end)) {
        return res.status(400).send(`Invalid time range: ${start} - ${end}`);
      }
    }
    const updatedGround = await Ground.findByIdAndUpdate(groundId, {
      name,
      images: image,
      address,
      availability,
      description,
    });
    if (!updatedGround) {
      return res.send("Ground couldnt be updated, try again letter");
    }
    return res.send("Ground updated successfully");
  } catch (error) {
    console.log(error);
    return res.send("some error occured");
  }
};

export const viewGrounds = async (req, res) => {
  const admin = await Admin.findOne({ email: req.admin.email });
  const grounds = await Ground.find({
    admin: admin._id,
  });
  if (grounds.length == 0) {
    return res.send("no grounds for this admin");
  }
  return res.send(grounds);
};
export const viewGround = async (req, res) => {
  const id = req.params.id;
  const admin = await Admin.findOne({ email: req.admin.email });

  const ground = await Ground.findOne({ _id: id });

  if (ground.length == 0) {
    return res.send("no such ground exists");
  }
  if (admin._id.toString() != ground.admin) {
    return res.send("You are not authorized to see this ground");
  }
  return res.send(ground);
};
