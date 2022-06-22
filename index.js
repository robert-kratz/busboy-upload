const meter = require('stream-meter');

const { Readable } = require("stream")

const fs = require('fs');
const path = require('path');

/**
 * Call this method to deal with files contained in the request
 *  
 * @param {Request} req 
 * @param {Callback} success 
 * @param {Object} options 
 */
const middlewareFileUpload = async (req, success, options) => {

    if(!req.busboy) throw new Error('Busboy not found on request');
    if(!options.uploadPath) throw new Error('No upload path provided');

    let fileCollection = [], uploadStartTimestamp = Date.now(), fileAmountError = 0, fileAmountSuccess = 0;

    let fileCounter = 0, fileWriteQueue = 0, finishedRequest = false;

    const onFileUploadStart = async (fieldName, file, info) => {

        const { filename, encoding, mimeType } = info, singeUploadStartTimestamp = Date.now();

        const uploadName = await options.uploadName(fieldName, filename, encoding, mimeType) || Date.now();
        const saveTo = path.join(`uploads/${uploadName}.${getFileEnding(info.filename)}`); 

        fileCounter++;

        var chunks = [], errors = [], isValid = true;

        let fileFormat = {
            errors: errors,
            originalFile: info,
            uploadedFile: {
                uploadedName: uploadName,
                uploadedPath: saveTo,
                uploadDuration: 0,
                success: false,
                fileInfo: file
            }
        }

        if(options.filter != undefined) {
            options.filter(fileFormat, (err) => {
                errors.push(err || 'FILTER_DID_NOT_ACCEPT_INPUT');
                isValid = false;
            })
        }
        if(options.maxAmount != undefined && fileCounter > options.maxAmount) {
            errors.push('MAXMUM_FILE_AMOUNT_REACHED');
            isValid = false
        }

        if(options.mimeTypes != undefined && !options.mimeTypes.includes(mimeType)) {
            errors.push('FILE_TYPE_NOT_ALLOWED');
            isValid = false;
        }

        const readStream = file.pipe(meter());

        let size = 0;
        readStream.on('data', (chunk) => {
            if(!isValid) {
                file.resume();
                readStream.unpipe();

                delete chunks;
                return;
            }

            size = size + chunk.length;

            chunks.push(chunk)

            if(options.maxsize != undefined && size > options.maxsize) {
                isValid = false;
                errors.push('UPLOADED_FILE_TO_BIG');
                return;
            }
        });

        readStream.on('end', () => {
            fileWriteQueue++;

            if(isValid) {
                fileAmountSuccess++;
                saveToFile();
            } else {
                fileWriteQueue--;
                fileAmountError++;
                fileCollection.push(fileFormat);
            }
        })

        const saveToFile = async () => {
            
            const readable = Readable.from(chunks)
            const writeStream = fs.createWriteStream(saveTo);

            fileFormat.uploadedFile.size = size;
            fileFormat.originalFile.uploadedName = options.uploadName;
            fileFormat.originalFile.uploadedPath = saveTo;

            readable.pipe(writeStream);

            readable.on('end', () => {
                fileWriteQueue--;

                fileFormat.uploadedFile.uploadDuration = (Date.now() - singeUploadStartTimestamp);
                fileFormat.uploadedFile.success = true;

                fileCollection.push(fileFormat);

                if(fileWriteQueue == 0 && !finishedRequest) {
                    finishedRequest = true;
                    return success({
                        stats: {
                            total: fileAmountError + fileAmountSuccess,
                            error: fileAmountError,
                            success: fileAmountSuccess
                        },
                        files: fileCollection,
                        duration: (Date.now() - uploadStartTimestamp)
                    })
                }
            })
        }
    };

    const onFileUploadFinish = async () => {
        if(finishedRequest || fileWriteQueue != 0) return;

        finishedRequest = true;

        return success({
            stats: {
                total: fileAmountError + fileAmountSuccess,
                error: fileAmountError,
                success: fileAmountSuccess
            },
            files: fileCollection,
            duration: (Date.now() - uploadStartTimestamp)
        })
    };

    req.busboy.on('file', onFileUploadStart)
    req.busboy.on('finish', onFileUploadFinish)
}

/**
 * Seperates the ending of a file
 * @param {String} fullName 
 * @returns String
 */
const getFileEnding = (fullName) => {
    const array = fullName.split('.');

    if(array.length == 1) return '.txt'

    let ending = '';
    for (let i = 1; i < array.length; i++) {
        ending = ending + '.' + array[i];
    }
    return ending.slice(1, ending.length);
}

module.exports = middlewareFileUpload;