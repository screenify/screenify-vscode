// const Cloud = require('@google-cloud/storage')
const path = require('path')
const serviceKey = path.join(__dirname, './keys.json')

const {
    Storage
} = require('@google-cloud/storage')



const bucket = storage.bucket('screenify_bucket')

class GoogleUploader {
    constructor(config) {
        this.storage = new Storage({
            keyFilename: config("googleServiceKey"),
            projectId: config.get("googleProjectId")
            // 'careful-voyage-273218',
        })
        this.bucket = config.get("googleBucketName")
    }
    uploadImage(file = {}) {
        return new Promise((resolve, reject) => {
            const {
                originalname,
                buffer
            } = file
            const blob = bucket.file(originalname.replace(/ /g, "_"))
            const blobStream = blob.createWriteStream({
                resumable: false
            })
            blobStream.on('finish', () => {
                    const publicUrl = format(
                        `https://storage.googleapis.com/${bucket.name}/${blob.name}`
                    )
                    resolve(publicUrl)
                })
                .on('error', (error) => {
                    reject(`Unable to upload image, something went wrong`)
                })
                .end(buffer)
        })
    }
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