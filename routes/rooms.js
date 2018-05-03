var express = require("express");
// var expect = require('chai').expect;
var router = express.Router();

// upload img
var multer = require("multer");
var upload = multer({ dest: `/temp/` });
var { uploadToImgur, deleteFromImgur } = require("../controllers/handle_imgur");
var {
  deleteRoom,
  itemRemovedFromAry
} = require("../controllers/handle_delete");
var { addRoomAt } = require("../controllers/handle_add");

var Floor = require("../models/floor");
var Room = require("../models/room");

router.get("/", function(req, res) {
  Room.find({})
    .sort({ number: 1 })
    .exec(function(err, rooms) {
      if (err) {
        res.send(err);
      } else {
        res.send(rooms);
        //console.log(JSON.stringify(beds, null, "\t"))
      }
    });
});
router.get("/id=:param", function(req, res) {
  const { param } = req.params;
  const query = { _id: param };

  Room.findOne(query)
    .sort({ number: 1 })
    .exec(function(err, rooms) {
      if (err) {
        res.send(err);
      } else {
        res.send(rooms);
        //console.log(JSON.stringify(beds, null, "\t"))
      }
    });
});
router.get("/room_class=:param", function(req, res) {
  const { param } = req.params;
  const query = { room_class: param };

  Room.find(query)
    .populate("_bed_list")
    .exec(function(err, rooms) {
      if (err) {
        res.send(err);
      } else {
        res.send(rooms);
        //console.log(JSON.stringify(beds, null, "\t"))
      }
    });
});
router.get("/number=:param", function(req, res) {
  const { param } = req.params;
  const query = { number: param };

  Room.find(query)
    .populate("_bed_list")
    .exec(function(err, rooms) {
      if (err) {
        res.send(err);
      } else {
        res.send(rooms);
        //console.log(JSON.stringify(beds, null, "\t"))
      }
    });
});
router.get("/floor=", function(req, res) {
  res.send(null);
});
router.get("/floor=:param", function(req, res) {
  const { param } = req.params;
  const { perPage, page } = req.query;
  const query = { floor_: param };

  Room.find(query)
    .populate("_bed_list")
    .limit(parseInt(perPage))
    .skip(perPage*page)
    .sort({number: 'asc'})
    .exec(function(err, rooms) {
      if (err) {
        res.send(err);
      }
      Room.count(query).exec(function(err, count){
        res.send({
          rooms,
          page: parseInt(page),
          pages: count / perPage
        });
      })
    });
});
// insert new floor with img uploading
router.post("/push", upload.single("file"), function(req, res) {
  const { number, room_class, floor_ } = req.query;
  let room = new Room({
    number,
    room_class,
    floor_
  });
  if (req.file) {
    const { path, mimetype } = req.file;

    uploadToImgur(path, room)
      .then(() => {
        room
          .save()
          .then(post => {
            addRoomAt(post.id, floor_)
              .then(post => {
                console.log(`Added the Room no.${number}!\n`);
                return res.status(200).send(post);
              })
              .catch(err => {
                console.log(`${err}\n`);
                return res.status(500).send(err);
              });
          })
          .catch(err => {
            const errmsg = `Room uploading is failed`;
            console.log(`${errmsg}: ${err}`);
            res.status(500).send({ err: errmsg });
          });
      })
      .catch(reason => {
        const errmsg = `Image uploading is failed`;
        console.log(`${errmsg}: ${reason}`);
        res.status(500).send({ err: errmsg });
      });
  } else {
    room
      .save()
      .then(post => {
        addRoomAt(post.id, floor_)
          .then(post => {
            console.log(`Added the Room no.${number}!\n`);
            return res.status(200).send(post);
          })
          .catch(err => {
            console.log(`${err}\n`);
            return res.status(500).send(err);
          });
      })
      .catch(err => {
        const errmsg = `Room uploading is failed`;
        console.log(`${errmsg}: ${err}`);
        res.status(500).send({ err: errmsg });
      });
  }
});

// update hospital with img uploading
router.post("/update/id=:id", upload.single("file"), function(req, res, next) {
  const { id } = req.params;
  const { number, room_class } = req.query;

  Room.findById(id, function(err, room) {
    if (err) {
      return next(err);
    }
    if (!room) {
      return res.send(404);
    }
    //update
    room.number = number;
    room.room_class = room_class;

    // if image needs to upate
    if (req.file) {
      const { path, mimetype } = req.file;
      const { imgDeleteHash } = room;
      //check whether there is already image or not
      if (imgDeleteHash) {
        // delete previous stored img
        deleteFromImgur(imgDeleteHash)
          .then(() => {
            // replace it to new img
            uploadToImgur(path, room)
              .then(() => {
                room.save(function(err, post) {
                  res.json(201, room);
                });
              })
              .catch(reason => {
                const errmsg = `While updating, image update is failed`;
                console.log(`${errmsg}: ${reason}`);
                res.status(500).send({ err: errmsg });
              });
          })
          .catch(reason => {
            const errmsg = `While updating, image delete is failed`;
            console.log(`${errmsg}: ${reason}`);
            res.status(500).send({ err: errmsg });
          });
      } else {
        // if there is no stored img, then just upload new img
        uploadToImgur(path, room)
          .then(() => {
            room.save(function(err, post) {
              res.json(201, room);
            });
          })
          .catch(reason => {
            const errmsg = `While updating, image upload is failed`;
            console.log(`${errmsg}: ${reason}`);
            res.status(500).send({ err: errmsg });
          });
      }
    } else {
      // if img doesn't need to update, then just save changes
      room.save(function(err, post) {
        res.json(201, room);
      });
    }
  });
});

// delete a hospital
router.delete("/delete/:id", function(req, res, next) {
  const { id } = req.params;
  const { floor_ } = req.query;
  Room.findById(id, function(err, room) {
    if (err) {
      return next(err);
    }
    if (!room) {
      return res.send(404);
    }
    const { imgDeleteHash } = room;
    if (imgDeleteHash) {
      deleteFromImgur(imgDeleteHash)
        .then(() => {
          roomRemove(room, floor_, room_id);
        })
        .catch(reason => {
          console.log(`image delete is failed: ${reason}`);
        });
    } else {
      roomRemove(room, floor_, room_id);
    }
  });
});

function roomRemove(room, floor_, room_id) {
  return new Promise((resolve, reject) => {
    return deleteRoom(floor_, room_id)
      .then(() => {
        return room
          .remove()
          .then(room => {
            console.log(`Deleted room(${room_id})!\n`);
            return itemRemovedFromAry(Floor, "_room_list", room_id, floor_)
              .then(post => {
                console.log(`Deleted room(${room_id}) from room list!\n`);
                return resolve(post);
              })
              .catch(err => {
                console.log(`Err occured while deleting\n${err}\n`);
                console.trace();
                return reject(err);
              });
          })
          .catch(err => {
            console.log(`Err occured while deleting\n${err}\n`);
            console.trace();
            return reject(err);
          });
      })
      .catch(err => {
        console.log(`Err occured while deleting\n${err}\n`);
        console.trace();
        return reject(err);
      });
  });
}
module.exports = router;
