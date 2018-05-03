var express = require("express");
// var expect = require('chai').expect;
var router = express.Router();

var Hospital = require("../models/hospital");

// upload img
var multer = require("multer");
var upload = multer({ dest: `/.temp/` });

var { uploadToImgur, deleteFromImgur } = require("../controllers/handle_imgur");
var { deleteHospital } = require("../controllers/handle_delete");

router.get("/", function(req, res) {
  const { perPage, page } = req.query;
 
  Hospital
    .find()
    .limit(parseInt(perPage))
    .skip(perPage*page)
    .sort({name: 'asc'})
    .exec()
    .then(hospitals => {
      Hospital.count().exec().then(count => {
        res.send({
          hospitals,
          page: parseInt(page),
          pages: count / perPage
        });
      }).catch(err=>{
        console.log(err);
        res.status(500);  
      });	
    })
    .catch(err=>{
      console.log(err);
      res.status(500);	
    });
});

router.get("/id=:param", function(req, res) {
  const param = req.params.param;

  Hospital.findOne({ _id: param }).exec(function(err, hospital) {
    if (err) {
      res.send(err);
    } else {
      res.send(hospital);
      //console.log(JSON.stringify(beds, null, "\t"))
    }
  });
});
router.get("/name=:param", function(req, res) {
  const param = req.params.param;

  Hospital.find({ name: param }).exec(function(err, hospitals) {
    if (err) {
      res.send(err);
    } else {
      res.send(hospitals);
      //console.log(JSON.stringify(beds, null, "\t"))
    }
  });
});
// insert new hospital with img uploading
router.post("/push", upload.single("file"), function(req, res) {

  const { name, address, phone_number } = req.query;
  let hospital = new Hospital({
    name,
    address,
    phone_number
  });
  if (req.file) {
    const { path, mimetype } = req.file;

    uploadToImgur(path, hospital)
      .then(() => {
        hospital.save(function(err, post) {
          res.json(201, hospital);
        });
      })
      .catch(reason => {
        const errmsg = `Image uploading is failed`;
        console.log(`${errmsg}: ${reason}`);
        res.status(500).send({ err: errmsg });
      });
  } else {
    hospital.save(function(err, post) {
      res.json(201, hospital);
    });
  }
});

// update hospital with img uploading
router.post("/update/id=:id", upload.single("file"), function(req, res, next) {
  const { id } = req.params;
  const { name, address, phone_number } = req.query;


  Hospital.findById(id, function(err, hospital) {
    if (err) {
      console.log(err);
      return next(err);
    }
    if (!hospital) {
      console.log("err2");
      return res.send(404);
    }
    //update
    hospital.name = name;
    hospital.address = address;
    hospital.phone_number = phone_number;

    // if image needs to upate
    if (req.file) {
      const { path, mimetype } = req.file;
      const { imgDeleteHash } = hospital;
      //check whether there is already image or not
      if (imgDeleteHash) {
        // delete previous stored img
        deleteFromImgur(imgDeleteHash)
          .then(() => {
            // replace it to new img
            uploadToImgur(path, hospital)
              .then(() => {
                hospital.save(function(err, post) {
                  res.json(201, hospital);
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
        uploadToImgur(path, hospital)
          .then(() => {
            hospital.save(function(err, post) {
              res.json(201, hospital);
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
      hospital.save(function(err, post) {
        res.json(201, hospital);
      });
    }
  });
});

// delete a hospital
router.delete("/delete/:id", function(req, res, next) {
  const { id } = req.params;

  Hospital.findById(id, function(err, hospital) {
    if (err) {
      return next(err);
    }
    if (!hospital) {
      return res.send(404);
    }
    const { imgDeleteHash } = hospital;
    if (imgDeleteHash) {
      deleteFromImgur(imgDeleteHash)
        .then(() => {
          deleteHospital(id)
            .then(() => {
              hospital
                .remove()
                .then(() => {
                  console.log(`Deleted hospital(${id})!\n`);
                  return res.send(200);
                })
                .catch(err => {
                  console.log(`Err occured while deleting\n${err}\n`);
                  return res.status(500).send(err);
                });
            })
            .catch(err => {
              console.log(`Err occured while deleting\n${err}\n`);
              return res.status(500).send(err);
            });
        })
        .catch(err => {
          console.log(`Err occured while deleting Image\n${err}\n`);
          return res.status(500).send(err);
        });
    } else {
      deleteHospital(id)
        .then(() => {
          hospital
            .remove()
            .then(() => {
              console.log(`Deleted hospital(${id})!\n`);
              return res.send(200);
            })
            .catch(err => {
              console.log(`Err occured while deleting\n${err}\n`);
              return res.status(500).send(err);
            });
        })
        .catch(err => {
          console.log(`Err occured while deleting\n${err}\n`);
          return res.status(500).send(err);
        });
    }
  });
});

module.exports = router;
