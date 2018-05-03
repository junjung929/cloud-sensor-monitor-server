var express = require("express");
// var expect = require('chai').expect;
var router = express.Router();

var Patient = require("../models/patient");
var Bed = require("../models/bed");

// upload img
var multer = require("multer");
var upload = multer({ dest: `/temp/` });
var { uploadToImgur, deleteFromImgur } = require("../controllers/handle_imgur");

var { isBedEmpty, itemDeployedAt } = require("../controllers/handle_add");
var { itemRemovedFrom } = require("../controllers/handle_delete");

router.get("/", function(req, res) {
  const { perPage, page } = req.query;

  Patient.find({})
    .populate("hospital_", "name")
    .populate("floor_", "number")
    .populate("room_", "number")
    .populate("bed_", "number _sensor_node")
    .limit(parseInt(perPage))
    .skip(perPage * page)
    .sort({ first_name: 1 })
    .sort({ last_name: 1 })
    .sort({ bed_: 1 })
    .sort({ room_: 1 })
    .sort({ hospital_: 1 })
    .exec()
    .then(patients => {
      Patient.count()
        .exec()
        .then(count => {
          res.send({
            patients,
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
router.get("/free", function(req, res) {
  Patient.find({ bed_: null })
    .populate("hospital_", "name")
    .populate("floor_", "number")
    .populate("room_", "number")
    .populate("bed_", "number _sensor_node")
    .exec(function(err, patient) {
      if (err) {
        res.send(err);
        console.log(`Error detected while fetching patients\n`);
      } else {
        res.send(patient);
        console.log(`Patients has been fetched\n`);
      }
    });
});

router.get("/id=:param", function(req, res) {
  let param = req.params.param;
  let query = { _id: param };

  Patient.findOne(query)
    .populate("hospital_", "name")
    .populate("floor_", "number")
    .populate("room_", "number")
    .populate("bed_", "number _sensor_node")
    .exec(function(err, patient) {
      if (err) {
        res.send(err);
        console.log(
          `Error detected while fetching a certain patient id: ${param}`
        );
      } else {
        res.send(patient);
        console.log(`Patient id: ${param}\n`);
      }
    });
});
router.get("/hospital", function(req, res) {
  const { id, perPage, page } = req.query;
  const query = id ? { hospital_: id } : null;

  Patient.find(query)
    .populate("hospital_", "name")
    .populate("floor_", "number")
    .populate("room_", "number")
    .populate("bed_", "number _sensor_node")
    .limit(parseInt(perPage))
    .skip(perPage * page)
    .sort({ first_name: 1 })
    .sort({ last_name: 1 })
    .sort({ bed_: 1 })
    .sort({ room_: 1 })
    .sort({ hospital_: 1 })
    .exec()
    .then(patients => {
      Patient.count(query)
        .exec()
        .then(count => {
          res.send({
            patients,
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
router.get("/searchByName=:firstName%20:lastName", function(req, res) {
  const { firstName, lastName } = req.params;

  const { perPage, page } = req.query;

  const query = {
    $and: [
      { first_name: { $regex: firstName, $options: "i" } },
      { last_name: { $regex: lastName, $options: "i" } }
    ]
  };

  Patient.find(query)
    .populate("hospital_", "name")
    .populate("room_", "number")
    .populate("bed_", "number")
    .limit(parseInt(perPage))
    .skip(perPage * page)
    .sort({ hospital_: "asc" })
    .exec()
    .then(patients => {
      Patient.count(query)
        .exec()
        .then(count => {
          res.send({
            patients,
            page: parseInt(page),
            pages: count / perPage
          });
        })
        .catch(err => {
          console.log(err);
          res.send(err);
        });
    })
    .catch(err => {
      console.log(err);
      res.send(err);
    });
});
router.get("/searchByName=:param", function(req, res) {
  const { param } = req.params;

  const { perPage, page } = req.query;
  let query = {
    $or: [
      { first_name: { $regex: param, $options: "i" } },
      { last_name: { $regex: param, $options: "i" } }
    ]
  };

  Patient.find(query)
    .populate("bed_", "number")
    .populate("room_", "number")
    .populate("hospital_", "name")
    .limit(parseInt(perPage))
    .skip(perPage * page)
    .sort({ hospital_: "asc" })
    .exec()
    .then(patients => {
      Patient.count(query)
        .exec()
        .then(count => {
          res.send({
            patients,
            page: parseInt(page),
            pages: count / perPage
          });
        })
        .catch(err => {
          console.log(err);
          res.send(err);
        });
    })
    .catch(err => {
      console.log(err);
      res.send(err);
    });
});

// insert new floor with img uploading
router.post("/push", upload.single("file"), function(req, res) {
  const date = new Date();
  console.log(`\nRequest at ${date.toString()}\nPatient adding....\n`);
  const {
    first_name,
    last_name,
    birth,
    enter_date,
    leave_date,
    phone_number,
    address,
    hospital_,
    floor_,
    room_,
    bed_
  } = req.query;
  let patient = new Patient({
    first_name,
    last_name,
    birth,
    enter_date,
    leave_date,
    phone_number,
    address,
    hospital_: hospital_ ? hospital_ : undefined,
    floor_: floor_ ? floor_ : undefined,
    room_: room_ ? room_ : undefined,
    bed_: bed_ ? bed_ : undefined
  });
  console.log(`Bed empty checking...`);
  isBedEmpty(bed_, "_patient").then(function(bedEmptyCheck) {
    console.log(`Bed empty check: ${bedEmptyCheck}`);
    if (!bedEmptyCheck) {
      res.status(500).send({
        err:
          "This bed is currently occupied, empty the bed in order to assign the patient."
      });
    } else {
      if (req.file) {
        console.log(`\nImage uploading...`);
        const { path, mimetype } = req.file;

        uploadToImgur(path, patient, "patient")
          .then(() => {
            console.log(
              `Uploaded!\nAdding Patient ${first_name} ${last_name}...`
            );
            patient
              .save()
              .then(post => {
                if (post.bed_) {
                  itemDeployedAt(Bed, "_patient", post._id, post.bed_)
                    .then(post => {
                      console.log(`Added ${first_name} ${last_name}!\n`);
                      res.status(200).send(post);
                    })
                    .catch(err => {
                      const errmsg = `An error ocurred while adding`;
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
          })
          .catch(reason => {
            const errmsg = `Image uploading is failed`;
            console.log(`${errmsg}: ${reason}\n`);
            return res.status(500).send({ err: errmsg });
          });
      } else {
        console.log(`Adding Patient ${first_name} ${last_name}...`);
        patient
          .save()
          .then(post => {
            if (post.bed_) {
              itemDeployedAt(Bed, "_patient", post._id, post.bed_)
                .then(post => {
                  console.log(`Added ${first_name} ${last_name}!\n`);
                  res.status(200).send(post);
                })
                .catch(err => {
                  const errmsg = `An error ocurred while adding`;
                  console.log(`${errmsg}: ${err}\n`);
                  return res.status(500).send({ err: errmsg });
                });
            } else {
              return res.send(201);
            }
          })
          .catch(err => {
            const errmsg = `Image uploading is failed`;
            console.log(`${errmsg}: ${reason}\n`);
            return res.status(500).send({ err: errmsg });
          });
      }
    }
  });
});

// update hospital with img uploading
router.post("/update/id=:id", upload.single("file"), function(req, res, next) {
  const date = new Date();
  console.log(`\nRequest at ${date.toString()}\nPatient updating....\n`);
  const { id } = req.params;
  const {
    first_name,
    last_name,
    birth,
    enter_date,
    leave_date,
    phone_number,
    address,
    hospital_,
    floor_,
    room_,
    bed_
  } = req.query;
  console.log(`Querying patient...`);
  Patient.findById(id, function(err, patient) {
    if (err) {
      const errmsg = `Patient updating is failed`;
      console.log(`Err occured while querying the patient(id:${id})\n${err}\n`);
      return res.status(500).send({ err: errmsg });
    }
    if (!patient) {
      const errmsg = `There is no such a patient`;
      console.log(`${errmsg}(id:${id})\n${err}\n`);
      return res.status(404).send({ err: errmsg });
    }
    console.log(`Bed empty checking...`);
    isBedEmpty(bed_, "_patient")
      .then(function(bedEmptyCheck) {
        console.log(`\nBed empty check: ${bedEmptyCheck}`);
        if (!bedEmptyCheck && bed_ != patient.bed_) {
          res.status(500).send({
            err:
              "This bed is currently occupied, empty the bed in order to assign the sensor"
          });
        } else {
          itemRemovedFrom(Bed, "_patient", id, patient.bed_)
            .then(post => {
              //update
              patient.first_name = first_name;
              patient.last_name = last_name;
              patient.birth = birth;
              patient.enter_date = enter_date;
              patient.leave_date = leave_date;
              patient.phone_number = phone_number;
              patient.address = address;
              patient.hospital_ = hospital_ ? hospital_ : undefined;
              patient.floor_ = floor_ ? floor_ : undefined;
              patient.room_ = room_ ? room_ : undefined;
              patient.bed_ = bed_ ? bed_ : undefined;
              // if image needs to upate
              if (req.file) {
                console.log(`\nImage uploading...`);
                const { path, mimetype } = req.file;
                const { imgDeleteHash } = patient;
                //check whether there is already image or not
                if (imgDeleteHash) {
                  // delete previous stored img
                  deleteFromImgur(imgDeleteHash)
                    .then(() => {
                      // replace it to new img
                      uploadToImgur(path, patient, "patient")
                        .then(() => {
                          console.log(
                            `Uploaded!\nAdding Patient ${first_name} ${last_name}...`
                          );
                          patient
                            .save()
                            .then(post => {
                              console.log(post);
                              if (patient.bed_) {
                                itemDeployedAt(
                                  Bed,
                                  "_patient",
                                  patient._id,
                                  patient.bed_
                                )
                                  .then(post => {
                                    console.log(
                                      `Added ${first_name} ${last_name}!\n`
                                    );
                                    res.status(200).send(post);
                                  })
                                  .catch(err => {
                                    const errmsg = `An error ocurred while updating`;
                                    console.log(`${errmsg}: ${err}\n`);
                                    return res
                                      .status(500)
                                      .send({ err: errmsg });
                                  });
                              } else {
                                return res.send(201);
                              }
                            })
                            .catch(err => {
                              res.status(500).send(err);
                            });
                        })
                        .catch(reason => {
                          const errmsg = `While updating, image update is failed`;
                          console.log(`${errmsg}: ${reason}\n`);
                          return res.status(500).send({ err: errmsg });
                        });
                    })
                    .catch(reason => {
                      const errmsg = `While updating, image delete is failed`;
                      console.log(`${errmsg}: ${reason}\n`);
                      res.status(500).send({ err: errmsg });
                    });
                } else {
                  // if there is no stored img, then just upload new img
                  uploadToImgur(path, patient, "patient")
                    .then(() => {
                      console.log(
                        `Uploaded!\nAdding Patient ${first_name} ${last_name}...`
                      );
                      patient
                        .save()
                        .then(post => {
                          if (patient.bed_) {
                            itemDeployedAt(
                              Bed,
                              "_patient",
                              patient._id,
                              patient.bed_
                            )
                              .then(post => {
                                console.log(
                                  `Added ${first_name} ${last_name}!\n`
                                );
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
                    })
                    .catch(reason => {
                      const errmsg = `While updating, image upload is failed`;
                      console.log(`${errmsg}: ${reason}\n`);
                      return res.status(500).send({ err: errmsg });
                    });
                }
              } else {
                // if img doesn't need to update, then just save changes
                console.log(`Adding Patient ${first_name} ${last_name}...`);
                console.log(patient);
                patient
                  .save()
                  .then(post => {
                    if (patient.bed_) {
                      itemDeployedAt(Bed, "_patient", patient._id, patient.bed_)
                        .then(post => {
                          console.log(`Added ${first_name} ${last_name}!\n`);
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
              }
            })
            .catch(err => {
              console.log(`${err}\n`);
              return res.status(500).send({ err: errmsg });
            });
        }
      })
      .catch(err => {
        console.log(`\nEmpty check err:\n${err}\n`);
        return res.status(500).send({
          err: "There is an error occurred, please do it again"
        });
      });
  });
});

// delete a hospital
router.delete("/delete/:id", function(req, res, next) {
  const { id } = req.params;

  Patient.findById(id, function(err, patient) {
    if (err) {
      return next(err);
    }
    if (!patient) {
      return res.send(404);
    }
    const { imgDeleteHash } = patient;
    if (imgDeleteHash) {
      deleteFromImgur(imgDeleteHash)
        .then(() => {
          patient.remove(function(err) {
            if (err) {
              return handleError(res, err);
            }
            return res.send(204);
          });
        })
        .catch(reason => {
          console.log(`image delete is failed: ${reason}\n`);
        });
    } else {
      patient.remove(function(err) {
        if (err) {
          return handleError(res, err);
        }
        return res.send(204);
      });
    }
  });
});
module.exports = router;
