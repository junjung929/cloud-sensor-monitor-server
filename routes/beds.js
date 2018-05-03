var express = require("express");
// var expect = require('chai').expect;
var router = express.Router();

var Room = require("../models/room");
var Bed = require("../models/bed");
var Sensor = require("../models/sensor");

// upload img
var multer = require("multer");
var upload = multer({ dest: `/temp/` });
var { uploadToImgur, deleteFromImgur } = require("../controllers/handle_imgur");
var { deleteBed, itemRemovedFromAry } = require("../controllers/handle_delete");
var { addBedAt, bedSave } = require("../controllers/handle_add");

router.get("/", function(req, res) {
  Bed.find({})
    .populate("hospial_", "name")
    .sort({ name: 1 })
    .exec(function(err, beds) {
      if (err) {
        res.send(err);
      } else {
        res.send(beds);
        //console.log(JSON.stringify(beds, null, "\t"))
      }
    });
});

router.get("/id=:param", function(req, res) {
  const { param } = req.params;
  const query = { _id: param };

  Bed.findOne(query)
    .populate("_patient", "first_name last_name")
    .populate("_sensor_node", "node_name")
    .exec(function(err, beds) {
      if (err) {
        res.send(err);
      } else {
        res.send(beds);
        //console.log(JSON.stringify(beds, null, "\t"))
      }
    });
});

router.get("/number=:param", function(req, res) {
  const { param } = req.params;
  const query = { number: param };

  Bed.find(query)
    .populate("_patient")
    .exec(function(err, beds) {
      if (err) {
        res.send(err);
      } else {
        res.send(beds);
        //console.log(JSON.stringify(beds, null, "\t"))
      }
    });
});
router.get("/room=", function(req, res) {
  res.send(null);
});
router.get("/room=:param", function(req, res) {
  const { param } = req.params;
  const query = { room_: param };
  const { perPage, page } = req.query;

  Bed.find(query)
    .populate("_sensor_node", "node_name")
    .populate(
      "_patient",
      "first_name last_name birth phone_number enter_date leave_date imgSrc address"
    )
    .limit(parseInt(perPage))
    .skip(perPage * page)
    .sort({ number: "asc" })
    .exec(function(err, beds) {
      if (err) {
        res.send(err);
      }
      Bed.count(query).exec(function(err, count) {
        res.send({
          beds,
          page: parseInt(page),
          pages: count / perPage
        });
      });
    });
});
router.get("/free/room=:param", function(req, res) {
  let { param } = req.params;
  let query = {
    $and: [{ room_: param }, { _patient: null }]
  };

  Bed.find(query, function(err, beds) {
    if (err) throw err;
    res.json(beds);
  });
});

// insert new floor with img uploading
router.post("/push", upload.single("file"), function(req, res) {
  const date = new Date();
  console.log(`\nRequest at ${date.toString()}\nBed adding....`);

  const { number, room_ } = req.query;
  let { _sensor_node, _patient, hospital_, floor_ } = req.query;
  let bed = new Bed({
    number,
    room_,
    _sensor_node: _sensor_node ? _sensor_node : undefined,
    _patient: _patient ? _patient : undefined
  });
  if (req.file) {
    console.log(`\nImage uploading...`);
    const { path, mimetype } = req.file;
    uploadToImgur(path, bed)
      .then(() => {
        `Uploaded!\nAdding the Bed no.${number}...`;
        bed
          .save()
          .then(post => {
            addBedAt(
              post._id,
              room_,
              res,
              _sensor_node,
              _patient,
              hospital_,
              floor_
            )
              .then(post => {
                console.log(`Added the Bed no.${number}!\n`);
                return res.status(200).send(post);
              })
              .catch(err => {
                console.log(`${err}\n`);
                return res.status(500).send(err);
              });
          })
          .catch(err => {
            const errmsg = `Bed uploading is failed`;
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
    `Adding the Bed no.${number}...`;
    bed
      .save()
      .then(post => {
        addBedAt(
          post._id,
          room_,
          res,
          _sensor_node,
          _patient,
          hospital_,
          floor_
        )
          .then(post => {
            console.log(`Added the Bed no.${number}!\n`);
            return res.status(200).send(post);
          })
          .catch(err => {
            console.log(`${err}\n`);
            return res.status(500).send(err);
          });
      })
      .catch(err => {
        const errmsg = `Bed uploading is failed`;
        console.log(`${errmsg}: ${err}`);
        res.status(500).send({ err: errmsg });
      });
  }
});

// update hospital with img uploading
router.post("/update/id=:id", upload.single("file"), function(req, res, next) {
  const { id } = req.params;
  const {
    number,
    _sensor_node,
    _patient,
    hospital_,
    floor_,
    room_
  } = req.query;

  Bed.findById(id, function(err, bed) {
    if (err) {
      return next(err);
    }
    if (!bed) {
      return res.send(404);
    }
    //update
    bed.number = number;
    bed._sensor_node = _sensor_node ? _sensor_node : undefined;
    bed._patient = _patient ? _patient : undefined;
    // if image needs to upate
    if (req.file) {
      const { path, mimetype } = req.file;
      const { imgDeleteHash } = bed;
      //check whether there is already image or not
      if (imgDeleteHash) {
        // delete previous stored img
        deleteFromImgur(imgDeleteHash)
          .then(() => {
            // replace it to new img
            uploadToImgur(path, bed)
              .then(() => {
                bed.save(function(err, post) {
                  bedSave(
                    bed._id,
                    _sensor_node,
                    _patient,
                    hospital_,
                    floor_,
                    room_
                  );
                  res.send(204);
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
        uploadToImgur(path, bed)
          .then(() => {
            bed.save(function(err, post) {
              bedSave(
                post._id,
                _sensor_node,
                _patient,
                hospital_,
                floor_,
                room_
              );
              res.send(204);
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
      bed.save(function(err, post) {
        bedSave(post._id, _sensor_node, _patient, hospital_, floor_, room_);
        res.send(204);
      });
    }
  });
});

// delete a bed
router.delete("/delete/:id", function(req, res, next) {
  const { id } = req.params;

  Bed.findById(id, function(err, bed) {
    if (err) {
      return next(err);
    }
    if (!bed) {
      return res.send(404);
    }
    const { imgDeleteHash } = bed;
    if (imgDeleteHash) {
      deleteFromImgur(imgDeleteHash)
        .then(() => {
          bedRemove(bed, bed.room_, id)
            .then(post => {
              console.log(`Deleted bed(${id})!\n`);
              return res.send(200);
            })
            .catch(err => {
              console.log(`Err occured while deleting\n${err}\n`);
              return res.status(500).send(err);
            });
        })
        .catch(reason => {
          console.log(`image delete is failed: ${reason}`);
        });
    } else {
      bedRemove(bed, bed.room_, id)
        .then(post => {
          console.log(`Deleted bed(${id})!\n`);
          return res.send(200);
        })
        .catch(err => {
          console.log(`Err occured while deleting\n${err}\n`);
          return res.status(500).send(err);
        });
    }
  });
});
function bedRemove(bed, room_, bed_id) {
  return new Promise((resolve, reject) => {
    return deleteBed(bed, room_, bed_id)
      .then(() => {
        return bed
          .remove()
          .then(bed => {
            console.log(`Deleted bed(${bed_id})!\n`);
            return itemRemovedFromAry(Room, "_bed_list", bed_id, room_)
              .then(post => {
                console.log(`Deleted bed(${bed_id}) from bed list!\n`);
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
