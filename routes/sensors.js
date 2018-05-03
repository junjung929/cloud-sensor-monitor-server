var express = require("express");
var router = express.Router();

var Sensor = require("../models/sensor");
var Bed = require("../models/bed");

var { isBedEmpty, itemDeployedAt } = require("../controllers/handle_add");
var { itemRemovedFrom } = require("../controllers/handle_delete");

/* GET users listing. */
router.get("/", function(req, res, next) {
  const { perPage, page } = req.query;

  Sensor.find()
    .populate("bed_", "number")
    .populate("hospital_", "name")
    .populate("floor_", "number")
    .populate("room_", "number")
    .populate("bed_", "number _sensor_node")
    .limit(parseInt(perPage))
    .sort({ node_name: 1 })
    .exec()
    .then(sensors => {
      Sensor.count()
        .exec()
        .then(count => {
          res.send({
            sensors,
            page: parseInt(page),
            pages: count / perPage
          });
        })
        .catch(err => {
          res.send(err);
        });
    })
    .catch(err => {
      res.send(err);
    });
});
router.get("/free", function(req, res, next) {
  Sensor.find({ bed_: null })
    .populate("bed_", "number")
    .populate("hospital_", "name")
    .populate("floor_", "number")
    .populate("room_", "number")
    .populate("bed_", "number _sensor_node")
    .sort({ node_name: 1 })
    .exec(function(err, sensors) {
      if (err) {
        res.send(err);
      } else {
        res.send(sensors);
        //console.log(JSON.stringify(beds, null, "\t"))
      }
    });
});
router.get("/id=:_id", function(req, res, next) {
  const { _id } = req.params;

  Sensor.findOne({ _id })
    .populate("bed_", "number")
    .populate("hospital_", "name")
    .populate("floor_", "number")
    .populate("room_", "number")
    .populate("bed_", "number _sensor_node")
    .exec(function(err, sensor) {
      if (err) {
        res.send(err);
      } else {
        res.send(sensor);
        //console.log(JSON.stringify(beds, null, "\t"))
      }
    });
});
router.get("/hospital", function(req, res) {
  const { id, perPage, page } = req.query;
  const query = id ? { hospital_: id } : null;

  Sensor.find(query)
    .populate("bed_", "number")
    .populate("hospital_", "name")
    .populate("floor_", "number")
    .populate("room_", "number")
    .populate("bed_", "number _sensor_node")
    .limit(parseInt(perPage))
    .sort({ node_name: 1 })
    .exec()
    .then(sensors => {
      Sensor.count(query)
        .exec()
        .then(count => {
          res.send({
            sensors,
            page: parseInt(page),
            pages: count / perPage
          });
        })
        .catch(err => {
          res.send(err);
        });
    })
    .catch(err => {
      res.send(err);
    });
});

//post
router.post("/push", function(req, res) {
  const { node_name, hospital_, floor_, room_, bed_ } = req.body;
  //if bed is occupied then send err
  Sensor.findOne({ node_name: node_name }).exec(function(err, sensor) {
    if (sensor) {
      res.status(500).send({
        err:
          "There is same node_name which is already stored, please enter the other number."
      });
    } else {
      isBedEmpty(bed_, "_sensor_node")
        .then(bedEmptyCheck => {
          console.log(`\nBed empty check: ${bedEmptyCheck}`);
          if (!bedEmptyCheck) {
            // if bed is not empty
            return res.status(500).send({
              err:
                "This bed is currently occupied, empty the bed in order to assign the sensor."
            });
          } else {
            const sensor = new Sensor({
              node_name,
              hospital_: hospital_ === "" ? undefined : hospital_,
              floor_: floor_ === "" ? undefined : floor_,
              room_: room_ === "" ? undefined : room_,
              bed_: bed_ === "" ? undefined : bed_
            });

            sensor
              .save()
              .then(post => {
                if (post.bed_) {
                  itemDeployedAt(Bed, "_sensor_node", post._id, post.bed_)
                    .then(post => {
                      console.log(`Added ${node_name}!\n`);
                      res.status(200).send(post);
                    })
                    .catch(err => {
                      const errmsg = `An error ocurred while updating`;
                      console.log(`${errmsg}: ${err}\n`);
                      return res.status(500).send({ err: errmsg });
                    });
                } else {
                  return res.send(201);
                }
              })
              .catch(err => {
                res.status(500).send(err);
              });
          }
        })
        .catch(err => {
          console.log(`\nEmpty check err:\n${err}`);
          return res.status(500).send({
            err: "There is an error occurred, please do it again"
          });
        });
    }
  });
});

