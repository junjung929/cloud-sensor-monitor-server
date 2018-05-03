var express = require("express");
// var expect = require('chai').expect;
var router = express.Router();

// upload img
var multer = require("multer");
var upload = multer({ dest: `/temp/` });
var { uploadToImgur, deleteFromImgur } = require("../controllers/handle_imgur");
var {
  deleteFloor,
  itemRemovedFromAry
} = require("../controllers/handle_delete");
var { addFloorAt } = require("../controllers/handle_add");

var Hospital = require("../models/hospital");
var Floor = require("../models/floor");

router.get("/", function(req, res) {
  Floor.find({})
    .populate("hospital_", "name")
    .sort({ name: 1 })
    .exec(function(err, floors) {
      if (err) {
        res.send(err);
      } else {
        res.send(floors);
        //console.log(JSON.stringify(beds, null, "\t"))
      }
    });
});

router.get("/id=:param", function(req, res) {
  const { param } = req.params;
  const query = { _id: param };

  Floor.findOne(query).exec(function(err, floors) {
    if (err) {
      res.send(err);
    } else {
      res.send(floors);
      //console.log(JSON.stringify(beds, null, "\t"))
    }
  });
});

router.get("/number=:param", function(req, res) {
  const { param } = req.params;
  const query = { number: param };

  Floor.find(query)
    .populate("_room_list")
    .exec(function(err, floors) {
      if (err) {
        res.send(err);
      } else {
        res.send(floors);
        //console.log(JSON.stringify(beds, null, "\t"))
      }
    });
});
router.get("/hospital=", function(req, res) {
  res.send(null);
});
router.get("/hospital=:param", function(req, res) {
  const { param } = req.params;
  const { perPage, page } = req.query;
  const query = { hospital_: param };
  Floor.find(query)
    .limit(parseInt(perPage))
    .skip(perPage * page)
    .sort({ number: "asc" })
    .exec(function(err, floors) {
      if (err) {
        res.send(err);
      }
      Floor.count(query).exec(function(err, count) {
        res.send({
          floors,
          page: parseInt(page),
          pages: count / perPage
        });
      });
    });
});

// insert new floor with img uploading
router.post("/push", upload.single("file"), function(req, res) {
  const { number, hospital_ } = req.query;
  let floor = new Floor({
    number,
    hospital_
  });
  if (req.file) {
    const { path, mimetype } = req.file;

    uploadToImgur(path, floor)
      .then(() => {
        floor
          .save()
          .then(post => {
            addFloorAt(post._id, hospital_)
              .then(post => {
                console.log(`Added the Floor no.${number}!\n`);
                return res.status(200).send(post);
              })
              .catch(err => {
                console.log(`${err}\n`);
                return res.status(500).send(err);
              });
          })
          .catch(err => {
            const errmsg = `Floor uploading is failed`;
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
    floor
      .save()
      .then(post => {
        addFloorAt(post._id, hospital_)
          .then(post => {
            console.log(`Added the Floor no.${number}!\n`);
            return res.status(200).send(post);
          })
          .catch(err => {
            console.log(`${err}\n`);
            return res.status(500).send(err);
          });
      })
      .catch(err => {
        const errmsg = `Floor uploading is failed`;
        console.log(`${errmsg}: ${err}`);
        res.status(500).send({ err: errmsg });
      });
  }
});

// update Floor with img uploading
router.post("/update/id=:id", upload.single("file"), function(req, res, next) {
  const { id } = req.params;
  const { number } = req.query;

  Floor.findById(id, function(err, floor) {
    if (err) {
      return next(err);
    }
    if (!floor) {
      return res.send(404);
    }
    //update
    floor.number = number;

    // if image needs to upate
    if (req.file) {
      const { path, mimetype } = req.file;
      const { imgDeleteHash } = floor;
      //check whether there is already image or not
      if (imgDeleteHash) {
        // delete previous stored img
        deleteFromImgur(imgDeleteHash)
          .then(() => {
            // replace it to new img
            uploadToImgur(path, floor)
              .then(() => {
                floor.save(function(err, post) {
                  res.json(201, floor);
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
        uploadToImgur(path, floor)
          .then(() => {
            floor.save(function(err, post) {
              res.json(201, floor);
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
      floor.save(function(err, post) {
        res.json(201, floor);
      });
    }
  });
});

// delete a Floor
router.delete("/delete/:id", function(req, res, next) {
  const { id } = req.params;
  const { hospital_ } = req.query;
  Floor.findById(id, function(err, floor) {
    if (err) {
      return next(err);
    }
    if (!floor) {
      return res.send(404);
    }
    const { imgDeleteHash } = floor;
    if (imgDeleteHash) {
      deleteFromImgur(imgDeleteHash)
        .then(() => {
          floorRemove(floor, hospital_, id)
            .then(post => {
              console.log(`Deleted floor(${id})!\n`);
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
      floorRemove(floor, hospital_, id)
        .then(post => {
          console.log(`Deleted floor(${id})!\n`);
          return res.send(200);
        })
        .catch(err => {
          console.log(`Err occured while deleting\n${err}\n`);
          console.trace();
          return res.status(500).send(err);
        });
    }
  });
});
function floorRemove(floor, hospital_, floor_id) {
  return new Promise((resolve, reject) => {
    return deleteFloor(hospital_, floor_id)
      .then(() => {
        return floor
          .remove()
          .then(floor => {
            console.log(`Deleted floor(${floor_id})!\n`);
            return itemRemovedFromAry(
              Hospital,
              "_floor_list",
              floor_id,
              hospital_
            )
              .then(post => {
                console.log(`Deleted floor(${floor_id}) from floor list!\n`);
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
