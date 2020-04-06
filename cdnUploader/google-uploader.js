const Cloud = require('@google-cloud/storage')
const {
    Storage
} = Cloud
const path = require('path')
const serviceKey = path.join(__dirname, './keys.json')
const randomstring = require("randomstring");
const {
    format
} = require('util')

// // const bucket = storage.bucket('screenify_bucket')
module.exports = class GoogleUploader {
    constructor(config) {
        this.storage = new Storage({
            keyFilename: serviceKey,
            projectId: config.get("googleProjectId")
        })
        this.bucketName = config.get("googleBucketName")
    }
    upload(buffer) {
        let bucket = this.storage.bucket(this.bucketName)
        // bucket.acl.default.add({
        //     entity: "allUsers",
        //     role: "READER",
        // }, function (res, err) {
        //     if (err) console.log(err)
        //     else conosle.log(res)
        // })
        return new Promise((resolve, reject) => {
            const filename = `${randomstring.generate(6)}.png`;
            const blob = bucket.file(filename)
            console.log(blob.name)
            const blobStream = blob.createWriteStream({
                metadata: {
                    "Content-Type": "image/png",
                    "Content-Disposition": 'inline;filename="filename.png"',
                    cacheControl: "public, max-age=6000"
                },
                public: true,
                resumable: false
            })
            blobStream.on('finish', () => {
                    const publicUrl = format(
                        `https://storage.googleapis.com/${bucket.name}/${blob.name}`
                    )
                    console.log(publicUrl)
                    resolve(publicUrl)
                })
                .on('error', (error) => {
                    reject(error.message)
                })
                .end(buffer)
        })
    }
}