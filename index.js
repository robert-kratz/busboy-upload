const meter = require('stream-meter');

const { Readable } = require('stream');

const fs = require('fs');
const path = require('path');

/**
 * Call this method to deal with files contained in the request
 *  
 * @param {Request} req 
 * @param {Callback} success 
 * @param {Object} options 
 */
module.exports = async (req, success, options) => {
    if(!options.uploadPath) throw new Error('No upload path provided');

    
    var totalFilesRead = 0, totalFilesWritten = 0, totalFilesError = 0;
    var fileCollection = [], requestStartTimestamp = Date.now(), totalFileSize = 0;

    if(!req.busboy) {
        return success({
            stats: {
                total: (totalFilesRead + totalFilesError),
                error: totalFilesError,
                success: totalFilesRead
            },
            files: fileCollection,
            duration: (Date.now() - requestStartTimestamp),
            totalFileSize: totalFileSize
        });
    }

    /**
     * STARING TO WRITE INCOMING STREAM FROM CLIENT
     */
    const onFileUploadStart = async (fieldName, file, info) => {

        const { filename, encoding, mimeType } = info;

        const uploadName = await options.uploadName(fieldName, filename, encoding, mimeType) || Date.now();
        const saveTo = path.join(`${options.uploadPath}/${uploadName}.${getFileEnding(info.filename)}`); 

        var chunks = [], errorOccoured = false, errorCollection = [];

        const readStream = file.pipe(meter());

        let readFile = {
            errors: errorCollection,
            originalFile: info,
            uploadedFile: {
                uploadedName: uploadName,
                uploadedPath: saveTo,
                uploadDuration: Date.now(),
                success: false,
                fileSize: 0,
                fileInfo: file
            }
        }

        if(options.filter != undefined) {
            options.filter(readFile, (err) => {
                errors.push(err || 'FILTER_DID_NOT_ACCEPT_INPUT');
                errorOccoured = true;
            })
        }
        if(options.maxAmount != undefined && fileCounter > options.maxAmount) {
            errors.push('MAXIMUM_FILE_AMOUNT_REACHED');
            errorOccoured = true;
        }

        if(options.mimeTypes != undefined && !options.mimeTypes.includes(mimeType)) {
            errors.push('FILE_TYPE_NOT_ALLOWED');
            errorOccoured = true;
        }

        let fileSize = 0;
        readStream.on('data', (chunk) => {
            if(errorOccoured) {
                file.resume();
                readStream.unpipe();

                delete chunks;
                return;
            }

            fileSize = fileSize + chunk.length;

            chunks.push(chunk)
            if(options.maxsize != undefined && fileSize > options.maxsize) {
                errorOccoured = true;
                errorCollection.push('UPLOADED_FILE_TO_BIG');
                return;
            }
        });

        readStream.on('end', () => {
            if(errorOccoured) {
                totalFilesError++;
            } else {
                totalFilesRead++;
                totalFileSize = totalFileSize + fileSize;
            }
        })

        readStream.on('close', () => {
            if(chunks !== undefined) readFile.chunks = chunks;

            readFile.uploadedFile.fileSize = fileSize;

            fileCollection.push(readFile)
        })
    };

    /**
     * FINISHED WITH READING, CONTINUE WITH WRITING TO DISK
     */
    const onFileUploadFinish = async () => {
        for(const file of fileCollection) {
            if(file.errors.length > 0) {
                totalFilesWritten++;
            } else {
                const readable = Readable.from(file.chunks)
                const writeStream = fs.createWriteStream(file.uploadedFile.uploadedPath);

                readable.pipe(writeStream);

                readable.on('close', () => {
                    totalFilesWritten++;

                    file.uploadedFile.uploadDuration = Date.now() - file.uploadedFile.uploadDuration;

                    file.chunks = undefined;
                    delete file.uploadedFile.fileInfo;

                    if((totalFilesRead + totalFilesError) == totalFilesWritten) {
                        return success({
                            stats: {
                                total: (totalFilesRead + totalFilesError),
                                error: totalFilesError,
                                success: totalFilesRead
                            },
                            files: fileCollection,
                            duration: (Date.now() - requestStartTimestamp),
                            totalFileSize: totalFileSize
                        });
                    }
                });
            }
        }
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
