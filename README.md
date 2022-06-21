# busboy-upload
This express middleware is handling fileuploads on top of connect-busboy. It provides an simple solution to deal with large files.

```
npm install busboy-upload
```

## Content

 - <a href="#usage">Usage</a>
 - <a href="#set-up-the-middleware">Set up the express middleware</a>
 - <a href="#file-object">Informations about the uploaded file</a>
 - <a href="#errors">Error Handling</a>
 - <a href="#debugging">Debugging</a>

## Usage

First of all, we need to define the callbacks to get informations about the upload

```js
/**
 * Is fired when file has been successfully uploaded
 * @param {Object} fileInfo 
 */
const success = (fileInfo) => {
        console.log(fileInfo);
        res.status(200).json(fileInfo);
}

/**
 * Is fired when an error occored
 * @param {Error} error 
 */
const error = (error) => {
    if(error === 'UPLOADED_FILE_TO_BIG') return res.send('The uploaded file is too big');
    if(error === 'UNABLE_TO_UPLOAD_FILE') return res.send('An error occoured');
    
    // Handle error
}

const config = {
    uploadPath: __dirname + '/uploads/',
    uploadName: Date.now(),
    maxSize: -1 // Set the filesize to -1 and all file sizes will be accepted
}
```

## Set up the middleware

The API needs to be included in one of the express Routers:

```js
const busboy = require('busboy');
const fileUpload = require('busboy-upload');

app.use(busboy({ immediate: true }));

app.use('/upload', (req, res) => {

  // Callbacks from above
  
  fileUpload(req, res, success, error, config);
});
```

## File Object

### File has been successfully uploaded:

```js
{
  originalFile: {
    name: 'file.zip',
    field: 'file',
    encoding: '7bit',
    mime: 'application/zip',
    size: 102170072
  },
  uploadedFile: {
    uploadedName: 1655839067549,
    uploadedPath: 'uploads/1655839067549.zip',
    uploadDuration: 349,
    fileInfo: {
      dev: 16777231,
      mode: 33188,
      nlink: 1,
      uid: 501,
      gid: 20,
      rdev: 0,
      blksize: 4096,
      ino: 74866131,
      size: 102170072,
      blocks: 760,
      atimeMs: 1655839067552.3833,
      mtimeMs: 1655839067897.821,
      ctimeMs: 1655839067897.821,
      birthtimeMs: 1655839067552.3833,
      atime: '2022-06-21T19:17:47.552Z',
      mtime: '2022-06-21T19:17:47.898Z',
      ctime: '2022-06-21T19:17:47.898Z',
      birthtime: '2022-06-21T19:17:47.552Z'
    }
  }
}
```

Note: The file size is provided in Bytes


## Errors
The parameter `error` returns one of these following errors. In the table below, you can learn how to deal with errors

Error | Meaning
--- | ---
NO_UPLOAD_PATH_PROVIDED | Add the parameter uploadPath to the config
NO_UPLOAD_NAME_PROVIDED | Add the parameter uploadName to the config
BUSBOY_NOT_IN_MIDDLEWARE_FOUND | Add `app.use(busboy({ immediate: true }));` to the express router
UPLOADED_FILE_TO_BIG | The uploaded file is bigger than in the config provided
UNABLE_TO_UPLOAD_FILE | The server could not found the uploaded file, check if the application has permission to access the uploading directory

Note: Other errors could occoure, in this case you probably did something wrong whith the config, open a <a href="https://github.com/robert-kratz/busboy-upload/issues">new issues</a>

## Debugging

In case that you want to get the current state of the upload, you can use the debug callback as part of the config object.

```js
const debug = (debug) => {
    console.log(debug);
}

const config = {
    uploadPath: 'uploads/',
    uploadName: Date.now(),
    maxSize: -1
    debug: debug
}
```

 Made by <a href="https://github.com/robert-kratz">Robert J. Kratz</a>
 
 ## License
 
 MIT