var imgur = require("imgur");

const { clientId, imgurEmail, imgurPW } = require("../config/keys");

//imgur account setting with credentials
imgur.setCredentials(imgurEmail, imgurPW, clientId);

exports.uploadToImgur = function(path, inputModel, atAlbum) {
  return new Promise(function(fulfill, reject) {
    let imgSrcString, imgDeleteString;

    return imgur
      .uploadFile(
        path,
        atAlbum === "patient" ? albumId.Patients : albumId.Hospitals
      )
      .then(function(json) {
        console.log(json.data.link);
        imgSrcString = json.data.link;
        imgDeleteString = json.data.deletehash;

        inputModel.imgSrc = imgSrcString;
        inputModel.imgDeleteHash = imgDeleteString;
        fulfill(inputModel);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

exports.deleteFromImgur = function(deletehash) {
  return new Promise(function(fulfill, reject) {
    return imgur
      .deleteImage(deletehash)
      .then(status => {
        fulfill(status);
      })
      .catch(err => {
        reject(err);
      });
  });
};
