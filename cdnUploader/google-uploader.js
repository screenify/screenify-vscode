// const Cloud = require('@google-cloud/storage')
const path = require('path')
const serviceKey = path.join(__dirname, './keys.json')
const randomstring = require("randomstring");
const {
    Storage
} = require('@google-cloud/storage')



// const bucket = storage.bucket('screenify_bucket')
class GoogleUploader {
    constructor(config) {

        storage = new Storage({
            keyFilename: serviceKey,
            // config("googleServiceKey"),
            projectId: config.get("googleProjectId")
            // 'careful-voyage-273218',
        })
        this.bucket = config.get("googleBucketName")
    }
    upload(buffer) {
        let bucket = this.storage.bucket('screenify_bucket')
        bucket.acl.default.add({
            entity: "allUsers",
            role: "READER",
        }, function (res, err) {
            if (err) console.log(err)
            else conosle.log(res)
        })
        return new Promise((resolve, reject) => {
            const blob = bucket.file(`${randomstring.generate(6)}.png`.replace(/ /g, "_"))
            const blobStream = blob.createWriteStream({
                metadata: {
                    cacheControl: "public, max-age=300"
                },
                public: true,
                resumable: false
            })
            blobStream.on('finish', () => {
                    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`

                    resolve(publicUrl)
                })
                .on('error', (error) => {
                    reject(`Unable to upload image, something went wrong: ${error}`)
                })
                .end(buffer)
        })
    }
}
module.exports = {
    GoogleUploader
}