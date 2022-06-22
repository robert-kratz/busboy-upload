const express = require('express')
const busboy = require('connect-busboy')

const app = express();

app.use(busboy({ immediate: true }));

const fileUpload = require('..');

app.use('/upload', (req, res) => {

    /**
     * Is fired when file has been successfully uploaded
     * @param {Object} fileInfo 
     */
    const success = (fileInfo) => {
        res.status(200).json(fileInfo);
    }

    const config = {
        uploadPath: __dirname + '/uploads/',
        uploadName: (fieldName, filename, encoding, mimeType) => {
            return fieldName + '-' + filename + '-' + Date.now();
        },
        mimeTypes: ['image/jpeg'],
        maxsize: 100000,
        filter: (file, deny) => {
            if(file.originalFile.filename == 'test.jpesg') return deny('INVALID_BIT_AMOUNT')
        }
    }

    fileUpload(req, success, config);
})

app.listen(443, () => console.log(`Started on http://127.0.0.1:443 ` + __filename))