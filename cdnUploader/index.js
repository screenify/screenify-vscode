const {
    CloudinaryUploader
} = require('./cloudinary-uploader');
const {
    GoogleUploader
} = require("./google-uploader")

function createCdnUploader(config, type) {
    switch (type) {
        case 'google':
            return new GoogleUploader(config);

        case 'cloudinary':
            return new CloudinaryUploader(config);

        default:
            return null;
    }
}
module.exports = {
    createCdnUploader
}