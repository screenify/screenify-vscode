const {
    CloudinaryUploader
} = require('./cloudinary-uploader');
const {
    GoogleUploader
} = require("./google-uploader")

export function createCdnUploader(type, config) {
    switch (type) {
        case 'google':
            return new GoogleUploader(config);

        case 'cloudinary':
            return new CloudinaryUploader(config);

        default:
            return null;
    }
}