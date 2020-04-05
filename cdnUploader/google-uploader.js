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
        this.storage = new Storage({
            keyFilename: serviceKey,
            // config("googleServiceKey"),
            projectId: config.get("googleProjectId")
            // 'careful-voyage-273218',
        })
        this.bucket = config.get("googleBucketName")
    }
    upload(buffer) {
        return new Promise((resolve, reject) => {
            const blob = this.bucket.file(randomstring.generate().replace(/ /g, "_"))
            const blobStream = blob.createWriteStream({
                metadata: {
                    contentType: buffer
                },
                resumable: false
            })
            blobStream.on('finish', () => {
                    const publicUrl = format(
                        `https://storage.googleapis.com/${bucket.name}/${blob.name}`
                    )
                    resolve(publicUrl)
                })
                .on('error', (error) => {
                    reject(`Unable to upload image, something went wrong: ${error.message}${resumable}`, )
                })
                .end(buffer)
        })
    }
}
module.exports = {
    GoogleUploader
}
// export const uploadImage = (file = {}) => new Promise((resolve, reject) => {
//     const {
//         originalname,
//         buffer
//     } = file
//     const blob = bucket.file(originalname.replace(/ /g, "_"))
//     const blobStream = blob.createWriteStream({
//         resumable: false
//     })
//     blobStream.on('finish', () => {
//             const publicUrl = format(
//                 `https://storage.googleapis.com/${bucket.name}/${blob.name}`
//             )
//             resolve(publicUrl)
//         })
//         .on('error', () => {
//             reject(`Unable to upload image, something went wrong`)
//         })
//         .end(buffer)
// })