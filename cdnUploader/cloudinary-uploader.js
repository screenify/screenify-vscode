const cloudinary = require("cloudinary")


= class CloudinaryUploader {
    constructor(config) {
        cloudinary.config({
            cloud_name: config.get("cloudinayName"),
            api_key: config.get("cloudinayKey"),
            api_secret: config.get("cloudinaySecret")
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
module.exports = {
    CloudinaryUploader
}