const meter = require('stream-meter');

const fs = require('fs');
const path = require('path');

/**
 * Call this function in your desired file upload router
 * 
 * @async
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {Function} success 
 * @param {Function} error 
 * @param {Object} options 
 * @returns 
 */
const middleWareHandler = async (req, res, success, error, options) => {
    if(options.uploadPath === undefined) return error('NO_UPLOAD_PATH_PROVIDED');
    if(options.uploadName === undefined) return error('NO_UPLOAD_NAME_PROVIDED');

    if(!req.busboy) return error('BUSBOY_NOT_IN_MIDDLEWARE_FOUND');

    let _filename, _fieldname, _encoding, _mimeType, _size, _uploadedName, _uploadedPath, _fileInfo;

    req.busboy.on('file', (fieldName, file, info) => {

        const { filename, encoding, mimeType } = info;

        const startTimeInms = Date.now();
  
        const saveTo = path.join(`uploads/${options.uploadName}.${info.filename.split('.')[1]}`); /// todo: add files like test.js.db
  
        _fieldname = fieldName;
        _filename = filename;
        _encoding = encoding;
        _mimeType = mimeType;
        _uploadedName = options.uploadName;
        _uploadedPath = saveTo;

        var bridge = meter();
  
        const stream = file.pipe(bridge).pipe(fs.createWriteStream(saveTo));
  
        var size = 0, tooBig = false;
  
        bridge.on('data', (chunk) => {
            size = size + chunk.length;

            if(options.maxSize != undefined && options.maxSize > 1 && size >= options.maxSize) {
    
                tooBig = true;

                bridge.end();
                stream.end();
    
                fs.unlink(saveTo, (error) => {
                    if(error && (options.debug != undefined)) return options.debug(error);
                });
                return;
            }
        })
  
        bridge.on('error', (error) => {
          return error(error);
        })
  
        bridge.on('pause', () => {
            if(options.debug != undefined) options.debug('STREAM_PAUSED')
        })
  
        bridge.on('close', () => {
            if(options.debug != undefined) options.debug('STREAM_CLOSED')
        })
  
        bridge.on('end', () => {
            if(tooBig) return error('UPLOADED_FILE_TO_BIG');
  
            fs.stat(saveTo, (err, stats) => {
                if (err) return error('UNABLE_TO_UPLOAD_FILE');

                _fileInfo = stats;
                _size = stats.size;

                return success({
                    originalFile: {
                        name: _filename,
                        field: _fieldname,
                        encoding: _encoding,
                        mime: _mimeType,
                        size: _size,
                    },
                    uploadedFile: {
                        uploadedName: _uploadedName,
                        uploadedPath: _uploadedPath,
                        uploadDuration: (Date.now() - startTimeInms),
                        fileInfo: _fileInfo
                    }
                })
            });
            return;
        })
  
      });
}

module.exports = middleWareHandler;