router.post("/update/id=:id", function(req, res, next) {
  const { id } = req.params;
  const { node_name, hospital_, floor_, room_, bed_ } = req.body;
  //if bed is occupied then send err
  Sensor.findOne({ node_name: node_name }).exec(function(err, sensorOld) {
    Sensor.findById(id, function(err, sensor) {
      if (err) {
        return next(err);
      }
      if (!sensor) {
        return res.send(404);
      }
      // if the sensor name is occupied
      if (sensorOld && sensorOld.node_name !== sensor.node_name) {
        return res.status(500).send({
          err:
            "There is same node_name which is already occupied, enter the other number and"
        });
      }
      if (!bed_) {
      }
      isBedEmpty(bed_, "_sensor_node")
        .then(bedEmptyCheck => {
          console.log(`\nBed empty check: ${bedEmptyCheck}`);
          if (!bedEmptyCheck && bed_ != sensor.bed_) {
            // if bed is not empty
            return res.status(500).send({
              err:
                "This bed is currently occupied, empty the bed in order to assign the sensor and"
            });
          } else {
            // if the sensor was already deployed at any bed, then remove the relationship
            itemRemovedFrom(Bed, "_sensor_node", id, sensor.bed_)
              .then(post => {
                //update
                if (node_name) {
                  sensor.node_name = node_name;
                }
                sensor.hospital_ = hospital_ === "" ? undefined : hospital_;
                sensor.floor_ = floor_ === "" ? undefined : floor_;
                sensor.room_ = room_ === "" ? undefined : room_;
                sensor.bed_ = bed_ === "" ? undefined : bed_;
                sensor
                  .save()
                  .then(post => {
                    if (post.bed_) {
                      itemDeployedAt(Bed, "_sensor_node", post._id, post.bed_)
                        .then(post => {
                          console.log(`Added ${node_name}!\n`);
                          res.status(200).send(post);
                        })
                        .catch(err => {
                          const errmsg = `An error ocurred while updating`;
                          console.log(`${errmsg}: ${err}\n`);
                          return res.status(500).send({ err: errmsg });
                        });
                    } else {
                      return res.send(201);
                    }
                  })
                  .catch(err => {
                    const errmsg = `An error ocurred while updating`;
                    console.log(`${errmsg}: ${err}\n`);
                    return res.status(500).send({ err: errmsg });
                  });
              })
              .catch(err => {
                const errmsg = `An error ocurred while updating`;
                console.log(`${errmsg}: ${err}\n`);
                return res.status(500).send({ err: errmsg });
              });
          }
        })
        .catch(err => {
          console.log(`\nEmpty check err:\n${err}`);
          return res.status(500).send({
            err: "There is an error occurred, please do it again"
          });
        });
    });
  });
});

// delete a hospital
router.delete("/delete/:id", function(req, res, next) {
  const { id } = req.params;

  Sensor.findById(id, function(err, sensor) {
    if (err) {
      return next(err);
    }
    if (!sensor) {
      return res.send(404);
    }
    sensor
      .remove()
      .then(post => {
        itemRemovedFrom(Bed, "_sensor_node", id, sensor.bed_)
          .then(post => {
            return res.send(204);
          })
          .catch(err => {
            return res.status(500).send(err);
          });
      })
      .catch(err => {
        return res.status(500).send(err);
      });
  });
});
module.exports = router;
