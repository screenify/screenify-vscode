const {
    CloudinaryUploader
} = require('./CloudinaryUploader');
const GUploader = require("./google-uploader")

export function createCdnUploader(type, config) {
    switch (type) {
        case 'google':
            return new GUploader(config);

        case 'cloudinary':
            return new CloudinaryUploader(config);

        default:
            return null;
    }
}