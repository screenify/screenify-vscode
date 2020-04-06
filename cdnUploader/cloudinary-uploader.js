const cloudinary = require("cloudinary")
const vscode = require("vscode")

module.exports = class CloudinaryUploader {
    constructor(config) {
        let cloudName = config.get('cloudinaryName') || '';
        let key = config.get('cloudinaryApiKey') || '';
        let secret = config.get('cloudinarySecret') || '';
        // this.folder = config.get('cloudinaryFolder') || '';

        cloudinary.config({
            cloud_name: cloudName,
            api_key: key,
            api_secret: secret
        });
    }
    upload(buffer) {
        return new Promise((resolve, reject) => {
            let content = buffer.toString('base64');

            try {
                cloudinary.v2.uploader.upload(`data:image/png;base64,${content}`, {
                    folder: '/screenfiy/uploads',
                    fetch_format: 'auto',
                    quality: 'auto'
                }, (error, result) => {
                    if (error) {
                        vscode.window.showWarningMessage(error.message);
                        reject(error);
                    } else {
                        console.log(result);
                        resolve(result.secure_url);
                    }
                });
            } catch (e) {
                reject(e)
            }
        });
    }
}